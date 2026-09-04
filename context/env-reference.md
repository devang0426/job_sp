# Environment Reference

Nine values to obtain, across four free-tier signups plus an AI provider.
Nothing here has a hard dollar floor except model usage.

Never read, write, or print the values themselves. This file documents
names and sources only.

## `.env.local`

```bash
# ── Auth ─────────────────────────────────────────────────────
# clerk.com — free tier, generous for this scale
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=      # user.created -> Prisma User

# ── AI ───────────────────────────────────────────────────────
# At least ONE of these two. Gemini is preferred when present,
# Claude is the fallback. See lib/ai/generate.ts.
# aistudio.google.com — free tier, then pay per token
GOOGLE_GENERATIVE_AI_API_KEY=
# console.anthropic.com — pay per token
ANTHROPIC_API_KEY=

# ── Database ─────────────────────────────────────────────────
# neon.tech — free tier
DATABASE_URL=                      # POOLED (-pooler) — Prisma `url`
DIRECT_URL=                        # direct — Prisma `directUrl`

# ── Background jobs ──────────────────────────────────────────
# trigger.dev — free tier. Project id goes in trigger.config.ts.
TRIGGER_SECRET_KEY=

# ── Job sources ──────────────────────────────────────────────
# developer.adzuna.com — free, ~250 calls/month
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# rapidapi.com/jsearch — 200 requests/month free
RAPIDAPI_KEY=

# firecrawl.dev — scrape-and-extract, not an aggregator. Optional.
FIRECRAWL_API_KEY=

# ATS boards (Greenhouse / Lever / Ashby) — no key, public JSON
# Playwright — no key

# ── App ──────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Notes per service

### Clerk

Three values. The publishable key is public and prefixed
`NEXT_PUBLIC_`; the secret key is not. The webhook signing secret comes
from the Clerk dashboard when you create the `user.created` /
`user.updated` / `user.deleted` endpoint, and is verified with `svix`.

Local development has no public URL, so the webhook will not fire there.
That is expected and handled — `requireUser()` JIT-upserts on `clerkId`.
See the auth model in `architecture.md`.

### AI providers

**Two providers, one interface.** Every structured call in the codebase
goes through `generate()` in `lib/ai/generate.ts`, which picks a provider
from the keys that are set:

- `GOOGLE_GENERATIVE_AI_API_KEY` (or `GEMINI_API_KEY`) — Gemini 2.5 Flash,
  used first when present.
- `ANTHROPIC_API_KEY` — Claude Sonnet 5, used when Gemini is not
  configured, and as the fallback when a Gemini call fails after its own
  retries.

At least one must be set or every AI call throws with that message.

Both constrain generation to the Zod schema and both re-validate the
result before returning, so a caller receives a typed value or an
exception — never an unchecked object. (Invariant 4.)

Rates live in `MODEL_RATES` in `lib/ai/client.ts` and are written to every
row an AI call produces: Gemini 2.5 Flash at $0.30 / $2.50 and Claude
Sonnet 5 at $2 / $10 per 1M input / output tokens. Budget roughly $0.006
per job evaluated on Gemini, $0.021 on Claude — so a 40-job scan is around
$0.25 or $0.85 before caching. The four cost controls are listed in
`prompt-specs.md`.

### Neon

**Two connection strings, and the distinction matters.**
`DATABASE_URL` must be the pooled string — the host contains `-pooler`.
`DIRECT_URL` is the direct string, needed because Prisma migrations
cannot run through PgBouncer.

Getting this wrong produces connection exhaustion exactly when a scan
fans out, which is the worst possible moment to debug it.

### trigger.dev

One secret key. The project reference goes in `trigger.config.ts`, not
in the environment.

Set the same key in the trigger.dev dashboard's environment variables for
any secret the tasks themselves need — the tasks run on trigger.dev's
infrastructure, not Vercel, so they do not inherit Vercel's environment.
In practice the scan and evaluation tasks need `DATABASE_URL`,
`DIRECT_URL`, `ANTHROPIC_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`,
`RAPIDAPI_KEY`, and `FIRECRAWL_API_KEY` set there as well.

### Adzuna

Two values, app id and app key. Free tier is roughly 250 calls per month
at about one request per second. The India endpoint is
`/v1/api/jobs/in/search/`.

### JSearch (RapidAPI)

One key. **200 requests per month, total.** That is about six scans a day
for a month, and it is easy to burn half of it debugging a parser. The
quota defenses in `job-sources.md` exist mainly for this source.

The host header is `jsearch.p.rapidapi.com` and is a constant, not an
environment variable. The search endpoint is `/search-v2` — the provider
retired plain `/search` at some point after this adapter was written; a
subscribed, working key 404s on the old path with the exact same message
an unsubscribed key gets, which is worth knowing before re-diagnosing
this as a subscription problem.

### Firecrawl

One key. Not a job aggregator like Adzuna/JSearch — a scrape-and-extract
service. `lib/sources/firecrawl.ts` scrapes one WeWorkRemotely category
page per scan and asks Firecrawl's hosted model to extract a job array
from it via a JSON schema, the same shape of source as the Playwright
scraper but without a browser. Optional; the product works without it.

Confirm the monthly credit ceiling on your actual firecrawl.dev plan and
adjust the `FIRECRAWL` entry in `lib/sources/quota.ts` — the shipped
number is a conservative placeholder, not a verified figure.

### ATS boards and Playwright

No credentials. Greenhouse, Lever, and Ashby board endpoints are public
JSON. This is why they are the default source and the demo-day safety
net.

## Not in this stack

Recorded so they are not re-added by reflex:

- **No Redis / Upstash.** trigger.dev handles queueing, retries, and
  concurrency.
- **No `CRON_SECRET`.** There are no cron routes.
- **No blob storage** (R2, Supabase Storage, Vercel Blob). The CV PDF is
  parsed and discarded; only text is kept.
- **No OpenAI key.** One AI provider.

## Vercel deployment

Every variable above goes into the Vercel project settings, with
`NEXT_PUBLIC_APP_URL` set to the deployed origin. Add the Clerk webhook
endpoint pointing at `<deployed origin>/api/webhooks/clerk` once the
first deploy exists.
