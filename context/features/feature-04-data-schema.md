# Feature 04 — Data schema

**Depends on:** 01, 03
**Status:** not started

## Goal

Every model and enum from `../data-model.md`, in one migration, plus a
seed that produces enough realistic data to build the feed and the report
against before any external API exists.

## In scope

- The full Prisma schema: `User`, `Preferences`, `Resume`, `Job`,
  `Match`, `Application`, `ApplicationEvent`, `Artifact`, `ScanRun`, and
  all enums.
- `lib/sources/dedupe.ts` — the dedup key function, with unit tests.
- `lib/tracker/states.ts` — status order and the terminal set.
- `prisma/seed.ts`.

## Out of scope

- Any query layer beyond what the seed needs. Query functions arrive with
  the features that consume them.

## Implementation

### The schema

Transcribe `../data-model.md`. It is the specification; do not improvise
field names or types.

Points that are easy to get wrong and expensive to fix:

- **Every `Match` result field is nullable.** The row is created at
  trigger time in `PENDING` with no scores. See the three-tier flow in
  `../architecture.md`.
- **`Job` carries two unique constraints**: `dedupeKey` and
  `[source, sourceId]`. Both are intentional. `../data-model.md`
  explains why they do not conflict.
- **Dimension sub-scores are five real `Int` columns**, not a JSON blob.
  The feed sorts and filters on them.
- **`ApplicationStatus` declaration order is the Kanban column order.**
  Do not reorder it alphabetically.

### The dedup function

`lib/sources/dedupe.ts` implements the recipe in `../data-model.md`
exactly: normalize, strip corporate suffixes, keep seniority tokens in
the title, take the city before the first comma, sha256 the three parts.

Write unit tests for it now, in this feature, while the rules are fresh:

- `"Acme Inc."` and `"Acme"` produce the same company key.
- `"Senior Engineer"` and `"Engineer"` produce **different** keys —
  seniority is meaningful and must not be stripped.
- `"Bengaluru, KA"` and `"Bengaluru"` produce the same location key.
- A remote posting with no city keys as `remote`.

### The seed

`prisma/seed.ts`, idempotent — upsert on stable ids so re-running does
not duplicate.

- 10 `Job` rows with realistic titles, companies, locations, salary
  bands, and full description text. Mix sources so the feed's source
  filter has something to filter.
- 10 `Match` rows for a dev user, **spanning all three verdict bands** —
  some ≥75, some 50–74, some <50. Include at least one with
  `scoreCapApplied` set, and one still `PENDING` so the feed's progress
  state is buildable.
- Realistic dimension sub-scores, strengths, gaps, and tips, so features
  06 and 16 render against data that looks like the real thing.

Add `"seed": "tsx prisma/seed.ts"` to `package.json` and the Prisma seed
config.

## Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/sources/dedupe.ts`
- `lib/sources/dedupe.test.ts`
- `lib/tracker/states.ts`
- `package.json`

## Verification

1. `npx prisma migrate dev --name full_schema` applies cleanly.
2. `npx prisma studio` shows every table and the relations between them.
3. `npm run seed` twice in a row produces the same row counts. If the
   second run duplicates anything, it is not idempotent.
4. The seeded matches span all three verdict bands — confirm by eye in
   Studio.
5. Dedup unit tests pass, including the seniority case.
6. `npm run build` passes.

## Notes

- The seed is not throwaway. Features 05, 06, and 16 are built entirely
  against it, and it stays useful afterwards for testing UI states that
  are awkward to produce with real data — a failed match, a capped score,
  a pending evaluation.
- Never edit an applied migration. Write a new one.
