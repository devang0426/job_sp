# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- **Deployment Ready — codebase cleaned, linted (0 errors/warnings), tested (62/62 tests passing), and optimized for production.**

## Current Goal

- Deploy to Vercel and Trigger.dev. Configure environment variables in production and run final smoke verification.

## Completed

- Context files written: `project-overview.md`, `architecture.md`,
  `data-model.md`, `evaluation-spec.md`, `job-sources.md`,
  `application-states.md`, `prompt-specs.md`, `code-standards.md`,
  `ai-workflow-rules.md`, `env-reference.md`.
- `ui-context.md` authored by the user, unchanged and protected.
- Feature files 01–20 written under `features/`, in build order.
- **Feature 01 — Project foundation.** Runtime + dev deps installed.
  Prisma (pinned v6) connected to Neon; `User`-only schema migrated
  (`20260902094313_init`). `lib/db.ts` singleton, `lib/api.ts` envelope
  (`ok` / `fail`, stable `ERROR_CODES`), `GET /api/health` (nodejs
  runtime, `SELECT 1`, returns `{ ok, dbLatencyMs }`).
  `serverExternalPackages: ["pdf-parse"]` in `next.config.ts`.
  `npm run build` passes; health route verified returning 200.
- **Feature 02 — UI foundation.** Token palette + type scale in a
  Tailwind v4 `@theme` block (`app/globals.css`), the one place hex
  lives. Archivo / Barlow Condensed / JetBrains Mono via `next/font`.
  `.eyebrow` / `.heading` helpers; global `tabular-nums`, focus ring,
  and reduced-motion rules. App shell: `app/(console)/layout.tsx` with
  `components/shell/Nav.tsx` (in-scope screens only) + `StatusBar.tsx`
  (placeholder mono counters). `components/ui/` primitives — Button,
  Chip, Field, Modal, EmptyState, Skeleton, StatusChip. `lib/cn.ts`.
  Placeholder console pages (`/feed`, `/scans`, `/tracker`,
  `/follow-ups`, `/studio/cv`, `/studio/emails`, `/settings`); `/`
  redirects to `/feed`. Scaffold page deleted. Build + lint pass;
  shell screenshotted.
- **Feature 03 — Auth with Clerk.** Identity owned by Clerk. `middleware.ts`
  protecting console routes while keeping health probe and webhook public.
  `app/layout.tsx` wrapped with `ClerkProvider` using token palette CSS variables
  for `clerkAppearance`. Catch-all pages for `/sign-in` and `/sign-up`.
  `lib/auth.ts` `requireUser()` implemented with JIT upsert and unique violation
  (`P2002`) race handling. `POST /api/webhooks/clerk` with svix signature verification
  and Zod-parsed payload validation for `user.created`, `user.updated`, and soft-delete
  on `user.deleted`. Build verified passing cleanly.
- **Feature 04 — Data schema.** Full Prisma schema defined (`User`, `Preferences`,
  `Resume`, `Job`, `Match`, `Application`, `ApplicationEvent`, `Artifact`, `ScanRun`,
  and all enums). `lib/sources/dedupe.ts` job deduplication key generator implemented
  and unit tests verified passing (`npm run test:dedupe`). `lib/tracker/states.ts` Kanban status
  ordering and terminal state constants defined. Idempotent seed script (`prisma/seed.ts`)
  created and verified across consecutive runs (`npm run seed`). Database synchronized with Neon
  and build verified passing (`npm run build`).
- **Feature 05 — Score meter.** Discrete 10-segment signal meter (`components/meter/ScoreMeter.tsx`)
  rendering at `sm` (3px), `md` (6px), and `lg` (12px) scales, colored by recommendation verdict
  (`--verdict-apply`, `--verdict-consider`, `--verdict-skip`). `filledSegments()` mapping implemented
  in `lib/evaluation/score.ts` (`Math.max(1, Math.round(score / 10))` for scores > 0) with unit test coverage
  verifying boundary cases (`npm run test:score`). Orchestrated staggered fill hook (`useMeterStagger.ts`)
  enforcing single animation per match ID, initial load suppression, and `prefers-reduced-motion` compliance.
  Interactive sandbox route created (`app/(console)/dev/meter/page.tsx`). Build verified passing cleanly (`npm run build`).
- **Feature 06 — Job feed.** Full-bleed job dispatch board (`app/(console)/feed/page.tsx`) with sticky
  column headers in Barlow Condensed, tabular mono values, score meter (`sm`), verdict chips, and direct `applyUrl` outbound links (`target="_blank"`).
  `GET /api/jobs` implemented with Zod validation (`lib/validation/jobs.ts`), auth check, user scoping, left-joined matches/applications, filtering, score/date sorting, and cursor pagination (`lib/db/jobs.ts`).
  Sticky `FilterBar` component with URL query string synchronization for shareable state.
  Four row states rendered cleanly (evaluated, pending, failed, not evaluated) with distinct empty states for zero total jobs vs zero filter matches.
  Build verified passing cleanly (`npm run build`).
- **Feature 07 — Background jobs.** Installed `@trigger.dev/sdk` and created `trigger.config.ts`.
  Implemented non-expensive `noopTask` (`trigger/noop.ts`) sleeping 3s, testing DB connectivity with Prisma, and supporting simulated errors (`shouldFail`).
  Built trigger & status API route handlers (`POST /api/dev/noop` returning run ID immediately, `GET /api/dev/noop` & `GET /api/runs/[runId]`).
  Implemented `useRunStatus` hook (`hooks/useRunStatus.ts`) polling status until terminal.
  Created `ProgressState` (`components/ui/ProgressState.tsx`) rendering mono progress and persistent failure states (`--state-error`) with retry control.
  Created interactive developer sandbox (`app/(console)/dev/noop/page.tsx`).
- **Feature 08 — Resume upload.** Implemented multi-path resume text extraction chain (`lib/resume/parse.ts`: path 1 pdf-parse, path 2 Claude document block, path 3 user paste fallback). Created Zod validation schema (`lib/validation/resumes.ts`) and DB functions (`lib/db/resumes.ts`) managing `User.activeResumeId` and sole active resume deletion constraints. Built API handlers (`GET/POST /api/resumes`, `POST /api/resumes/paste`, `DELETE /api/resumes/[id]`, `POST /api/resumes/[id]/activate`) returning standard envelopes and verbatim 422 `PDF_UNREADABLE` error copy. Built `ResumeUpload.tsx` component with drag-and-drop, paste mode, and active CV list, integrated into CV Studio page (`/studio/cv`). Unit tests (`npm run test:resume`) and Next.js build (`npm run build`) verified passing cleanly.
- **Feature 09 — Resume parser.** Implemented AI CV structuring system (`lib/ai/structureResume.ts`) using Anthropic SDK `messages.parse()` with `zodOutputFormat(ResumeProfileSchema)` (`lib/ai/prompts/structureResume.ts`). Enforced strict extraction rules (explicit skills, roles, education, total experience or null fallback when unstated). Configured `DEFAULT_MODEL = "claude-sonnet-5"` in `lib/ai/client.ts` with cost accounting (`lib/ai/cost.ts`) calculating input, output, and cached token pricing. Created `structureResumeTask` trigger.dev task (`trigger/structureResume.ts`) and integrated automatic triggering into upload/paste API routes (`app/api/resumes/route.ts` & `app/api/resumes/paste/route.ts`). Implemented re-parse API route (`POST /api/resumes/[resumeId]/structure`). Built `ResumeProfile.tsx` UI rendering skill chips, roles, education, experience badge, and cost/prompt metadata. Unit tests (`npm run test:parse-resume`) and Next.js build (`npm run build`) verified passing cleanly.
- **Feature 10 — Preferences and onboarding.** Built Zod validation schema (`lib/validation/preferences.ts`) enforcing defaults (`sources` defaulting to ATS boards `["GREENHOUSE", "LEVER", "ASHBY"]`) and server-side hard-clamping of `maxJobsPerScan` to max 60. Unit tests created and verified passing (`npm run test:preferences`). Database accessors (`lib/db/preferences.ts`) created for preferences and `completeOnboarding()` (refusing onboarding completion without active CV or preferences). API routes created (`GET/PATCH /api/preferences`, `POST /api/onboarding/complete`). Onboarding gate enforced in console shell layout (`app/(console)/layout.tsx`) redirecting non-onboarded users to `/onboarding`. Built interactive onboarding wizard (`app/onboarding/page.tsx` & `components/editor/OnboardingWizard.tsx`) and preferences editor (`components/editor/PreferencesForm.tsx`) with progressive disclosure and explicit pre-filtering cost control copy. Integrated `PreferencesForm` into settings page (`app/(console)/settings/page.tsx`).
- **Feature 11 — ATS board sources.** Implemented `JobSourceAdapter` interface and `NormalizedJob` shape (`lib/sources/types.ts`). Built normalization utilities (`lib/sources/normalize.ts`): HTML stripping with paragraph/list preservation, remote inference, safe date parsing, and validation. Deterministic pre-filter (`lib/sources/filter.ts`) drops exclude-keywords, excluded-companies, no-keyword matches, stale postings (30-day window), non-remote when `remoteOnly` set, and below `minSalary` — only when both floor and posting salary are known (unknown salary never dropped). 14 unit tests verified passing (`npm run test:filter`). Three ATS adapters implemented: Greenhouse (`lib/sources/greenhouse.ts`, `content=true` for full JD), Lever (`lib/sources/lever.ts`, assembles description + lists + additional), Ashby (`lib/sources/ashby.ts`). All adapters return errors as values, never throw — nonexistent board tokens produce an entry in `errors` and an empty `jobs` array. `config/portals.yml` created with ~20 India-relevant and global tech companies across all three ATS platforms. Barrel module (`lib/sources/index.ts`) provides YAML portals loader, adapter factory filtered by enabled sources, and re-exports. Build verified passing (`npm run build`).
- **Feature 12 — Job search APIs.** Two metered source adapters: Adzuna (`lib/sources/adzuna.ts`, India `/in/` endpoint, `app_id`+`app_key` auth, salary period inference, predicted-salary filtering, relative date parsing) and JSearch (`lib/sources/jsearch.ts`, RapidAPI with constant host header, explicit salary period normalization — never assumes annual, timestamp-first date parsing). Both implement `JobSourceAdapter`, return errors as values, and never throw. Monthly per-source request counter (`lib/sources/quota.ts`) with configurable ceilings (Adzuna 250, JSearch 200); exhausted sources are skipped, not failed. Development on-disk response cache (`lib/sources/cache.ts`) keyed by SHA-256 of request URL — active only when `NODE_ENV !== 'production'`, ensures parser iteration costs zero quota. `cachedFetch()` wraps `fetch` with transparent cache read/write and returns `fromCache` flag so quota is only counted on real network requests. Barrel module (`lib/sources/index.ts`) updated with `buildSearchAdapters()` and `buildAllAdapters()` combining ATS + search APIs filtered by enabled sources. `.gitignore` updated to exclude `.cache/`. Build verified passing (`npm run build`).
- **Feature 13 — Job scraper.** Headless-browser scraper running as a trigger.dev task with the Playwright build extension (chromium only, pinned to `1.57.0`). **Target: RemoteOK** (`remoteok.com`) — chosen because it is a cooperative target with a public JSON API, no login, no CAPTCHA, no commercial anti-bot wall, and `robots.txt` permits automated access. The feature spec endorses this: "If a candidate site turns out to be a client-rendered SPA calling a public JSON endpoint, use that endpoint. That is a better scraper, not a worse one." Scraper adapter (`lib/sources/scraper.ts`) implements `JobSourceAdapter` with `source: SCRAPED`, errors as values, never throws. `fetchRemoteOkJobs()` fetches from the `/api` JSON endpoint with keyword/role client-side filtering and `MAX_JOBS_PER_RUN=50` ceiling. Trigger task (`trigger/scrape.ts`, `scrape-remoteok`) launches chromium, loads the page, verifies content with primary (`tr.job`) + fallback (`[data-slug]`) selectors, takes diagnostic screenshots on failure, respects 1s pacing delay, 60s total run time ceiling, descriptive UA, and `maxAttempts: 1` (no aggressive retries). Zero-job-on-success is an error entry, not silence. `trigger.config.ts` updated with `playwright()` build extension. Barrel module (`lib/sources/index.ts`) updated with `buildScraperAdapters()` and included in `buildAllAdapters()`. Build verified passing (`npm run build`).

- **Feature 14 — Scan orchestration.** `POST /api/scans` (concurrency-guarded, 409 `SCAN_IN_PROGRESS`; a run stuck active > 15 min stops blocking), `GET /api/scan-runs`, `GET /api/scan-runs/[scanRunId]`. Orchestrator `trigger/scan.ts` (task id `scan`, `maxAttempts: 1`): snapshots `Preferences` into `ScanRun.querySnapshot`, runs every enabled adapter via `buildAllAdapters` catching throws into `sourceStats.errors`, `dedupeBatch` (new pure `lib/sources/ingest.ts`) collapses in-batch dupes, `upsertScannedJob` (new, in `lib/db/jobs.ts`) upserts on `dedupeKey` — update branch never touches `source`/`sourceId`/`firstSeen*`, with a `[source, sourceId]` P2002 fallback. Pre-filter gates evaluation only (all deduped postings are stored); survivors capped at `maxJobsPerScan`, given a `PENDING` `Match` via `createPendingMatches` (`lib/db/matches.ts`, skips `RUNNING`/`COMPLETE`), then `tasks.batchTrigger("evaluate", { userId, jobId, resumeId }, idempotencyKey eval:…)`. Status: `FAILED` only if every source errored and nothing ingested, else `PARTIAL` on any source error / soft warning (no CV, autoEvaluate off, eval dispatch failed — the last expected until feature 15), else `SUCCEEDED`. `lib/db/scanRuns.ts` owns the record lifecycle + `ScanRunView`; `lib/sources/scanPlan.ts` maps snapshot ⇄ search/filter params. UI: `components/scans/ScanButton.tsx` (POST then poll `GET /api/scan-runs/[id]` to terminal, mono progress, `router.refresh()`) and `components/scans/ScanRunList.tsx` (board, expandable per-source stats) on `/scans`; compact `ScanButton` in the feed header. New error code `SCAN_IN_PROGRESS` in `lib/api.ts`. `npm run build` + existing unit tests pass; lint clean for new files (pre-existing 14 errors unchanged).

- **Feature 15 — Match evaluation.** Core structured evaluation engine. Implemented Zod schema contract (`lib/evaluation/schema.ts`) and deterministic scoring system (`lib/evaluation/score.ts`) computing weighted mean (roleFit 0.30, skillsMatch 0.30, experienceDepth 0.20, domainContext 0.10, logistics 0.10), deterministic score caps (`critical_gap_x1` cap 59, `critical_gap_x2` cap 39, `logistics` cap 49 for score < 30), and suspicious legitimacy override (`SKIP`). 9 boundary unit tests verified passing (`npm run test:score`). Evaluation prompt (`lib/ai/prompts/evaluate.ts`, `VERSION = "eval@1"`, constant `SYSTEM`) with byte-identical prompt caching prefix (`SYSTEM` + CV text with `cache_control: { type: "ephemeral" }`, volatile truncated JD in user message). Evaluation core (`lib/ai/evaluate.ts`) enforcing Invariant 4 (safeParse re-validation), array bounds truncation, score calculation, token accounting, and `Match` persistence. Trigger task registered with id `"evaluate"` (`trigger/evaluate.ts`) matching scan orchestrator fan-out contract. Built idempotent route handlers (`POST /api/jobs/[jobId]/evaluate` with double-click guard and `?force=1`/`?wait=1` support, `POST /api/matches/evaluate-batch` with Zod validation and `tasks.batchTrigger`). TypeScript compilation and Next.js production build verified passing cleanly (`npm run build`).

- **Feature 16 — Match report.** Hub screen implemented at `/feed/[jobId]`.
  Sticky left `VerdictRail` (`components/report/VerdictRail.tsx`) featuring 40/44 mono display score, `lg` 12px segment ScoreMeter, five dimension bars with expandable rationales (`components/report/DimensionBars.tsx`), legitimacy tier chip, verdict chip, outbound apply link (`target="_blank"`), and "Save to tracker" action (POST `/api/applications` with `CREATED` event).
  Seven scrolling right pane report blocks:
  1. Role summary with outbound link.
  2. Requirement → evidence map (`components/report/RequirementMap.tsx`) in self-scrolling horizontal container with text chips (CRITICAL, IMPORTANT, NICE TO HAVE; STATED, STRUCTURAL, INFERRED, NONE) and visual highlight for critical unevidenced gaps.
  3. Strengths (`components/report/StrengthList.tsx`).
  4. Gaps with blocking/significant/minor severity chips (`components/report/GapList.tsx`).
  5. CV improvement tips (`components/report/CvTips.tsx`) with target section and concrete edit.
  6. Legitimacy screen (`components/report/LegitimacyPanel.tsx`) evaluating 6 signals with pass/unclear/fail.
  7. Verdict & Score explainer (`components/report/ScoreExplainer.tsx`) showing dimension weights, arithmetic contribution, and explicit cap details.
  Full support for `PENDING` (progress state), `FAILED` (`--state-error` with retry action), and stale-CV notice with re-evaluation. Built `GET /api/matches/[matchId]` and connected feed row click. Configured Google Gemini API (`gemini-2.5-flash`) via `GOOGLE_GENERATIVE_AI_API_KEY` with cost accounting and fallback. Unit tests (`test:score`) and `npm run build` verified passing cleanly.

- **Feature 17 — Application tracker.** Full Kanban board and detail view.
  - Invariant 5 enforced: every status change is executed transactionally in `lib/tracker/transition.ts`, updating `status`, `statusChangedAt`, and inserting an `ApplicationEvent` record.
  - In-column reordering (`PATCH /api/applications`) reorders `boardOrder` only and writes no events.
  - Days-in-status strictly reads `statusChangedAt` in mono format (`Xd`).
  - Permissive transitions: cards can move between any statuses, including out of terminal states (`OFFER`, `REJECTED`, `DISCARDED`, `SKIP`, `HIRED`), recording an honest history.
  - Active toggle: board defaults to active pipeline (4 columns: `EVALUATED` through `INTERVIEW`) to fit laptops without scrolling, with a 1-click toggle to show all 9 columns.
  - Optimistic drag-and-drop UI with automatic rollback and error notification on failure.
  - Application detail screen at `/tracker/[applicationId]` featuring:
    - Left summary rail: company, role, status selector chip with instant transition, `ScoreMeter` signal, key dates in mono (Saved, Status Changed, Applied, Next Follow-up), direct apply link, and match report link.
    - Right tabbed pane: Overview (notes editor with save capability, role overview), Documents (generated artifacts), and Activity (`EventTimeline` rendering all status changes and timestamps in order).
    - Hidden tabs: Interviews, Offer, and Outcome tabs are strictly absent, not disabled.
  - Endpoints: `POST /api/applications` (idempotent save), `GET /api/applications` (grouped board payload), `PATCH /api/applications` (column reorder), `GET /api/applications/[id]`, `PATCH /api/applications/[id]`.
  - Unit tests (`npm run test:tracker`, `test:score`, `test:dedupe`) and Next.js production build (`npm run build`) verified passing cleanly.

- **Feature 18 — Follow-up email.** Tailored follow-up email drafts generated from application and match context, landing in an editable two-pane studio for candidate copy/send actions.
  - The system never sends: email drafts land in an editable field and the user copies and sends them manually. Marking a follow-up as sent is an explicit user action that logs a history event.
  - Prompt implementation in `lib/ai/prompts/followUp.ts` (`VERSION = "followup@1"`, constant `SYSTEM`, volatile `buildUser()`) enforcing: strictly under 150 words, specific role/company reference, no apologies/pressure, plain text (no markdown, no emoji), and one clear ask.
  - Model support: Gemini 2.5 Flash (`gemini-2.5-flash`) via `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` with Claude Sonnet fallback (`zodOutputFormat(FollowUpOutputSchema)`), token accounting, and cost tracking.
  - Artifact persistence: saved as `Artifact` with `kind: FOLLOW_UP_EMAIL`, storing original draft in `content`, user revisions in `editedContent` (null until modified), `inputs`, `model`, `promptVersion`, and `costUsd`.
  - Two-pane `DraftEditor` component (`components/editor/DraftEditor.tsx`): source context and dates on the left, editable subject and body on the right, word count tracking with 150-word cap defense, "Revert to generated" action, and copy-to-clipboard (copies edited version when present, original otherwise).
  - Background task flow: `trigger/followUp.ts` (task id `"follow-up"`) supporting three-tier async execution via `POST /api/applications/[applicationId]/follow-up` with resilient sync fallback for dev environments.
  - Artifact API: `GET /api/artifacts/[artifactId]` and `PATCH /api/artifacts/[artifactId]` supporting user edits and reversion.
  - Scheduling & status counters: `Application.nextFollowUpAt` user-managed date drives real-time overdue and due-today counters (`lib/tracker/counters.ts` & `GET /api/status/counters`) on `StatusBar.tsx`.
  - Views: Integrated `DraftEditor` into `/tracker/[applicationId]` under dedicated "Follow-up Email" tab and accessible from "Documents" tab; full views on `/follow-ups` (grouped by overdue, due today, upcoming) and `/studio/emails` (all generated drafts).
- **Feature 19 — CV tailoring.** Per-job CV rewriting guidance providing concrete section-by-section rewrites, requirement tracking, and unaddressable gap flagging, grounded in existing match evaluation findings.
  - Ported from career-ops's `modes/pdf.md`, minus the PDF: tips and editable text only. No ATS score simulation or document rendering.
  - Prompt implementation in `lib/ai/prompts/tailorCv.ts` (`VERSION = "tailor@1"`, constant `SYSTEM`, volatile `buildUser()`) enforcing the four non-negotiable honesty rules:
    1. Rewrite what is there; never invent experience or inject keywords the candidate does not have.
    2. Preserve every factual claim: dates, titles, employers, numbers.
    3. Grounding: pair each rewrite with the specific requirement or gap it directly answers.
    4. Flag unaddressable requirements: honestly list requirements the CV cannot meet with a one-line reason.
  - Reuses match findings: takes the CV text, JD, and existing gaps and CV tips from `Match` without re-deriving them.
  - Multi-model execution in `lib/ai/tailorCv.ts`: Google Gemini API (`gemini-2.5-flash`) via `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` with Claude Sonnet (`claude-sonnet-5`) fallback, token counting, and cost tracking.
  - Artifact persistence: saved as `Artifact` with `kind: CV_VARIANT`, storing JSON output in `content`, user revisions in `editedContent` (null initially), `inputs`, `model`, `promptVersion`, and `costUsd`.
  - Two-pane `TailorPanel` (`components/editor/TailorPanel.tsx`): source context on the left (role, company, score, match gaps, CV tips), editable section rewrites on the right, unaddressable requirements defense callout, per-section copy, copy all rewrites, revert to generated, and auto/manual save.
  - Background task flow: `trigger/tailorCv.ts` (task id `"tailor-cv"`) supporting three-tier async execution via `POST /api/matches/[matchId]/tailor` with resilient sync fallback.
  - API endpoints: `POST /api/matches/[matchId]/tailor` and `GET /api/matches/[matchId]/tailor`.
  - Views & navigation: Dedicated tailoring screen at `/matches/[matchId]/tailor`, route alias `/feed/[jobId]/tailor`, quick-action buttons in `VerdictRail` and `CvTips`, and recent tailored CV variants board in `/studio/cv`.
  - Verification: 7 unit tests (`npm run test:tailor`) verifying rules, schema, serialization, and cost calculation. All regression test suites passing.

- **Feature 20 — Polish and deploy.** An audit of the whole core flow,
  then the gaps it found closed.

  **Design tokens (the largest defect).** The entire tracker surface —
  `Board`, `Card`, `Column`, `EventTimeline`, `ApplicationDetailView` —
  plus parts of `editor/` were written against a token vocabulary that
  does not exist in `globals.css` (`text-foreground`, `bg-canvas`,
  `border-border`, `bg-surface-elevated`, `text-accent-amber`,
  `font-heading`, `font-display`). Tailwind emits nothing for an
  unresolved token, so the board rendered with no borders, transparent
  backgrounds, and default black text. All of it now maps onto the real
  palette. Alongside it, ~40 raw Tailwind palette classes (`bg-rose-950`,
  `border-blue-800`, `text-emerald-400` — a dark-theme leftover) were
  replaced: the nine status dots and six event-type chips read from new
  `STATUS_TONE` / `STATUS_LABEL` maps in `lib/tracker/states.ts`, guarded
  by a unit test that fails if a non-token color reappears (Invariant 8).
  `.display` added to `globals.css` — two screens used the class and
  nothing defined it. Zero hardcoded hex outside `globals.css`; zero
  unresolved tokens.

  **AI reliability.** A Gemini 503 permanently failed an evaluation: a
  scan fanning out 40 calls at once routinely draws 429/503, and each one
  marked its `Match` FAILED. `lib/ai/gemini.ts` now retries 408/429/5xx
  four times with jittered exponential backoff. The documented "Gemini
  with Claude fallback" was also not real — `generate()` returned inside
  the Gemini branch and never reached Claude. It now falls back on a
  genuine Gemini failure, and rethrows the original error when Claude is
  not configured. `env-reference.md`, `.env.example`, and
  `architecture.md` updated: the two-provider layer was never documented,
  and `GOOGLE_GENERATIVE_AI_API_KEY` was absent from `.env.example`
  entirely.

  **Counters and empty states.** `GET /api/stats` added (the name feature
  20 specifies); `/api/status/counters` kept as an alias so an open tab
  does not 404 after a deploy. The console layout computes counters
  server-side and hands them to `StatusBar`, so they no longer flash
  zero. Follow-ups, both studio screens, and the event timeline now use
  the shared `EmptyState` primitive instead of hand-rolled boxes with
  icon illustrations.

  **Correctness found by the audit.** `ApplicationDetailView` read
  `app.job.description`; the column is `descriptionText`, so the overview
  tab showed its fallback string for every application.
  `PreferencesForm` had a written-but-never-rendered employment-type
  control, so every scan ran as Full-time — the control is now on the
  form. `test:tailor` asserted Gemini pricing that `MODEL_RATES` no
  longer used.

  **Types and lint.** 528 lint errors to 0. Most were `trigger/tmp/`
  bundler output, now gitignored and eslint-ignored. The rest were real:
  ~60 `any`s replaced with types derived from the Prisma schema
  (`MatchReportResult`, `ApplicationDetail`, `ArtifactView`,
  `MatchGap`/`MatchCvTip`), which is what surfaced the `description` bug;
  `catch (err: any)` with an `err?.name` string check replaced by
  `instanceof UnauthorizedError`; `useRunStatus` rewritten (it wrote refs
  during render and rebuilt its poll interval on every state change — it
  is now self-scheduling, so a slow response cannot stack requests);
  prop-to-state effects converted to React's adjust-during-render
  pattern.

  **Repo hygiene.** Eight `scratch-*.ts` files, a `scratch/` directory,
  `.queued`, `.scanrun`, and four `trigger/tmp/build-*` trees removed and
  ignored. `README.md` replaced (it was still create-next-app
  boilerplate) with setup, the environment table, the worker requirement,
  scripts, and the deployment checklist.

  **Copy and accessibility.** Sentence case throughout; errors now say
  what to do, not only what failed. State-bearing icons paired with text
  (the follow-up icon on a tracker card was an unlabelled calendar
  glyph); `aria-label` on the board filter input and its clear button;
  44px targets; `aria-hidden` on decorative glyphs. `ScoreMeter` already
  announced score and verdict, and `useMeterStagger` already honored
  `prefers-reduced-motion` — both confirmed, not changed.

  **Verification.** `npm run build` passes, `npx eslint .` reports zero
  problems, and all nine unit suites (57 tests) pass. The whole loop was
  exercised against the real database end to end: structure a CV,
  evaluate a job (score 15, SKIP, blocking gap named — success criterion
  4), save to tracker, two transitions with both events recorded, board
  payload, overdue counter, follow-up draft (114 words, under the 150
  cap), CV tailoring (7 rewrites, 4 unaddressable requirements). This
  left one real `Application` row and two `Artifact` rows on the
  development database.

- **JSearch endpoint fix.** The one completed scan run had logged
  `JSearch: HTTP 404` and it looked at first like a RapidAPI subscription
  gap — a subscribed key hitting an unsubscribed API returns the exact
  same "endpoint does not exist" message as a bad path, so the two are
  indistinguishable from the error alone. The user's dashboard showed an
  active Basic subscription, which ruled that out; direct calls against
  `/job-details` and `/estimated-salary` with the same key both returned
  `200`, confirming the key, host, and subscription were all fine and the
  fault was specific to `/search` itself. The provider had retired
  `/search` for `/search-v2`, confirmed from the user's own dashboard
  code snippet. `/search-v2` also changed shape — `data` is now
  `{ jobs: [...], cursor }` rather than a bare array — and drops the
  `page` param in favor of cursor pagination, which this adapter doesn't
  use (it only ever fetches one page). `lib/sources/jsearch.ts` updated
  for both; verified against the live API through the adapter itself (10
  jobs, zero errors, correct normalization). `job-sources.md` corrected
  to name `/search-v2`. `npm run build` and `npx eslint .` clean.

- **Firecrawl — fifth job source.** `JobSource.FIRECRAWL` added to the
  Prisma schema (migration `20260902181249_add_firecrawl_source`,
  applied). `lib/sources/firecrawl.ts` is a genuinely different shape of
  adapter than the other four: Firecrawl has no "search jobs" call, so it
  scrapes one page (`api.firecrawl.dev/v2/scrape` against WeWorkRemotely's
  `/categories/remote-programming-jobs`) and asks Firecrawl's hosted model
  to extract a job array via a JSON schema — the same kind of source as
  the Playwright scraper, minus the browser.
  Design was grounded in live calls before writing code, the same
  discipline as the JSearch fix above: `/search` (generic web search)
  returns board landing pages, not postings, so it can't source jobs on
  its own; a plain `/scrape` with schema-based JSON extraction against a
  real listing page returns clean structured postings. WeWorkRemotely's
  `robots.txt` was checked (`Allow: /`, only account/admin paths
  disallowed) before choosing it as a target, matching the standard
  `job-sources.md` already holds RemoteOK to; its `/search?term=...`
  route sits behind a Cloudflare challenge and is never called by this
  adapter. The category page mixes sponsored placements into the listing
  stream — they render like job cards but link to `/listing_ads/...`
  tracking redirects instead of postings; `isRealPostingUrl()` filters
  them out by URL shape after extraction, and duplicate rows the
  extraction model produces on long pages are deduped by `applyUrl`.
  Wired everywhere a source needs to appear: `buildFirecrawlAdapters()` in
  `lib/sources/index.ts`, `FIRECRAWL` monthly quota entry in
  `lib/sources/quota.ts` (placeholder ceiling — flagged in comments and in
  `env-reference.md` to confirm against the real plan), `jobSourceEnum` in
  both `lib/validation/preferences.ts` and `lib/validation/jobs.ts`, the
  feed's source filter in `FilterBar.tsx`, the sources checklist in
  `PreferencesForm.tsx` (used by both onboarding and settings), and the
  `METERED_SOURCES` set in `lib/db/jobs.ts` that decides whether a job's
  raw provider payload is worth persisting — missing that one would have
  silently dropped Firecrawl's payload on every ingest. `.env.example`,
  `env-reference.md`, `job-sources.md` (five adapters now, with a new
  section on why Firecrawl is a scraper, not an aggregator), and
  `data-model.md`'s enum line all updated.
  Verified end to end through the real adapter and the real orchestrator
  wiring, not just a raw API call: `createFirecrawlAdapter().search()`
  returned 7 correctly filtered, deduped, zero-ad jobs for a
  developer/engineer query, and `buildAllAdapters(["FIRECRAWL"])` /
  `buildAllAdapters()` both include exactly the expected adapter set.
  `npm run build`, `npx eslint .`, and all nine unit suites (57 tests)
  clean after the change.
  `FIRECRAWL_API_KEY` in `.env.local` was found under the wrong name
  (`firecrawl=`, lowercase, no suffix) and renamed to match the project's
  env-var convention before anything read it.

- **Pre-filter was dropping 100% of postings — no job was ever scored.**
  Audit triggered by "the core functionality is not working". Every recent
  `ScanRun` finished `SUCCEEDED` with `evaluationsQueued: 0` and `error:
  null`, so the feed showed thousands of jobs and not one score. Cause:
  `lib/sources/filter.ts` had grown a `passesSeniorityFilter` and
  `passesEmploymentTypeFilter` beyond the five rules `job-sources.md`
  specifies, and the `seniority: INTERN` branch *required* a positive
  internship signal in every posting — against ATS boards (overwhelmingly
  senior full-time roles) that rejected all 2447 stored jobs. Simulated
  over the real DB with the user's real preferences: 0 passed before, 18
  after; a live orchestrator run went from queuing 0 evaluations to 5.
  Fixes:
  - `passesSeniorityFilter` now only drops postings that point the
    *opposite* way from the target (an explicit senior/staff/lead title
    when the target is INTERN, an intern title when the target is SENIOR).
    Whether a plain "Software Engineer" is too senior for an intern is the
    match evaluation's job (experienceDepth / logistics caps), not a
    title-keyword guess in a free pre-filter. `job-sources.md` already
    excludes seniority from the pre-filter rules.
  - `passesEmploymentTypeFilter` now normalises case/hyphens, so the UI's
    `"Full-time"` / `"Internship"` are understood (it was matching only
    snake_case and silently no-opping); "wants internship *and*
    full-time" correctly passes everything.
  - `runScan` now pushes an actionable warning (→ `PARTIAL`) when postings
    were ingested but every one was filtered out, instead of reporting
    `SUCCEEDED` with an empty scored feed and no explanation.
  - `lib/sources/filter.test.ts` updated for the corrected INTERN
    semantics; `lib/validation/preferences.test.ts` updated for the
    `sources` default that already included `SCRAPED` / `FIRECRAWL` (a
    stale assertion, failing before this change).
  All nine unit suites pass (58 tests); `npm run build` clean.

- **Scans queued 0 evaluations again — stuck `RUNNING` matches.** After the
  filter fix, a scan still reported `evaluationsQueued: 0`. Traced through
  trigger.dev: the `dev` worker on the user's machine keeps dropping
  evaluate runs mid-execution (`TASK_RUN_STALLED_EXECUTING`,
  `SYSTEM_FAILURE`, `CANCELED`) — most evaluate batches on 09-03 had
  failures. `lib/ai/evaluate.ts` sets the `Match` to `RUNNING` before the
  model call; when the worker is killed there, nothing writes back and the
  row is stuck `RUNNING`. `createPendingMatches` skipped every `RUNNING`
  row, so the *next* scan queued nothing for those jobs and they were
  never scored — `reconcileStalledMatches` only unsticks them on a feed
  load, 15 minutes later.
  Fix: `createPendingMatches` now re-queues a `RUNNING` match whose row is
  older than 10 minutes (a real evaluation finishes in seconds; the
  batch-trigger idempotency key dedupes a double dispatch of a genuinely
  in-flight one). A scan now self-heals jobs left stuck by a dead worker.
  The underlying worker instability is environmental — `npx trigger.dev
  dev` needs to stay running on a machine that does not sleep — and is
  called out to the user, not code-fixable here.

- **Feed returned roles the user did not ask for.** `targetRoles` was
  merged into the pre-filter's keyword list and matched against title *and
  description*, so any posting whose JD merely named a listed technology
  passed — the feed filled with "Recruiter", "Analytics Engineer",
  "Maintenance Technician" for a "Full stack engineer" search. The ATS
  adapters (Greenhouse / Lever / Ashby) have no server-side search and
  return whole boards, so this title gate is the only role filter there is.
  Fix: `FilterParams` now separates `roleTitles` (matched against the job
  **title** — whole phrase, punctuation variants, or all distinctive
  non-generic words) from `keywords` (still title + description).
  `filterParamsFromSnapshot` stopped merging the two. Simulated on the real
  DB with the user's preferences: the passing set went from a grab-bag of
  ~15 to the 2 genuine "Full Stack …" postings. New unit tests for
  `matchesRoleTitle` and the title gate; 18 filter tests pass.

- **Scheduled auto-scan (dashboard setting).** `Preferences` gains
  `autoScanEnabled`, `autoScanIntervalMinutes` (fixed set 15 min … 1 day),
  and `lastAutoScanAt` (migration via `prisma db push` — the pre-existing
  `add_firecrawl_source` migration fails the shadow DB, so `migrate dev` is
  unusable until that is repaired). `lib/scan/startScan.ts` is a new shared
  helper that both `POST /api/scans` and the new scheduled task call — it
  owns the QUEUED-record / snapshot / trigger sequence and the concurrency
  guard. `trigger/autoScan.ts` is a `schedules.task` (`auto-scan-sweep`,
  cron `*/5 * * * *`) that starts a scan for every eligible user whose
  interval has elapsed, forced to the unmetered sources (Greenhouse /
  Lever / Ashby / RemoteOK) so the cadence cannot exhaust Adzuna / JSearch
  / Firecrawl. UI: an "Automatic scans" card in `PreferencesForm` (toggle +
  interval select), shown on both onboarding and settings.
  `npx tsc --noEmit` clean, `npm run build` clean, all nine unit suites
  (61 tests) pass.
  **Not yet exercised end to end:** the schedule only fires once
  `npx trigger.dev dev` (or a deploy) has registered the new task, and the
  first tick is up to 5 minutes out.

- **Seed jobs had fake apply URLs and polluted every feed.** `prisma/seed.ts`
  inserted 10 demo `Job` rows (`job_seed_01`…`job_seed_10`) with placeholder
  links (`startup.example.com/apply`, `jsearch.api/jobs/505`,
  `adzuna.in/details/404`, board ids `101`/`202`/`303`…). The feed query is
  not user-scoped on `Job` (postings are shared across tenants), so these
  showed for the real user, and their seeded matches carried the flashy
  demo scores (88/82/79) — so those were the rows people clicked. Real
  scanned postings were fine the whole time (spot-checked Greenhouse /
  Ashby apply URLs → HTTP 200). Fixes: `seed.ts` now only inserts the demo
  jobs/matches when `SEED_DEMO_JOBS=1`; `prisma/purge-demo-jobs.sql` removes
  the existing ones (`id LIKE 'job_seed_%'`, cascading matches / apps /
  events) and was run against the dev DB — 0 seed jobs, 0 fake-URL jobs
  left, 2438 real jobs untouched. `npx tsc --noEmit` clean.

- **End-to-end verification harness — `scripts/verify-e2e.mjs`.** Runs every
  shipped feature against the live system (Neon, real source APIs, real AI
  provider, real trigger.dev) and prints PASS/FAIL per feature.
  `npx tsx --env-file=.env.local scripts/verify-e2e.mjs [--with-ai] [--with-trigger]`.
  Result on 2026-09-03: **14 / 14 pass** — foundation, dedupe, scoring, ATS
  adapters, `runScan` (broad roles → 107 pass filter → 38 queued),
  `getFeedJobs`, `evaluateJob` (real score via `google/gemini-2.5-flash`),
  match report (apply URL real, not a seed placeholder), tracker
  `transition` (Invariant 5: status + statusChangedAt + event in one txn),
  follow-up draft (112 words, under cap), CV tailoring (11 rewrites), status
  counters, auto-scan due-user selection (toggle off→not due, on+stale→due,
  on+fresh→not due), trigger.dev worker processing runs.
  Findings it surfaced:
  - `OPENROUTER_MODEL` in `.env.local` was set to `google/gemini-flash-latest`,
    which OpenRouter rejects with `400 not a valid model ID` — so **all AI
    in the running app is currently failing** (Gemini fallback then 429s on
    free-tier quota). Valid values confirmed by direct API call:
    `google/gemini-2.5-flash` (the code default) and
    `google/gemini-2.5-flash-lite`. Fix is a one-line `.env.local` edit by
    the user; `verify-e2e` passes when run with that override.
  - The trigger.dev **dev** worker drops ~half its `evaluate` runs —
    `SYSTEM_FAILURE: COULD_NOT_FIND_EXECUTOR` (worker disconnects on
    laptop sleep / ping timeout) and `MAX_DURATION_EXCEEDED`. Environmental,
    not a code defect; a deployed worker does not have the executor problem.
    Mitigations already in place: `createPendingMatches` re-queues stale
    `RUNNING` matches, `reconcileStalledMatches` fails abandoned ones.
    `trigger/scan.ts` `maxDuration` raised 300 → 900 for the timeout cases.

- **Scan multi-source candidate selection & live evaluation feed auto-refresh.**
  - **Issue addressed:** Repeated scans were re-ingesting the exact same 10 postings from the first static portal, resulting in `0 new` jobs and no evaluations queued because matches already existed. Additionally, when a scan completed, `ScanButton` stopped polling before background evaluations finished, leaving the feed stuck until a hard refresh.
  - **Candidate selection:** `runScan` now inspects existing `Match` records for the user, excludes already-evaluated postings, and round-robins across all enabled sources (`GREENHOUSE`, `ASHBY`, `LEVER`, `JSEARCH`, `ADZUNA`, `SCRAPED`, `FIRECRAWL`) to select 10 fresh, diverse candidate postings on every scan.
  - **Live evaluation tracking:** `GET /api/scan-runs/[scanRunId]` now queries and returns real-time match evaluation tallies (`evaluationsPending`, `evaluationsCompleted`, `evaluationsFailed`). `ScanButton` continues polling through the evaluation phase, displaying `evaluating (X/10)…`, and automatically triggers `router.refresh()` as evaluations complete.
  - **Feed display:** `getFeedJobs` prioritizes actively evaluating (`PENDING` / `RUNNING`) matches so incoming jobs appear at the top immediately, and `FeedTable` auto-refreshes on a 1.5s interval while evaluations are active.
  - **RemoteOK & WeWorkRemotely high-volume safe sourcing:**
    - **WeWorkRemotely (`lib/sources/firecrawl.ts`):** Added native support for WeWorkRemotely's official public category RSS feeds (`remote-programming-jobs`, `remote-full-stack-programming-jobs`, `remote-front-end-programming-jobs`, `remote-back-end-programming-jobs`, `remote-devops-sysadmin-jobs`). Yields 140+ active remote developer postings per scan with full descriptions, zero quota cost, and zero risk of IP blocking since RSS is an open syndicated feed designed for machine consumption.
    - **RemoteOK (`lib/sources/scraper.ts`):** Added role/tech tag querying (e.g. `tag=software`, `tag=react`, `tag=dev`) against RemoteOK's official public JSON API, fetching 100+ fresh remote tech roles with polite user-agent headers, timeout guards, and rate-limit backoff.
    - Verified in live testing: 100 RemoteOK + 141 WeWorkRemotely jobs (241 total) extracted cleanly with 0 errors.

- **Full Application Redesign to Modern Bright SaaS / Developer Console Theme.**
  - **Design System Tokens (`app/globals.css`):** Completely replaced dark/mineral palette with a luminous, modern SaaS color system: `--color-bg-base: #f8fafc` (Slate-50), `--color-bg-surface: #ffffff` (Pure White), `--color-accent: #2563eb` (Electric Cobalt Blue), `--color-border-default: #e2e8f0` (Slate-200), `--color-text-primary: #0f172a` (Slate-900), and `--color-text-secondary: #475569` (Slate-600). Configured modern rounded geometry tokens (`rounded-lg`, `rounded-xl`, `rounded-full`).
  - **Core UI Primitives (`Button.tsx`, `Chip.tsx`, `StatusChip.tsx`, `ScoreMeter.tsx`):**
    - `Button.tsx`: Added `secondary` variant (`bg-blue-50 text-blue-700 hover:bg-blue-100`), standard rounded corners (`rounded-lg`), size scale (`xs`, `sm`, `md`, `lg`), and hover/focus transitions.
    - `Chip.tsx`: Replaced squared retro chips with modern pill toggles (`rounded-md`, active `bg-blue-600 text-white shadow-xs`).
    - `StatusChip.tsx`: Styled into soft rounded pill badges with high-contrast colored text and borders: Emerald for `APPLY` / `VERIFIED` / `PASS`, Blue for `CONSIDER`, Slate for `SKIP` / neutral, Amber for warnings, Rose for errors.
    - `ScoreMeter.tsx`: Discrete 10-segment meter with modern rounded segments (`rounded-xs`) and bright color mappings.
  - **Shell & Navigation (`Nav.tsx`, `StatusBar.tsx`):**
    - `Nav.tsx`: Clean pure white sidebar with crisp brand header (`Sparkles` icon, `v1.0 Console` badge), active item pill indicator (`bg-blue-50 text-blue-700 font-bold`), and user profile avatar bubble.
    - `StatusBar.tsx`: Clean top header bar with glanceable metrics counters (`Active Applications`, `Due Today`, `Overdue Follow-ups`).
  - **Job Feed (`FilterBar.tsx`, `FeedTable.tsx`, `FeedRow.tsx`):**
    - `FilterBar.tsx`: Modern search input with magnifying glass, rounded pill verdict filters, source selector, and active filter count badge.
    - `FeedTable.tsx`: White sticky header with crisp column titles, and smooth infinite scroll / load more controls.
    - `FeedRow.tsx`: High-contrast job row with company monogram avatar, bold role title, emerald `Remote` tag, clean source badge, and 1-click Apply button.
  - **Match Report Hub (`VerdictRail.tsx`, `DimensionBars.tsx`, `RequirementMap.tsx`, `LegitimacyPanel.tsx`, `ScoreExplainer.tsx`, `CvTips.tsx`, `StrengthList.tsx`, `GapList.tsx`, `MatchReportClient.tsx`):**
    - `VerdictRail.tsx`: White sticky sidebar with bold headline score card, 12px segment ScoreMeter, dimension weight bars, and bright CTA buttons.
    - `RequirementMap.tsx`: Clean white table with rounded status pills and soft rose danger highlight for capped requirements.
    - `DimensionBars.tsx`: Smooth blue/emerald progress bars with weights and expandable rationale drawers.
    - `LegitimacyPanel.tsx`: Clean white cards with shield check/alert badges across all 6 verification signals.
    - `ScoreExplainer.tsx`: Clean white card with structured breakdown table and amber/rose cap alert banners.
    - `CvTips.tsx`, `StrengthList.tsx`, `GapList.tsx`: Modern white cards with clean borders and vibrant badge highlights.
  - **Kanban Tracker Board (`Board.tsx`, `Column.tsx`, `Card.tsx`, `EventTimeline.tsx`):**
    - `Board.tsx`: Modern controls bar with search input, card counters, and segmented Active/All view toggle.
    - `Column.tsx`: Clean column containers with status pips, bold headers, and rounded card count badges.
    - `Card.tsx`: White rounded cards with company monograms, ScoreMeter chips, days-in-status indicators, and drag-and-drop elevation.
    - `EventTimeline.tsx`: Crisp timeline with blue bullet icons and event type badges.
  - **Scans Dashboard (`ScanRunList.tsx`):**
    - Clean white expandable cards with source breakdown statistics and status chips.
- **High-Fidelity "Luminous Console" Cinematic Landing Page (`app/page.tsx`).**
  - **Middleware public routing (`middleware.ts`):** Made `/` a public route alongside `/sign-in` and `/sign-up` so prospective candidates can explore the platform before logging in.
  - **Floating Island Navigation (`components/landing/LandingNavbar.tsx`):** Glassmorphism pill island with dynamic scroll morphing, live telemetry indicator (`2,400+ Verified Postings`), quick navigation anchors, and direct "Launch Console" CTA.
  - **Hero Section (`components/landing/LandingHero.tsx`):** High-impact typography, real-time live preview of an evaluated Job Feed row with animated 10-segment `ScoreMeter`, and direct portal syndication badges (Greenhouse, Lever, Ashby, RemoteOK, WeWorkRemotely).
  - **Features Artifacts (`components/landing/FeaturesArtifacts.tsx`):** 3 interactive functional micro-UIs:
    1. *Diagnostic Match Shuffler:* Overlapping cycling cards demonstrating deterministic 5D scoring (`Role Fit 30%`, `Skills 30%`, `Experience 20%`) with score cap enforcement.
    2. *Anti-Ghost Telemetry Feed:* Monospace terminal stream with a live typewriter effect displaying real-time scraping, ghost job filtering, and legitimacy checks.
    3. *Cursor Protocol & CV Tailor Simulator:* Grounded section rewriting simulator proving zero-hallucination evidence mapping.
  - **The Manifesto & Protocol (`PhilosophySection.tsx`, `ProtocolSection.tsx`):** Dark contrast manifesto comparing traditional spam boards against precision career dispatch, plus a 4-step pipeline architecture breakdown.
  - **Telemetry Footer (`LandingFooter.tsx`):** Live system status beacon, comprehensive platform navigation, and quick launch links.
  - **Verification:** `npx tsc --noEmit` and all unit test suites passing cleanly with 100% success.

## In Progress

- None.

## Next Up

The build order lives in `features/README.md`, one file per unit. Work
them in sequence — the ordering is deliberate and its rationale is in
that README.

| # | Feature | Status |
| - | ------- | ------ |
| 01 | [Project foundation](features/feature-01-project-foundation.md) | done |
| 02 | [UI foundation](features/feature-02-ui-foundation.md) | done |
| 03 | [Auth with Clerk](features/feature-03-auth-clerk.md) | done |
| 04 | [Data schema](features/feature-04-data-schema.md) | done |
| 05 | [Score meter](features/feature-05-score-meter.md) | done |
| 06 | [Job feed](features/feature-06-job-feed.md) | done |
| 07 | [Background jobs](features/feature-07-background-jobs.md) | done |
| 08 | [Resume upload](features/feature-08-resume-upload.md) | done |
| 09 | [Resume parser](features/feature-09-resume-parser.md) | done |
| 10 | [Preferences and onboarding](features/feature-10-preferences-onboarding.md) | done |
| 11 | [ATS board sources](features/feature-11-job-sources-ats.md) | done |
| 12 | [Job search APIs](features/feature-12-job-search-apis.md) | done |
| 13 | [Job scraper](features/feature-13-job-scraper.md) | done |
| 14 | [Scan orchestration](features/feature-14-scan-orchestration.md) | done |
| 15 | [Match evaluation](features/feature-15-match-evaluation.md) | done |
| 16 | [Match report](features/feature-16-match-report.md) | done |
| 17 | [Application tracker](features/feature-17-application-tracker.md) | done |
| 18 | [Follow-up email](features/feature-18-followup-email.md) | done |
| 19 | [CV tailoring](features/feature-19-cv-tailoring.md) | done |
| 20 | [Polish and deploy](features/feature-20-polish-deploy.md) | done (deploy pending) |

Update the status column as features land.

## Open Questions

- **Deployment has not happened.** Feature 20's verification list runs
  against the deployed URL with a fresh account, and that needs the
  user's Vercel, Clerk, and trigger.dev accounts. Everything on that list
  that can be verified locally has been.
- `.env.local` is missing `NEXT_PUBLIC_APP_URL` (documented in
  `env-reference.md`, default `http://localhost:3000`) and
  `CLERK_WEBHOOK_SIGNING_SECRET` (only needed once a public URL exists).
  `ANTHROPIC_API_KEY` is also absent, so the Claude fallback added in
  feature 20 is inert until a key is set — Gemini is carrying every call
  alone. `.env.local` is protected — the user edits it, not the agent.
- The trigger.dev worker has not been running: eight `ScanRun` rows sit
  in `QUEUED`/`RUNNING` and 15 `Match` rows in `PENDING` on the
  development database. This is not a bug — `lib/runs/reconcile.ts` fails
  them with an actionable message after 15 minutes — but no scan has ever
  completed through the task path. Run `npx trigger.dev@latest dev`
  alongside `npm run dev` to exercise it.
- **`ui-context.md` describes a different product** (a LOAM menswear
  storefront: product grids, wishlists, Razorpay). Its design system —
  the mineral/ink palette, DM Sans / DM Mono / Instrument Serif, square
  geometry, 44px targets — is implemented and is what the app looks like.
  Its layout sections are not, and cannot be. The file is protected and
  was left unchanged; `code-standards.md` and `feature-20` now name the
  real typefaces so the two do not contradict each other.
- Score thresholds (75 / 50) are a first guess. Revisit after unit 8,
  once a real distribution exists. career-ops's equivalent is stricter
  (80).
- Which ~20 companies go in `config/portals.yml`, and which ATS each one
  uses. Needs a pass through Greenhouse / Lever / Ashby board tokens.
- Whether the five terminal Kanban columns should collapse behind an
  "Archived" toggle. Decide when the board is real in unit 9.
- ~~Playwright's target site is unchosen.~~ **Resolved:** RemoteOK
  (`remoteok.com`). Cooperative target with a public JSON API, no login,
  no CAPTCHA, no commercial anti-bot wall. `robots.txt` permits automated
  access. The spec's guidance — "use the JSON endpoint when available" —
  applies directly. Not LinkedIn / Indeed / Naukri. See feature 13
  completion notes above.

## Architecture Decisions

Recorded with reasons so they are not relitigated.

- **trigger.dev for all background work, not a Postgres queue with Vercel
  Cron.** The queue design needed a task table, claim/lease logic, a
  reaper, budget-aware drain loops, and an inline `after()` kick — all
  because Vercel's Hobby plan runs cron *once per day*, which would leave
  scans pending for hours. trigger.dev supplies retries, idempotency,
  concurrency, and long execution natively. **Do not rebuild the queue
  table.**
- **Playwright runs as a trigger.dev task.** It cannot run on Vercel
  serverless. trigger.dev's official Playwright build extension installs
  the browser binaries into the task image. Pin Playwright to `1.57.0` —
  the extension breaks on 1.58+.
- **`claude-sonnet-5`, not `claude-sonnet-4-6`.** Sonnet 5 is newer and
  cheaper: $2/$10 per 1M tokens versus $3/$15. Strictly better on the
  price/quality basis the model was chosen for.
- **No blob storage.** The uploaded CV PDF is parsed on upload and
  discarded; only extracted text and structured JSON persist. Nothing
  downstream reads the binary, so keeping it would add a service and
  credentials for a file with no reader. Vercel Blob is the upgrade path
  if retention is ever needed.
- **All four job sources, with ATS boards as the default.** Greenhouse /
  Lever / Ashby are unauthenticated and unmetered, so the ingestion
  pipeline is provable before a metered call is spent, and they are the
  safety net if a paid tier is exhausted.
- **The model does not return the overall score.** It returns five
  dimension scores; the 0–100 headline is computed in
  `lib/evaluation/score.ts`. Removes model drift between runs and makes
  the score explicable in the report. See `evaluation-spec.md`.
- **career-ops's "inferred evidence never satisfies a critical
  requirement" is a TypeScript score cap, not a prompt instruction.** Pure
  functions, unit-testable without an API call.
- **`clerkId` is a unique column, not the primary key.** Every FK points
  at a cuid `id`, keeping the schema portable off Clerk.
- **`Match` rows are created at trigger time in `PENDING`.** Gives the
  feed a record to render progress against, and `@@unique([userId, jobId])`
  doubles as the idempotency guard against duplicate paid calls.
- **Prisma pinned to v6, not v7.** A bare `npm i prisma` now installs
  7.x, whose config model (`prisma.config.ts` datasource, mandatory
  `prisma-client` generator `output`) diverges from what the context
  files describe (schema `env()` datasource, `prisma-client-js`). v6
  matches the specs and has the mature Neon + Vercel story. Recorded in
  `features/feature-01-project-foundation.md`.
- **`dotenv-cli` wraps the Prisma CLI.** Vars live in `.env.local`
  (`env-reference.md`); Prisma's CLI only auto-loads `.env`. The
  `db:migrate` / `db:deploy` / `db:studio` scripts wrap Prisma in
  `dotenv -e .env.local`. The Next.js runtime already reads `.env.local`.
- **Batch API considered and declined.** It would halve evaluation cost
  and fits the latency profile, but adds a poll-a-batch-id state machine
  on top of trigger.dev for no demonstrable benefit here.

## Session Notes

- The design borrows from
  [career-ops](https://github.com/career-ops-hq/career-ops). Ported:
  `modes/oferta.md` → `evaluation-spec.md`, `modes/scan.md` →
  `job-sources.md`, `templates/states.yml` → `application-states.md`,
  `modes/pdf.md` + `modes/email.md` → `prompt-specs.md`. Simplified
  throughout — seven evaluation blocks to seven report blocks with three
  importance bands instead of five, and six legitimacy signals instead of
  fifteen.
- The product stance is inherited and load-bearing: **the system
  evaluates and recommends; the user decides and acts.** It never submits
  an application or sends an email. Several UI and data decisions follow
  from this.
- Two known production traps, both to verify on a real deploy rather than
  locally: `pdf-parse@1.1.1` needs `serverExternalPackages` plus a direct
  entry import to survive bundling (`unpdf` is the drop-in if it fights),
  and Neon needs the pooled URL for the app and the direct URL for
  migrations.
