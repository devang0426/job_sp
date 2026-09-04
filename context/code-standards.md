# Code Standards

## General

- Keep modules small and single-purpose. A file that needs "and" to
  describe it should be two files.
- Fix root causes. Do not layer a workaround over a bug you can see.
- Route handlers orchestrate; `lib/` holds logic. A handler that contains
  business rules is in the wrong place.
- No dead code, no commented-out blocks, no speculative abstraction for a
  second case that does not exist yet.

## TypeScript

- Strict mode throughout. It is already on in `tsconfig.json`; do not
  relax it.
- **No `any`.** Use `unknown` at boundaries and narrow. If a type is
  genuinely unknowable, that is a validation problem, not a typing one.
- Validate every piece of external input at the boundary before trusting
  it: Claude responses, job API payloads, request bodies, webhook bodies.
- Use inferred types from Zod schemas (`z.infer`) rather than declaring a
  parallel interface that can drift.
- Prefer `as const` arrays plus `(typeof X)[number]` over hand-written
  string unions that duplicate a runtime list.

## Next.js

- **Server components by default.** Add `"use client"` only where browser
  interactivity actually requires it, and push it as far down the tree as
  possible — a client boundary at the page level pulls everything in with
  it.
- Route handlers run in one order, always: **auth → parse → logic**.
  Ownership is checked before any mutation.
- Any handler touching `pdf-parse` or Prisma sets
  `export const runtime = "nodejs"`. Edge will not run either.
- One handler, one responsibility. A handler that both triggers a task
  and returns a computed list is two handlers.
- Handlers that trigger background work return immediately with the
  record id. They never await the work. See the three-tier flow in
  `architecture.md`.

## API Routes

- One response envelope, from `lib/api.ts`:

  ```ts
  { data: T }                                   // 2xx
  { error: { code: string, message: string } }  // 4xx / 5xx
  ```

- `code` is machine-readable and stable: `UNAUTHORIZED`, `NOT_FOUND`,
  `VALIDATION_FAILED`, `RATE_LIMITED`, `PDF_UNREADABLE`,
  `NO_ACTIVE_RESUME`, `QUOTA_EXCEEDED`.
- `message` is shown to the user, so it follows the copy rules in
  `ui-context.md`: say what happened and what to do, no apologies, no
  vagueness.
- Request body schemas live in `lib/validation/`, one file per resource,
  separate from the evaluation contract in `lib/evaluation/schema.ts`.
- External API calls return a typed result rather than throwing. A source
  adapter failing must be a value the scan can record, not an exception
  that aborts the run.

## Styling

- **Use the CSS custom property tokens from `ui-context.md`. No hardcoded
  hex values anywhere.** This is invariant 8 in `architecture.md` and it
  is checkable by grepping the diff for `#`.
- Border radius is `0` everywhere. `ui-context.md` §5 is explicit: square
  geometry across all controls, inputs, cards, and modals. The radius
  tokens exist and resolve to `0px`; nothing sets a radius of its own.
- Three fonts, three jobs, no overlap. DM Sans for prose and UI, DM Mono
  with `tabular-nums` for every value the system computed and for
  uppercase metadata labels (the `.eyebrow` helper), Instrument Serif for
  editorial headlines only (the `.display` and `.serif` helpers).
- Transitions are 120ms, on hover and focus only. The one exception is
  the score meter's staggered fill, which runs once per result.
- Every animation respects `prefers-reduced-motion: reduce`.
- Icons never carry meaning alone. Pair every state-communicating icon
  with a text label.

## Data and Storage

- All persistent state is in Postgres. There is no blob storage.
- Prisma access is confined to `lib/db/`. Components and handlers call
  functions there; they do not import the client and build queries
  inline.
- The Prisma client is a singleton on `globalThis` (`lib/db.ts`).
- Every query is scoped by `userId`. A query without a user scope is a
  data leak waiting for a second user.
- Status changes go through `lib/tracker/transition.ts`. Nothing else
  writes `Application.status`.
- Do not store large generated content outside the columns designed for
  it. Do not add a new JSON blob column without a reason.

## AI Calls

- Prompt text lives only in `lib/ai/prompts/`. See `prompt-specs.md`.
- Bump a prompt's `VERSION` on any text change, and persist it with the
  result.
- Structured results use `client.messages.parse()` with
  `zodOutputFormat()`. Re-validate the parsed output before persisting —
  `parsed_output` can be `null`.
- Record token counts and computed cost on every row an AI call produces.

## File Organization

- `app/` — routes, pages, and API handlers.
- `app/(console)/` — the authenticated shell and everything inside it.
- `components/ui/` — primitives only: Button, Chip, Field, Modal,
  EmptyState, Skeleton, StatusChip. No business logic.
- `components/meter/` — the score meter and its stagger hook.
- `components/shell/` `feed/` `report/` `tracker/` `editor/` — one folder
  per surface.
- `lib/sources/` — adapters, `normalize.ts`, `dedupe.ts`, `filter.ts`.
- `lib/ai/` — `client.ts`, `cost.ts`, `prompts/`, one file per call.
- `lib/evaluation/` — `schema.ts`, `score.ts`, `types.ts`. `score.ts` is
  pure and unit-tested.
- `lib/tracker/` — `states.ts`, `transition.ts`.
- `lib/validation/` — request body schemas.
- `trigger/` — task definitions. Tasks call into `lib/`; they own no
  logic.
- `prisma/` — `schema.prisma`, `migrations/`, `seed.ts`.
- `config/` — checked-in data such as `portals.yml`.

## Naming

- A `Job` is a scraped posting. Background work is a trigger.dev **run**.
  Never overload the word.
- Name things the way the user thinks about them, in code as well as in
  copy: `savedJobs`, not `trackedEntities`.
