# Job Sources

How postings get into the database. Ported from career-ops's
`modes/scan.md`.

Five adapters sit behind one interface. The scan orchestrator never knows
which source it is draining.

```ts
// lib/sources/types.ts
export interface JobSourceAdapter {
  readonly source: JobSource;
  readonly requiresKey: boolean;
  search(params: SearchParams): Promise<AdapterResult>;
}

export interface AdapterResult {
  jobs: NormalizedJob[];
  requests: number;      // metered calls actually made
  errors: string[];      // non-fatal; a source may partly fail
}
```

## The five adapters

| Adapter | Endpoint | Key | Notes |
| --- | --- | --- | --- |
| **ATS boards** | Greenhouse `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` · Lever `api.lever.co/v0/postings/{company}?mode=json` · Ashby `api.ashbyhq.com/posting-api/job-board/{name}` | none | Unauthenticated, unmetered, full JD text. Exactly what career-ops does. |
| **Adzuna** | `api.adzuna.com/v1/api/jobs/in/search/{page}` | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | ~250 calls/month free. Strong India coverage. |
| **JSearch** | RapidAPI, `jsearch.p.rapidapi.com/search-v2` | `RAPIDAPI_KEY` | LinkedIn / Indeed / Glassdoor breadth. **200 requests/month total.** |
| **Playwright** | headless browser | none | trigger.dev task with the Playwright build extension. Cooperative target only — see below. |
| **Firecrawl** | `api.firecrawl.dev/v2/scrape` against WeWorkRemotely's `/categories/remote-programming-jobs` | `FIRECRAWL_API_KEY` | Scrape-and-extract, not an aggregator API — see below. Optional. |

**Build ATS boards first and make them the default.** They cost nothing,
have no quota, and return the highest-quality descriptions of the five.
The whole ingestion pipeline — normalize, dedupe, filter, upsert — is
provable against them before a single metered call is spent, and they are
the demo-day safety net if a paid tier is exhausted.

Adzuna is the breadth source. JSearch is optional and easy to
half-exhaust while debugging. Playwright is the "we scrape for real"
demonstration; it cannot run on Vercel serverless, which is why it lives
in a trigger.dev task. **Pin Playwright to `1.57.0`** — the trigger.dev
build extension breaks on 1.58+.

### Firecrawl is a scraper, not an aggregator

Adzuna and JSearch return already-structured postings — the adapter just
renames fields. Firecrawl doesn't have a "search jobs" call at all; it
scrapes a URL and asks its own hosted model to pull structured data out
via a JSON schema. That makes it kin to the Playwright scraper below —
one cooperative page, fetched whole, filtered client-side — except the
fetch and the extraction both happen on Firecrawl's infrastructure
instead of in a trigger.dev browser. Two consequences worth remembering:

- `descriptionText` from this adapter is the listing blurb shown on the
  category page, not the full JD. Following through to each posting's own
  page would be one Firecrawl call per job instead of one per scan, which
  the "one request per source per scan" rule (below) rules out.
- The category page mixes in sponsored placements that render like job
  cards but link to a `/listing_ads/...` tracking redirect instead of a
  real posting. The extraction schema can't be told to tell them apart;
  `lib/sources/firecrawl.ts` filters them out afterward by URL shape.

### Scraping stance and IP blocking

Applies to both scrapers — Playwright and Firecrawl. The Playwright
scraper runs from trigger.dev's cloud and Firecrawl's runs from
Firecrawl's own infrastructure; either way it is shared datacenter egress
IPs, which commercial anti-bot systems block on sight. That is a
constraint on **target choice**, not a problem to engineer around:

- **Not LinkedIn, Indeed, or Naukri.** Those run DataDome / PerimeterX
  and, in LinkedIn's case, litigation. Each scraper points at a
  cooperative target — a smaller aggregator, a government board, a niche
  site whose `robots.txt` permits it. Firecrawl's target,
  WeWorkRemotely, was checked the same way RemoteOK was: `robots.txt`
  allows everything but account/admin paths, and the plain category page
  it scrapes returns real listings with no bot challenge. Its own
  `/remote-jobs/search?term=...` route sits behind a Cloudflare
  challenge and is deliberately never called — confirmed live while
  building this adapter, not assumed.
- **No evasion.** No proxy rotation, no residential proxies, no
  CAPTCHA-solving, no stealth or fingerprint-spoofing plugins. That
  crosses from automated access into adversarial evasion — against terms
  of service and legally exposed. The scaling answer for a blocked
  source is an official API or partnership, which is what the ATS
  adapters already are.
- **Soft blocks count as failures.** A page that returns HTTP 200 with a
  challenge interstitial, or that loads with zero listings, is an
  `errors` value — never an empty success. See `job-sources.md`'s
  failure contract and feature 13.
- **A blocked scraper never blocks a scan or a demo.** The ATS sources
  carry ingestion on their own. If the target starts blocking, change
  the target.

Full detail: `features/feature-13-job-scraper.md`.

## `config/portals.yml`

A checked-in list of companies and their ATS board identifiers, mirroring
career-ops's `templates/portals.example.yml`. Roughly 20 India-relevant
companies to start.

```yaml
portals:
  - company: Razorpay
    ats: greenhouse
    token: razorpay
  - company: Zerodha
    ats: lever
    token: zerodha
  - company: Postman
    ats: ashby
    token: postman
```

This is data, not code. Adding a company is a YAML edit.

## Normalization

Every adapter must produce this shape. Anything a source does not supply
is `null` — never a guessed value.

```ts
export interface NormalizedJob {
  source: JobSource;
  sourceId: string;          // the provider's own id, stable across scans
  title: string;
  company: string;
  companyDomain: string | null;
  location: string | null;
  countryCode: string | null;
  isRemote: boolean;
  employmentType: string | null;
  seniority: Seniority | null;
  descriptionText: string;   // plain text; HTML stripped
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "year" | "month" | "day" | "hour" | null;
  applyUrl: string;          // required — always external
  sourceUrl: string | null;
  postedAt: Date | null;
  raw: unknown;              // the untouched provider payload
}
```

`applyUrl` is required because the product's stance depends on it: we
link, we never submit.

`raw` is persisted so re-parsing a posting never costs another metered
call.

## Deduplication

The recipe is defined in `data-model.md` and implemented in
`lib/sources/dedupe.ts`. In short: a sha256 of normalized
`company|title|location`, upserted on. The update branch never rewrites
`source` or `sourceId` — first-seen provenance wins.

This is what makes the same job appearing on a company's Greenhouse board
and on Adzuna collapse to one row rather than two. It is the single most
visible sign of a real ingestion pipeline rather than a demo.

## The pre-filter

`lib/sources/filter.ts` runs between normalization and evaluation. It is
deterministic and free:

- Drop postings matching `excludeKeywords` or `excludedCompanies`.
- Drop postings missing every `keyword` when keywords are set.
- Drop postings older than the freshness window.
- Drop non-remote postings when `remoteOnly` is set.
- Drop postings below `minSalary` when both the floor and the posting's
  salary are known. Never drop for an unknown salary.

Typically removes 30–50% of a raw pull. Every posting it removes is a
Claude call not made, so this is the cheapest cost control available.
Count the removals into `ScanRun.jobsFiltered` so the number is visible.

## Freshness

career-ops's `--verify` idea, simplified:

- Drop postings with a `postedAt` older than the configured window
  (default 30 days).
- Flag — do not drop — postings whose `applyUrl` returns 404. A dead link
  is worth showing with a warning rather than hiding.

## Quota defense

The metered sources will run out, and they will run out during testing
rather than during the demo if nothing is done.

- **One request per source per scan.** Never paginate on a free tier.
- **Persist `raw`** so re-parsing never re-fetches.
- **Record per-source `{ requests, returned, errors }`** into
  `ScanRun.sourceStats`.
- **Keep a monthly request counter per source.** When it is exhausted,
  skip that source and mark the run `PARTIAL` — do not fail the call and
  do not fail the run.
- **Cache source responses in development** so iterating on the parser
  costs nothing.

**A scan that loses one source still succeeds, marked `PARTIAL`.** This is
invariant 9 in `architecture.md`. One source's rate limit must never fail
the whole run.

## JD truncation

Truncate `descriptionText` to ~12,000 characters before sending it to
Claude. Store the full text.

JSearch descriptions routinely run 15–20 KB, most of it boilerplate
benefits copy and equal-opportunity statements. Those tokens are pure
cost and add nothing to a match evaluation.

## The scan task

`trigger/scan.ts` is the orchestrator. In order:

1. Load `Preferences`, snapshot them into `ScanRun.querySnapshot`.
2. Run each enabled adapter, collecting `AdapterResult`s. An adapter
   throwing is caught, recorded in `sourceStats.errors`, and does not
   abort the scan.
3. Normalize, dedupe within the batch, then upsert each posting.
4. Run the pre-filter.
5. Create a `PENDING` `Match` row per surviving job, then batch-trigger
   the evaluation runs.
6. Write final counts and set `ScanRun.status` to `SUCCEEDED` or
   `PARTIAL`.

The scan task never evaluates inline. It fans out. See the three-tier
flow in `architecture.md`.
