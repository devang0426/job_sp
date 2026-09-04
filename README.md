# Job scraper and resume matcher

A job search console. It pulls real postings from four sources, evaluates
each one against your CV, and returns a 0–100 fit score with the reasoning
behind it — then tracks what you do about it.

**The system evaluates and recommends. You decide and act.** It never
submits an application and never sends an email. It surfaces the apply
link and drafts text you send yourself. That is a product stance, not a
missing feature.

The full specification lives in [`context/`](context/) — start with
[`context/project-overview.md`](context/project-overview.md).

## The loop

1. Sign in, upload a CV PDF, set target roles and preferences.
2. Run a scan. Postings are pulled from the enabled sources, normalized,
   deduplicated, and pre-filtered against your preferences.
3. Surviving postings are evaluated asynchronously and fill into the feed
   as they land. The UI never blocks on them.
4. Open a match report: the score, the five dimensions behind it, which
   requirements are evidenced, strengths, gaps, CV tips, and a legitimacy
   read on the posting.
5. Save a job to the tracker and move it through the pipeline. Every move
   is recorded with a timestamp.
6. Generate a follow-up email draft or per-job CV tailoring. Both land
   editable; you copy and send.

## Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript  |
| UI         | Tailwind v4 + Lucide React            |
| Auth       | Clerk                                 |
| Database   | Prisma 6 + PostgreSQL (Neon)          |
| AI         | Gemini 2.5 Flash, Claude Sonnet 5     |
| Background | trigger.dev                           |
| Scraping   | Playwright 1.57.0 (pinned)            |
| Deploy     | Vercel                                |

## Setup

**Prerequisites:** Node 20+, and accounts on Neon, Clerk, trigger.dev, and
at least one AI provider. Everything but AI usage sits on a free tier.

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run db:deploy            # apply migrations to your database
npm run dev
```

Open http://localhost:3000. You will be sent to sign-in, then onboarding.

### Environment

Every variable is documented in
[`context/env-reference.md`](context/env-reference.md). The ones without
which nothing runs:

| Variable | Why |
| -------- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Sign-in |
| `DATABASE_URL` | The **pooled** Neon string — its host contains `-pooler` |
| `DIRECT_URL` | The **direct** Neon string, for migrations |
| `TRIGGER_SECRET_KEY` | Background scans and evaluations |
| `GOOGLE_GENERATIVE_AI_API_KEY` *or* `ANTHROPIC_API_KEY` | At least one, or every AI call fails |

Getting the two database URLs the wrong way round surfaces as connection
exhaustion the moment a scan fans out, which is the worst possible time to
debug it.

Optional: `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` and `RAPIDAPI_KEY` add two
more job sources. Without them the three ATS boards
(Greenhouse / Lever / Ashby, unauthenticated and unmetered) still work, and
so does the whole product.

### Background worker

Scans, evaluations, and drafts run on trigger.dev, not in the web process.
In a second terminal:

```bash
npx trigger.dev@latest dev
```

Without it a scan is created and then sits in `QUEUED`. The app notices:
after 15 minutes it reconciles the run and tells you the worker never
picked it up, rather than spinning forever.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint over the whole repo |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:studio` | Prisma Studio |
| `npm run seed` | Idempotent demo data |
| `npm run test:*` | Unit suites — see `package.json` |

The Prisma scripts wrap the CLI in `dotenv -e .env.local`, because Prisma's
CLI only auto-loads `.env` and this project's variables live in
`.env.local`.

## Deploying

**Vercel.** Set every variable from `context/env-reference.md`, with
`NEXT_PUBLIC_APP_URL` pointing at the deployed origin.

**Clerk.** Add a production webhook at `<origin>/api/webhooks/clerk` for
`user.created`, `user.updated`, and `user.deleted`, and set
`CLERK_WEBHOOK_SIGNING_SECRET`. The webhook is belt-and-braces: a `User`
row is also created just-in-time on the first authenticated request, which
is what local development relies on.

**trigger.dev.** `npx trigger.dev@latest deploy`. Tasks run on
trigger.dev's infrastructure and do **not** inherit Vercel's environment —
set `DATABASE_URL`, `DIRECT_URL`, the AI key, and the source keys again in
the trigger.dev dashboard, or the route will trigger fine and the task will
fail on a missing variable.

**Neon.** Confirm the pooled URL is what the app uses and the direct URL is
what migrations use.

## Architecture notes

Three things are worth knowing before changing anything:

- **A `Job` is a scraped posting. Background work is a trigger.dev *run*.**
  The word "job" never means background work anywhere in this codebase.
- **Anything slower than a moment follows one shape:** the route handler
  validates, writes a record in a pending state, triggers a task, and
  returns the record id immediately. The task does the work and writes back.
  The UI subscribes to the record. There is no queue table and no cron
  drain route — do not add one.
- **The headline match score is computed in application code**, in
  `lib/evaluation/score.ts`, from the five dimension scores the model
  returns. The model never supplies the score. That is what makes the
  report able to show its own arithmetic.

The full set of invariants is in
[`context/architecture.md`](context/architecture.md).
