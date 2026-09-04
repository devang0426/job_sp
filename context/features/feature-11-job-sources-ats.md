# Feature 11 — ATS board sources

**Depends on:** 04
**Status:** not started

## Goal

The source adapter interface, the normalization layer, the pre-filter,
and the first three adapters: Greenhouse, Lever, and Ashby.

**These come first because they cost nothing.** They are unauthenticated
and unmetered, so the entire ingestion pipeline — normalize, dedupe,
filter, upsert — is provable before a single metered call is spent. They
are also the demo-day safety net if a paid tier is exhausted.

## In scope

- `lib/sources/types.ts` — the `JobSourceAdapter` interface.
- `lib/sources/normalize.ts`.
- `lib/sources/filter.ts` — the deterministic pre-filter.
- Greenhouse, Lever, and Ashby adapters.
- `config/portals.yml` and its loader.

## Out of scope

- Adzuna and JSearch — feature 12.
- Playwright — feature 13.
- The scan task that orchestrates them — feature 14.
- Dedup itself — already built in feature 04.

## Implementation

### The interface

```ts
export interface JobSourceAdapter {
  readonly source: JobSource;
  readonly requiresKey: boolean;
  search(params: SearchParams): Promise<AdapterResult>;
}

export interface AdapterResult {
  jobs: NormalizedJob[];
  requests: number;      // metered calls actually made
  errors: string[];      // non-fatal — a source may partly fail
}
```

**Errors are values, not exceptions.** A source failing must be something
the scan records and continues past. This is what makes invariant 9 —
a scan that loses one source still succeeds as `PARTIAL` — achievable.

### The endpoints

| ATS | Endpoint |
| --- | --- |
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` |
| Lever | `api.lever.co/v0/postings/{company}?mode=json` |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{name}` |

No authentication. `?content=true` on Greenhouse is what returns the full
description — without it you get titles and nothing to evaluate.

### `config/portals.yml`

Checked-in data, not code. Adding a company is a YAML edit.

```yaml
portals:
  - company: Razorpay
    ats: greenhouse
    token: razorpay
```

Start with roughly 20 India-relevant companies. Verify each token
actually resolves before committing it — a wrong token is a silent empty
result, not an error.

### Normalization

Every adapter produces the `NormalizedJob` shape in `../job-sources.md`.

**Anything a source does not supply is `null`, never a guessed value.**
An inferred salary or a fabricated posting date corrupts the pre-filter
and the evaluation downstream.

ATS descriptions arrive as HTML. Strip to plain text, preserving
paragraph and list breaks — the structure carries meaning for
requirement extraction.

`applyUrl` is required. It is the product's stance made concrete.

`raw` holds the untouched payload, so re-parsing never re-fetches.

### The pre-filter

`lib/sources/filter.ts`, deterministic and free:

- Drop `excludeKeywords` and `excludedCompanies` matches.
- Drop postings matching no `keyword` when keywords are set.
- Drop postings older than the freshness window (default 30 days).
- Drop non-remote postings when `remoteOnly` is set.
- Drop below `minSalary` **only when both the floor and the posting's
  salary are known**. Never drop for an unknown salary.

Typically removes 30–50% of a raw pull. Every posting it drops is a
Claude call not made — this is the cheapest cost control in the system.
Count removals so they can be reported as `ScanRun.jobsFiltered`.

Unit-test it. It is pure, and it is the one place a bug silently hides
good jobs.

## Files

- `lib/sources/types.ts`
- `lib/sources/normalize.ts`
- `lib/sources/filter.ts`
- `lib/sources/filter.test.ts`
- `lib/sources/greenhouse.ts`
- `lib/sources/lever.ts`
- `lib/sources/ashby.ts`
- `lib/sources/index.ts`
- `config/portals.yml`

## Verification

1. Each adapter returns real postings from a real board. Print one and
   read it.
2. Descriptions contain full JD text, not truncated summaries. If
   Greenhouse returns titles only, `content=true` is missing.
3. Every returned job has a non-empty `applyUrl` that opens the real
   posting.
4. Fields the source omits are `null`, not `""`, `0`, or a guess.
5. Pointing an adapter at a nonexistent board token produces an entry in
   `errors` and an empty `jobs` array — **it does not throw**.
6. The pre-filter's unit tests pass, including the unknown-salary case.
7. `npm run build` passes.

## Notes

- Step 5 is the one to be strict about. Every later feature depends on an
  adapter failing quietly.
- Do not paginate. One request per board per scan. The habit matters more
  once feature 12 adds metered sources.
