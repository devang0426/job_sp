# Architecture Context

## Stack

| Layer      | Technology                          | Role                                          |
| ---------- | ----------------------------------- | --------------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript | Pages, route handlers, server components      |
| UI         | Tailwind v4 + Lucide React          | Styling from tokens, stroke icons             |
| Auth       | Clerk                               | Identity, sessions, `userId` on every request |
| Database   | Prisma + PostgreSQL (Neon)          | All persistent state                          |
| AI         | Gemini 2.5 Flash, Claude Sonnet 5    | CV parsing, match evaluation, drafts          |
| Background | trigger.dev                         | Scans, evaluations, Playwright scraping       |
| PDF        | `pdf-parse`, model document block   | CV text extraction with a fallback            |
| Deploy     | Vercel                              | Hosting, preview URLs                         |

## Naming

A **`Job`** is a scraped job posting. Background work is a trigger.dev
**run**. The word "job" is never used for background work anywhere in this
codebase — not in model names, variable names, or comments. This costs
nothing to observe and prevents a hundred ambiguous names.

## System Boundaries

- `app/` — Routes, pages, and API route handlers. Handlers orchestrate;
  they do not contain business logic.
- `components/` — React components, grouped by surface: `ui/` primitives,
  `meter/`, `shell/`, `feed/`, `report/`, `tracker/`, `editor/`.
- `lib/` — All logic. `sources/` (adapters, normalize, dedupe, filter),
  `ai/` (client, prompts, calls), `evaluation/` (schema, scoring),
  `tracker/` (state rules), `validation/` (request schemas), `db.ts`,
  `auth.ts`, `api.ts`.
- `trigger/` — trigger.dev task definitions. Tasks call into `lib/`; they
  own no logic themselves.
- `prisma/` — Schema, migrations, seed.
- `config/` — Checked-in configuration data, notably `portals.yml`.

## Storage Model

- **PostgreSQL (Neon)** — Everything. Users, preferences, resumes, jobs,
  matches, applications, events, artifacts, scan runs.
- **No blob or file storage.** The uploaded CV PDF is parsed on upload and
  then discarded; only the extracted text and the structured JSON are
  persisted, as columns. This is deliberate: nothing downstream reads the
  binary, and keeping it would add a service and a set of credentials for
  a file with no reader. If PDF retention is ever needed, Vercel Blob is
  the upgrade path — but it is not built for now.
- Raw provider payloads are kept on the `Job` row as JSON so that
  re-parsing a posting never costs another metered API call.

## Auth and Access Model

- Clerk owns identity. Every request carries a Clerk `userId`.
- **`clerkId` is a unique column, not the primary key.** Every foreign key
  in the schema points at a cuid `id`. Using a vendor's id format as a
  primary key would pin the entire schema to Clerk.
- Every `User` row is created by upsert on `clerkId`, from two paths that
  may race:
  1. The `user.created` webhook, verified with svix.
  2. `requireUser()`, which JIT-upserts on first authenticated request.

  Both paths are required. The webhook alone is not enough, because local
  development has no public URL — a developer who signs up locally would
  have no `User` row and every route would fail. Both use `upsert` on
  `clerkId` and treat a `P2002` unique violation as a no-op.
- Every query is scoped by the owning user. Ownership is checked before
  any mutation, in the route handler, before any logic runs.

## The Three-Tier Flow

Any operation that takes more than a moment follows one shape:

1. A route handler validates the request, creates or updates a database
   record in a pending state, triggers a trigger.dev task, and returns
   the record id immediately.
2. The trigger.dev task executes the work and writes the result back to
   that record.
3. The UI subscribes to the run and renders from the record.

This is what makes `ui-context.md`'s rule — *long-running actions never
block the UI* — structurally true rather than a convention someone has to
remember. Two consequences:

- **A `Match` row is created when evaluation is triggered**, with
  `status: PENDING` and its `triggerRunId`, then filled in by the task.
  The feed therefore has a record to render a progress state against, and
  the row's `@@unique([userId, jobId])` doubles as the idempotency guard:
  double-clicking Evaluate cannot fire two paid model calls.
- **The scan task fans out.** It fetches and upserts postings, then
  batch-triggers N evaluation runs. It never evaluates inline in a loop.

trigger.dev supplies retries, idempotency keys, concurrency limits, run
status, and long execution times. There is no queue table, no cron drain
route, and no lease or claim logic in this codebase. If you find yourself
writing one, something has gone wrong.

Starting a scan — creating the `ScanRun` in `QUEUED`, snapshotting
preferences, triggering the `scan` task — lives in `lib/scan/startScan.ts`,
not in the route handler. Both entry points use it: `POST /api/scans` (the
user clicks Run scan) and `trigger/autoScan.ts`.

`trigger/autoScan.ts` (`auto-scan-sweep`) is a `schedules.task` with **no
declarative cron** — nothing runs unless a user opts in. When a user sets
`Preferences.autoScanEnabled`, `upsertPreferences` →
`syncAutoScanSchedule` (`lib/scan/autoScanSchedule.ts`) registers a
per-user CRON schedule against that task via `schedules.create`
(`externalId` = the user id, cron from `autoScanIntervalMinutes`), and
stores the schedule id on the row; turning it off deletes the schedule.
Each firing scans exactly the `externalId` user, forced to the unmetered
sources so the cadence cannot exhaust a metered quota. It is the only
scheduled task in the codebase; it is a clock, not a queue.

Playwright scraping runs as a trigger.dev task using the official
Playwright build extension, which installs browser binaries into the task
image. It cannot run on Vercel serverless. Pin Playwright to `1.57.0` —
the build extension breaks on 1.58+.

## Database Connections

Neon is serverless and each Vercel invocation opens a pool. Three things
are required together:

- `DATABASE_URL` is the **pooled** (`-pooler`) connection string, used as
  Prisma's `url`.
- `DIRECT_URL` is the direct connection string, used as `directUrl` so
  migrations work.
- The Prisma client is a singleton cached on `globalThis`, so hot lambdas
  reuse one client.

Without all three, connection exhaustion appears exactly when a scan fans
out — the worst possible moment.

## Invariants

1. Route handlers never call a model inline for bulk work. Anything that
   evaluates more than one job is a trigger.dev task.
2. Job identity is `Job.dedupeKey`, and ingest is an upsert on it. The
   update branch never rewrites `source` or `sourceId` — first-seen
   provenance wins.
3. A `Match` belongs to exactly one `(user, job)` pair. Re-evaluating
   overwrites; it does not accumulate.
4. A `Match` is never persisted without a successful schema validation of
   the model's response. Constrained generation is not a reason to skip
   the parse.
   Both providers are reached through `generate()` in `lib/ai/generate.ts`,
   which validates before returning. Gemini runs first when its key is
   set, retrying its own transient statuses; Claude is the fallback when
   Gemini is absent or fails. No call site talks to a provider directly.
5. Every application status change updates `status` and `statusChangedAt`
   **and** inserts an `ApplicationEvent`, in one transaction. A bare
   `application.update({ status })` is a bug.
6. The headline match score is computed in application code from the
   model's dimension scores. The model never supplies the score directly.
7. The system never performs an outbound application, submission, or send
   on the user's behalf. It produces links and drafts.
8. No component reads a color except through a CSS custom property token.
9. A scan that loses one source still succeeds, marked partial. One
   source's rate limit never fails the whole run.
