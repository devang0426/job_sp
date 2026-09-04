# Feature 12 — Job search APIs

**Depends on:** 11
**Status:** not started

## Goal

The two metered sources: Adzuna for breadth, JSearch for the
LinkedIn/Indeed/Glassdoor names — plus the quota defenses that keep
either from running out during a demo.

Both slot into the `JobSourceAdapter` interface from feature 11. No new
pipeline, just two more adapters and the accounting to survive their
free tiers.

## In scope

- The Adzuna adapter.
- The JSearch adapter.
- Per-source request counting and the monthly ceiling.
- Development response caching.

## Out of scope

- Playwright — feature 13.
- The scan orchestration that calls these — feature 14.

## Implementation

### Adzuna

`api.adzuna.com/v1/api/jobs/in/search/{page}` with `app_id` and
`app_key`. The `/in/` segment is the India endpoint.

Free tier is roughly 250 calls/month at about one request per second.
Good India coverage and structured salary data, which the pre-filter can
actually use.

### JSearch

`jsearch.p.rapidapi.com/search` via RapidAPI. Host header is a constant,
not an environment variable.

**200 requests per month, total.** That is about six scans a day for a
month, and it is easy to burn half of it debugging a parser. Treat every
call as expensive.

JSearch descriptions routinely run 15–20 KB — mostly benefits boilerplate
and equal-opportunity statements. Store the full text, but the JD sent to
Claude is truncated to ~12,000 characters in feature 15. Those tokens are
pure cost.

### Quota defense

Five rules, all of them cheap:

1. **One request per source per scan.** Never paginate on a free tier.
2. **Persist `raw`** so re-parsing never re-fetches.
3. **Record `{ requests, returned, errors }`** per source, for
   `ScanRun.sourceStats`.
4. **A monthly request counter per source.** When exhausted, skip that
   source and mark the run `PARTIAL` — do not throw, do not fail the
   run.
5. **Cache responses in development.** Iterating on a parser must cost
   nothing. A simple on-disk cache keyed by the request URL is enough.

Rule 5 is what actually protects the JSearch quota. Without it the 200
calls go to debugging, not to the demo.

### Normalization differences

Both sources need mapping into `NormalizedJob`:

- Salary arrives in different shapes and periods. Normalize the period
  explicitly; never assume annual.
- `postedAt` is sometimes relative ("3 days ago"). Parse to an absolute
  date or leave it `null` — a guessed date corrupts the freshness filter.
- Company names arrive inconsistently punctuated. The dedup function
  already handles suffix stripping; do not pre-clean them here or the two
  layers will disagree.

### Failure behavior

Same contract as feature 11: an error is a value in `AdapterResult.errors`,
never a throw. A 429 from RapidAPI must not fail a scan that also pulled
40 good jobs from Greenhouse.

## Files

- `lib/sources/adzuna.ts`
- `lib/sources/jsearch.ts`
- `lib/sources/quota.ts`
- `lib/sources/cache.ts` (development only)
- `lib/sources/index.ts` (register the adapters)

## Verification

1. Each adapter returns real postings with working apply links.
2. Salary periods are correct — spot-check an annual and a monthly
   posting rather than assuming.
3. A relative posting date parses to a real date, or is `null`. It is
   never today's date by default.
4. Forcing a 429 or an invalid key produces an `errors` entry and an
   empty `jobs` array — no throw.
5. Exhausting the monthly counter skips the source and reports it, rather
   than failing.
6. In development, the same query twice makes **one** network request.
   Verify this before doing any real testing against JSearch.
7. A job present in both Adzuna and a Greenhouse board collapses to one
   row, with the first-seen source preserved.
8. `npm run build` passes.

## Notes

- Do step 6 first, before step 1. Testing an adapter without the cache is
  how the JSearch quota disappears.
- Step 7 is the payoff for feature 04's dedup work and the most visible
  sign of a real ingestion pipeline rather than a demo.
- JSearch is genuinely optional. If its quota is gone, the product still
  works — that is why it is this late in the order.
