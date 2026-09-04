# AI Workflow Rules

## Approach

Build this project incrementally, one unit at a time, against the context
files. They define what to build (`project-overview.md`), how the system
is shaped (`architecture.md`, `data-model.md`), how it looks
(`ui-context.md`), how the AI reasoning works (`evaluation-spec.md`,
`prompt-specs.md`), where data comes from (`job-sources.md`), and how it
is written (`code-standards.md`).

**Implement against these specs. Do not infer or invent behavior from
scratch.** If the spec is wrong, fix the spec first, then implement.

**`features/` holds one file per implementable unit, numbered in build
order.** Before implementing anything, read the feature file for the unit
you are building — it carries the goal, explicit in/out scope, an
implementation outline, the files it touches, and a verification step.
Start at `features/README.md`.

Work the features in sequence. The ordering is deliberate, not
arbitrary. Two choices in particular:

- The score meter and feed land on **seeded data**, before any external
  API exists. The visual payoff arrives early and does not depend on a
  quota.
- trigger.dev is proven end to end with a trivial task **before** anything
  expensive rides on it.

## Scoping Rules

- Work on one unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single step.

## When to Split Work

Split an implementation step if it combines:

- A UI surface and a background task.
- More than one unrelated API route.
- A schema migration and the feature that consumes it, when the migration
  is large enough to review on its own.
- A new external source adapter and a change to the shared normalization
  or dedup logic.
- Any behavior not clearly defined in the context files.

If a change cannot be verified end to end quickly, the scope is too
broad. Split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context
  files.
- If a requirement is ambiguous, resolve it in the relevant context file
  before implementing.
- If a requirement is missing, add it as an open question in
  `progress-tracker.md` before continuing.

## Protected Files

Do not modify these unless explicitly instructed:

- `context/ui-context.md` — the design system, authored by the user.
- `prisma/migrations/` — never edit an applied migration. Write a new
  one.
- `.env` / `.env.local` — never read, write, or print secret values.
  `context/env-reference.md` documents the variable names.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture, boundaries, or the three-tier flow →
  `architecture.md`
- Schema, relations, or the dedup recipe → `data-model.md`
- Scoring dimensions, weights, thresholds, or caps →
  `evaluation-spec.md`
- Source adapters, normalization, or quota handling → `job-sources.md`
- Prompt structure or output contracts → `prompt-specs.md`
- Statuses or transition rules → `application-states.md`
- Conventions → `code-standards.md`
- Feature scope → `project-overview.md`
- A new environment variable → `env-reference.md`
- Scope or approach for a unit → its file in `features/`

A feature file is a living spec, not a ticket. If implementation reveals
that its scope or approach was wrong, fix the file before continuing —
the next session reads it, not this conversation.

Update `progress-tracker.md` after **every** meaningful change, not just
at the end of a unit.

## Before Moving to the Next Unit

1. The unit works end to end within its defined scope — demonstrated, not
   assumed.
2. No invariant in `architecture.md` was violated.
3. No hardcoded hex values entered the diff.
4. `progress-tracker.md` reflects the completed work.
5. `npm run build` passes.

Report results honestly. If a step was skipped or a check failed, say so
plainly with the output. A unit reported complete is a unit someone will
build on.
