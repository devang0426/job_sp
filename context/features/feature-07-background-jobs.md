# Feature 07 — Background jobs

**Depends on:** 04
**Status:** done

## Goal

trigger.dev wired end to end and proven with a task that does nothing
expensive: trigger from a route, execute, write back, subscribe from the
UI, retry on failure.

**Prove the pipeline before anything expensive rides on it.** Debugging
trigger.dev and debugging a Claude prompt at the same time is two
problems pretending to be one.

## In scope

- `@trigger.dev/sdk` installed, `trigger.config.ts`.
- One trivial task that sleeps and writes a result.
- The trigger-from-route-handler pattern.
- The run-status subscription hook.
- The progress, failure, and retry UI states.

## Out of scope

- Any real task. Scans are feature 14, evaluations feature 15.
- The Playwright build extension — added in feature 13, where it is used.

## Implementation

### Why trigger.dev and not a queue table

Recorded so it is not relitigated. Vercel's Hobby plan runs cron **once
per day**. A Postgres-queue design drained by cron would leave scans
pending for hours, so it would need an inline `after()` kick, a task
table, optimistic claim/lease logic, a reaper for stuck runs, and
budget-aware drain loops — all to approximate what trigger.dev supplies
natively.

**Do not build a queue table.** If you find yourself writing claim logic,
something has gone wrong. See `../architecture.md`.

### The three-tier pattern

Every long-running operation follows one shape:

1. The route handler validates, **creates or updates a database record in
   a pending state**, triggers the task, and returns the record id
   immediately. It never awaits the work.
2. The task executes and writes the result back to that record.
3. The UI subscribes to the run and renders from the record.

Build the pattern once here, correctly, and features 14, 15, 18, and 19
all reuse it.

### Environment

The tasks run on trigger.dev's infrastructure, **not Vercel**, so they do
not inherit Vercel's environment. Every secret a task needs must be set
separately in the trigger.dev dashboard. This catches people out: the
route triggers fine, and the task fails on a missing `DATABASE_URL`.

Set `DATABASE_URL` and `DIRECT_URL` there now, in this feature, so
feature 14 does not have to discover it.

### The demo task

A `NOOP` task taking `{ recordId, shouldFail }`, sleeping 3 seconds,
then writing a result. `shouldFail` throws, so retry behavior is
observable.

Configure `retry` with a small `maxAttempts` — enough to watch a retry
happen without waiting through exponential backoff.

### The UI states

Per `../ui-context.md`, long-running actions never block the UI:

- Triggering switches the control to a **mono progress state**.
- The result arrives by subscribing to the run.
- A failure renders in `--state-error` with the reason **and a retry
  control**. Not a toast that vanishes; a persistent state on the record.

### Idempotency

Pass an `idempotencyKey` on trigger. Later features depend on this —
feature 15's guard against firing two paid Claude calls on a
double-click is partly this and partly `Match`'s unique constraint.

## Files

- `trigger.config.ts`
- `trigger/noop.ts`
- `app/api/dev/noop/route.ts` (temporary)
- `hooks/useRunStatus.ts`
- `components/ui/ProgressState.tsx`

## Verification

1. `npx trigger.dev@latest dev` connects and registers the task.
2. Clicking the dev button triggers the task, the control switches to the
   mono progress state, and it flips to done when the run completes.
3. The UI never blocks. The button responds immediately; nothing waits on
   the 3-second sleep.
4. Triggering with `shouldFail` shows the retry attempts, then the
   failure state in `--state-error` with a reason and a working retry
   control.
5. Triggering the same idempotency key twice produces **one** run.
6. The task can read and write the database — confirm the record actually
   changed in Prisma Studio, not just that the run reported success.
7. `npm run build` passes.

## Notes

- Step 6 is the one people skip. A run that reports success while the
  task silently failed to reach Neon is the exact failure this feature
  exists to catch early.
- Keep the dev route and the noop task after this feature ships. They
  cost nothing and are the fastest way to check whether a later problem
  is trigger.dev or your own code.
