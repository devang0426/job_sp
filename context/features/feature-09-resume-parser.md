# Feature 09 — Resume parser

**Depends on:** 07, 08
**Status:** not started

## Goal

Turn the extracted CV text into structured skills, experience, and
education. The first Claude call in the system, and the one to make the
mistakes on.

## In scope

- `lib/ai/client.ts` — the Anthropic singleton and model constants.
- `lib/ai/cost.ts` — usage to dollars.
- `lib/ai/prompts/structureResume.ts`.
- The structuring task, triggered after upload.
- `POST /api/resumes/[id]/structure` — re-run.
- Rendering the structured result in the UI.

## Out of scope

- Match evaluation — feature 15.
- CV rewriting — feature 19.

## Implementation

### The AI client

`lib/ai/client.ts` holds the Anthropic singleton, the model constant
(`claude-sonnet-5`), and the per-model token rates used by `cost.ts`.
Every AI call in the codebase goes through it. Set the model in one
place; never inline a model string at a call site.

### The prompt

`lib/ai/prompts/structureResume.ts`, exporting exactly three things per
`../prompt-specs.md`:

```ts
export const VERSION = "resume@1";
export const SYSTEM = `...`;                    // no interpolation, ever
export function buildUser(rawText: string): string { ... }
```

Ask for: skills as a flat deduplicated array of canonical names; roles
with company, title, start, end, and a one-line scope summary; education
with institution, qualification, and year; total years of relevant
experience as a number, **or null when it cannot be determined
honestly**.

**The instruction that matters: extract only what the CV states.** No
inference, no gap-filling, no generous rounding of dates. A parser that
invents a skill poisons every evaluation that reads the result.

### Structured output

Use `client.messages.parse()` with `zodOutputFormat(ResumeProfileSchema)`
in `output_config.format`. Do not ask for JSON in prose and parse the
reply.

`response.parsed_output` can be `null` when parsing fails — guard it,
then `safeParse()` again before persisting.

### Asynchronous, not blocking

Triggered as a task after upload. The user is not blocked on it.

`Resume.rawText` is what feeds match evaluation, so a failure here
degrades the UI (no skill chips) without breaking matching. Record the
failure on the row; do not retry forever.

### Cost accounting

Record `model`, `promptVersion`, token counts, and computed `costUsd`
on the result. This is the pattern every later AI feature repeats — build
it properly once.

## Files

- `lib/ai/client.ts`
- `lib/ai/cost.ts`
- `lib/ai/prompts/structureResume.ts`
- `lib/ai/structureResume.ts`
- `trigger/structureResume.ts`
- `app/api/resumes/[resumeId]/structure/route.ts`
- `components/editor/ResumeProfile.tsx`

## Verification

1. Uploading a CV triggers structuring; the result appears without a page
   reload.
2. The extracted skills are actually in the CV. **Read them against the
   source** — this is the check that catches an over-eager prompt.
3. A CV with no clear total experience returns `null` for it rather than
   a guess.
4. `costUsd` and `promptVersion` are populated on the row.
5. A deliberately malformed response path is handled — the resume stays
   usable for matching with `structured` null.
6. Re-running structuring on the same resume overwrites rather than
   duplicating.
7. `npm run build` passes.

## Notes

- Step 2 is the whole feature. A parser that quietly adds "Kubernetes"
  because the CV mentions Docker will produce confident, wrong match
  scores for the rest of the project's life.
- Bump `VERSION` on any prompt text change. It is persisted with every
  result, and it is what makes "these results look different" an
  answerable question.
