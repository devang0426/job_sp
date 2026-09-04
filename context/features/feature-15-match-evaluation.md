# Feature 15 — Match evaluation

**Depends on:** 07, 09, 14
**Status:** complete

## Goal

Claude reads a CV against a job description and returns a structured
evaluation. The application computes the score. This is the heart of the
assignment.

`../evaluation-spec.md` is the specification for this feature. Read it in
full before starting.

## In scope

- `lib/evaluation/schema.ts` — the Zod contract.
- `lib/evaluation/score.ts` — weights, caps, thresholds. Completed here.
- `lib/ai/prompts/evaluate.ts`.
- `trigger/evaluate.ts`.
- `POST /api/jobs/[jobId]/evaluate` and the batch route.
- Prompt caching and cost accounting.

## Out of scope

- The report UI — feature 16.

## Implementation

### The model does not return the score

Claude returns five dimension scores and structured findings. **The
0–100 headline is computed in `lib/evaluation/score.ts`.**

Two reasons, both worth remembering when this feels like extra work:
it removes model drift between runs of identical inputs, and it lets the
report show *how* the number was computed — which is far more convincing
than a number the model asserted.

Claude's own `modelRecommendation` is stored but never displayed or
filtered on. It exists for later calibration.

### The scoring function

Pure, and unit-tested before it is wired to anything:

```ts
const W = { roleFit: .30, skillsMatch: .30, experienceDepth: .20,
            domainContext: .10, logistics: .10 };

let score = Math.round(sum(dims[k].score * W[k]));

const criticalGaps = requirements.filter(
  r => r.importance === "critical" &&
       (r.evidence === "inferred" || r.evidence === "none")
).length;

if (criticalGaps === 1) { score = Math.min(score, 59); cap = "critical_gap_x1"; }
if (criticalGaps >= 2)  { score = Math.min(score, 39); cap = "critical_gap_x2"; }
if (dims.logistics.score < 30) { score = Math.min(score, 49); cap = "logistics"; }

let recommendation = score >= 75 ? "APPLY" : score >= 50 ? "CONSIDER" : "SKIP";
if (legitimacy.tier === "suspicious") recommendation = "SKIP";
```

**This is career-ops's central discipline, enforced in TypeScript rather
than in the prompt.** "Inferred evidence never satisfies a critical
requirement" is a cap, not an instruction — which means it cannot be
talked around by a confident model.

Test every boundary: 74/75, 49/50, one critical gap, two critical gaps,
logistics at 29 and 30, suspicious legitimacy overriding a score of 90.

### Structured output

`client.messages.parse()` with `zodOutputFormat(EvaluationSchema)` in
`output_config.format`.

**The JSON Schema subset drops Zod refinements.** `.refine()`,
cross-field rules, and array `.min()/.max()` never reach the model. So
put count hints in the prompt text ("4 to 10 requirements, most important
first") and **truncate over-long arrays server-side rather than rejecting
a usable response.** Throwing away a $0.02 evaluation over an eleventh
array item is the wrong trade.

`parsed_output` can be `null`. Guard it, then `safeParse()` again before
persisting — invariant 4.

### Prompt caching

Assemble the request in exactly this order:

```
system:   SYSTEM (the rules — stable across every user)
          + CV text                      <-- cache breakpoint
messages: the job description
```

In a scan the CV is identical across all 40 evaluations and only the JD
varies. Cached reads cost ~10% of input price.

**The prefix must be byte-identical.** No timestamps, no job ids, no
per-job interpolation before the breakpoint. Caching is a prefix match —
one changed byte invalidates everything after it.

Truncate the JD to ~12,000 characters before sending. Store the full
text.

### Idempotency

Two guards, both needed:

- `Match`'s `@@unique([userId, jobId])` — the row already exists in
  `PENDING`, so a second request updates rather than inserts.
- trigger.dev's `idempotencyKey`, set to
  `eval:{userId}:{jobId}:{resumeId}`.

### Fan-out contract from the scan (feature 14, already built)

The scan orchestrator creates the `PENDING` `Match` rows and then calls
`tasks.batchTrigger("evaluate", …)`. So `trigger/evaluate.ts` **must**
register with id `"evaluate"` and accept payload
`{ userId: string; jobId: string; resumeId: string }`. The scan passes
`idempotencyKey: eval:{userId}:{jobId}:{resumeId}` per item. Until this
task exists the scan's batch call fails softly (run marked `PARTIAL`,
matches left `PENDING`).

Together these mean a double-click cannot fire two paid calls.
`?force=1` allows a deliberate re-run.

## Files

- `lib/evaluation/schema.ts`
- `lib/evaluation/score.ts`
- `lib/evaluation/score.test.ts`
- `lib/ai/prompts/evaluate.ts`
- `lib/ai/evaluate.ts`
- `trigger/evaluate.ts`
- `app/api/jobs/[jobId]/evaluate/route.ts`
- `app/api/matches/evaluate-batch/route.ts`

## Verification

1. `score.ts` unit tests pass on every boundary listed above. **Do this
   before spending a single API call.**
2. One job evaluates end to end in under 20 seconds.
3. `costUsd`, `promptVersion`, and token counts are populated.
4. **`usage.cache_read_input_tokens` is non-zero on the second and later
   evaluations of a scan.** If it is zero across a whole scan, something
   is invalidating the prefix — find it now, not after a month of full-
   price calls.
5. A deliberately mismatched CV and job produce a `SKIP` with
   `scoreCapApplied` set, not a middling score.
6. A well-matched pair produces an `APPLY` whose named strengths are
   genuinely in the CV.
7. Requirements carry a spread of evidence tiers, including `none`. A
   result where everything is `stated` means the model is being
   agreeable, not accurate.
8. Double-clicking Evaluate produces one run and one charge.
9. A 40-job scan completes and the total cost is roughly $0.85 or less.
10. `npm run build` passes.

## Notes

- Steps 1 and 4 are where the money is. Testing scoring logic costs
  nothing; verifying the cache before a full scan is the difference
  between $0.40 and $0.85 per scan for the rest of the project.
- Step 7 is the quality check that matters. A model that never says
  `none` is not evaluating, it is agreeing — revise the prompt to say
  explicitly that `none` is an expected and useful answer.
- Bump `VERSION` on any prompt change. It is persisted on every `Match`.
