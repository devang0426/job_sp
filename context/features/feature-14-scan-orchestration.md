# Feature 14 — Scan orchestration

**Depends on:** 07, 10, 11
**Status:** done

## Goal

One button pulls postings from every enabled source, normalizes them,
collapses duplicates, filters against preferences, and fans out
evaluation runs — reporting honestly on what each source did.

This is where the pieces built in features 04, 07, 10, and 11 become a
pipeline.

## In scope

- `POST /api/scans`.
- `trigger/scan.ts` — the orchestrator.
- `GET /api/scan-runs` and `/api/scan-runs/[id]`.
- The scan runs screen.
- The scan trigger in the feed.

## Out of scope

- Evaluation itself — feature 15. This feature creates `PENDING` matches
  and triggers the runs; it does not score anything.

## Implementation

### The orchestrator

`trigger/scan.ts`, in order:

1. Load `Preferences`, **snapshot them into `ScanRun.querySnapshot`**.
   This makes the run reproducible and explains a stale result set after
   the user changes preferences.
2. Run each enabled adapter. Collect `AdapterResult`s. **An adapter
   throwing is caught, recorded in `sourceStats.errors`, and does not
   abort the scan.**
3. Normalize, dedupe within the batch, then upsert each posting on
   `dedupeKey`.
4. Run the deterministic pre-filter. Count removals into `jobsFiltered`.
5. Create a `PENDING` `Match` row per surviving job, then
   **batch-trigger** the evaluation runs.
6. Write final counts, set `status` to `SUCCEEDED` or `PARTIAL`.

**The scan never evaluates inline.** It fans out. See the three-tier flow
in `../architecture.md`.

### The upsert

```ts
prisma.job.upsert({ where: { dedupeKey }, create: {...}, update: {...} })
```

**The update branch must not touch `source` or `sourceId`.** First-seen
provenance wins. It updates only `descriptionText`, salary fields,
`postedAt`, `lastSeenAt`, `seenCount: { increment: 1 }`, and `raw`.

This rule is what lets the two unique constraints coexist. Get it wrong
and a JSearch copy of an Adzuna posting rewrites the provenance pair,
which then collides.

### Partial success

Invariant 9: **a scan that loses one source still succeeds, marked
`PARTIAL`.** One source's rate limit never fails the whole run.

`sourceStats` holds `{ requests, returned, errors }` per source. This is
what turns a partial failure into something visible instead of a
mysteriously short result set.

### Concurrency guard

`POST /api/scans` returns `409` if a scan is already queued or running
for this user. One scan at a time, per user. Without this, an impatient
double-click doubles the cost of the next step.

### The scan runs screen

A board, like everything else. One row per run: started, duration,
sources used, jobs found / new / updated / filtered, evaluations queued,
status.

`PARTIAL` shows which source failed and why, drawn from `sourceStats`.
A user should be able to tell at a glance that JSearch was out of quota
rather than wondering why they got fewer jobs.

Progress state per `../ui-context.md`: the trigger switches to a mono
progress state, the result arrives by subscribing to the run.

## Files

- `app/api/scans/route.ts`
- `app/api/scan-runs/route.ts`
- `app/api/scan-runs/[scanRunId]/route.ts`
- `trigger/scan.ts`
- `lib/db/scanRuns.ts`
- `app/(console)/scans/page.tsx`

## Verification

1. A scan pulls real postings from at least two sources into the
   database.
2. **Running the same scan immediately again reports `jobsNew: 0` and
   `jobsUpdated: N`.** This is the headline check — it proves dedup works
   end to end.
3. A job present in two sources exists as one row, with the first-seen
   source preserved.
4. Disabling a source's key mid-scan produces a `PARTIAL` run that still
   returns the other sources' jobs, with the failure visible in the UI.
5. `jobsFiltered` is non-zero when exclusion keywords are set, and the
   filtered jobs are genuinely ones the user asked to exclude.
6. `querySnapshot` on the run matches the preferences at scan time. Change
   preferences afterwards and confirm the snapshot did not change.
7. A second `POST /api/scans` while one is running returns `409`.
8. The UI never blocks. The button responds immediately.
9. `npm run build` passes.

## Notes

- Step 2 is the one to be strict about. A scan that duplicates on re-run
  will bury the user in noise within three scans and is the single most
  visible difference between a real pipeline and a demo.
- Keep `maxJobsPerScan` enforced here as well as in preferences. This is
  the last gate before feature 15 starts spending money per job.

## As built

- `POST /api/scans` (202 + `{ id, status }`), `GET /api/scan-runs`
  (cursor page), `GET /api/scan-runs/[scanRunId]`.
- `trigger/scan.ts` — task id `scan`, payload `{ scanRunId }`,
  `maxAttempts: 1` (a partly-done scan must not silently re-run).
- `lib/db/scanRuns.ts` (record lifecycle + `ScanRunView`),
  `lib/db/matches.ts` (`createPendingMatches` — skips `RUNNING` /
  `COMPLETE`, re-queues `PENDING` / `FAILED`), `lib/db/jobs.ts`
  `upsertScannedJob` (dedupeKey upsert, `[source, sourceId]` P2002
  fallback), `lib/sources/ingest.ts` `dedupeBatch` (pure in-batch
  collapse), `lib/sources/scanPlan.ts` (snapshot ⇄ search/filter params).
- New error code `SCAN_IN_PROGRESS` (409) for the concurrency guard. A
  run stuck `QUEUED`/`RUNNING` past 15 min no longer blocks new scans.
- The pre-filter gates **evaluation**, not storage: every deduped
  posting is upserted so it shows in the feed; only survivors get a
  `PENDING` match and an evaluation run.
- **Evaluation fan-out contract** (consumed by feature 15): the scan
  calls `tasks.batchTrigger("evaluate", …)` with payload
  `{ userId, jobId, resumeId }` and `idempotencyKey`
  `eval:{userId}:{jobId}:{resumeId}`. Until `trigger/evaluate.ts` exists
  the batch call fails softly — matches stay `PENDING`, the run is
  `PARTIAL` with a note, and nothing else breaks.
- Fan-out is skipped (with a note on the run) when there is no active CV
  or `autoEvaluate` is off; jobs are still ingested.
- UI: `components/scans/ScanButton.tsx` (POST + subscribe by polling
  `GET /api/scan-runs/[id]`, mono progress state, `router.refresh()` on
  terminal), `components/scans/ScanRunList.tsx` (board rows, expandable
  per-source `sourceStats` for `PARTIAL`/`FAILED`). Trigger is on both
  `/scans` and the feed header.
