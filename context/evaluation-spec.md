# Evaluation Spec

How a job posting is scored against a CV. Ported from career-ops's
`modes/oferta.md`, simplified from seven evaluation blocks and a
fifteen-signal legitimacy screen to what this product can render and
defend.

This is the heart of the assignment. It is the file that most repays
getting right.

## The core decision: the model does not return the score

Claude returns five dimension scores plus structured findings. **The
0–100 headline is computed in `lib/evaluation/score.ts`** as a weighted
mean, then adjusted by deterministic caps.

Two reasons:

1. It removes model drift. Asking a model for a single holistic number
   produces a different number on a re-run of the same inputs. Asking for
   five bounded, individually-justified numbers and combining them in
   code is stable.
2. It makes the score explicable. The match report can show *how this
   number was computed* — the dimension bars, the weights, and any cap
   that fired — which is far more convincing than a number the model
   asserted.

Claude *does* return its own `modelRecommendation`. It is stored alongside
the derived one and never used for display or filtering. It exists so
that a later calibration screen can compare the model's judgment against
the computed one.

## Score scale

**0–100.** Ten segments of ten points each, which is exactly what
`ui-context.md`'s signature meter renders.

| Band  | Score  | Recommendation | Token                |
| ----- | ------ | -------------- | -------------------- |
| Apply | ≥ 75   | `APPLY`        | `--verdict-apply`    |
| Consider | 50–74 | `CONSIDER`  | `--verdict-consider` |
| Skip  | < 50   | `SKIP`         | `--verdict-skip`     |

Three bands, three verdict colors, one chip. There is no fourth state to
design.

These thresholds live as named constants in `lib/evaluation/score.ts`,
not as scattered literals. Expect to tune them once you see a real score
distribution — career-ops recommends against applying below 4.0/5, which
would be 80 here; 75 is chosen to give a demo a usable spread of
verdicts.

### Meter mapping

```ts
const filled = score === 0 ? 0 : Math.max(1, Math.round(score / 10)); // 1..10
```

The `Math.max(1, …)` matters. A score of 4 must show one lit segment. An
empty meter reads as "not evaluated", which is a different state
entirely.

The meter is colored **entirely by recommendation**, never by segment
position. Color means judgment; a gradient across segments would make it
decoration.

## The five dimensions

Each scored 0–100 by the model, each with a one-or-two sentence rationale
shown under its bar in the verdict rail.

| Dimension         | Weight | Answers                                              |
| ----------------- | ------ | ---------------------------------------------------- |
| `roleFit`         | 0.30   | Has this person done *this job*, at roughly this level? |
| `skillsMatch`     | 0.30   | Do the required hard skills appear, with evidence?   |
| `experienceDepth` | 0.20   | Enough years, scope, and ownership for the band?     |
| `domainContext`   | 0.10   | Industry, product area, company-stage familiarity    |
| `logistics`       | 0.10   | Location, remote policy, work authorization, salary  |

`roleFit` and `skillsMatch` carry 60% between them because that is what a
human recruiter screens on first.

`logistics` is only 10% by weight but carries a hard cap (below). A
posting the user cannot legally or practically take should not be rescued
by a strong average — but neither should a minor location mismatch
dominate a genuinely good fit. Low weight plus a hard floor gets both.

## Importance bands and evidence tiers

Every requirement extracted from the job description is tagged twice.

**Importance** — `critical` · `important` · `nice_to_have`

career-ops uses five bands (`critical / high / meaningful / preferred /
low_signal`). Cut to three here. Only `critical` has mechanical
consequence, and asking a model to reliably separate "meaningful" from
"preferred" produces noise that then has to be rendered.

**Evidence** — `stated` · `structural` · `inferred` · `none`

- `stated` — the CV says it, explicitly.
- `structural` — implied by a role title, employer, or tenure without
  being spelled out.
- `inferred` — plausible from adjacency, but not actually claimed.
- `none` — no support at all.

`none` is added to career-ops's three tiers on purpose. A schema with no
null option forces the model to invent an evidence claim to fill the
field, which is precisely the failure the tiers exist to prevent.

## The cap rules

career-ops's central discipline is *inferred evidence never satisfies a
critical requirement*. **Here that is enforced in TypeScript, not in the
prompt.**

```ts
// lib/evaluation/score.ts
const W = {
  roleFit: 0.30, skillsMatch: 0.30, experienceDepth: 0.20,
  domainContext: 0.10, logistics: 0.10,
};

let score = Math.round(sum(dimensions[k].score * W[k]));
let cap: string | null = null;

const criticalGaps = requirements.filter(
  r => r.importance === "critical" &&
       (r.evidence === "inferred" || r.evidence === "none")
).length;

if (criticalGaps === 1)  { score = Math.min(score, 59); cap = "critical_gap_x1"; }
if (criticalGaps >= 2)   { score = Math.min(score, 39); cap = "critical_gap_x2"; }
if (dimensions.logistics.score < 30) { score = Math.min(score, 49); cap = "logistics"; }

let recommendation =
  score >= 75 ? "APPLY" : score >= 50 ? "CONSIDER" : "SKIP";

// career-ops never sends a human at a suspicious posting
if (legitimacy.tier === "suspicious") recommendation = "SKIP";
```

One unmet critical requirement drops the job out of `APPLY`. Two drop it
to `SKIP`.

These are pure functions over the model's output. They are unit-testable
without an API call, and they are what stops the model talking itself
into a high score on evidence it invented. `scoreCapApplied` is persisted
and shown in the report, so a capped score explains itself.

## Legitimacy screen

career-ops screens fifteen signals. Cut to **six that a scraped posting
can actually support**, each reported by the model as pass / unclear /
fail:

1. Named hiring company — not a blind agency listing.
2. Salary band disclosed.
3. Apply URL on a company domain or a known ATS host.
4. No pay-to-work or upfront-cost language.
5. Requirement list is realistic rather than an impossible stack.
6. Posting age is identifiable.

The model derives a tier from those signals:
`verified` · `likely_legitimate` · `unverified` · `suspicious`.

`suspicious` forces a `SKIP` regardless of score. The tier appears in the
match report's verdict rail.

## Report blocks

The scrolling right pane of the match report, cut from career-ops's seven
blocks:

1. **Role summary** — what this job actually is.
2. **Requirement → evidence map** — the table above. The heart of the
   report.
3. **Strengths** — where the CV is genuinely strong for this role.
4. **Gaps** — what is missing, with severity.
5. **CV improvement tips** — concrete edits, each tied to a requirement.
6. **Legitimacy screen** — the six signals and the tier.
7. **Verdict** — score, cap reason if any, and the reasoning.

## The JSON contract

`lib/evaluation/schema.ts` is the single source of truth. It is passed to
`zodOutputFormat(EvaluationSchema)` inside `output_config.format` on
`client.messages.parse()`, so the API constrains generation, and
`z.infer` gives the UI its types.

```ts
import { z } from "zod";

export const IMPORTANCE = ["critical", "important", "nice_to_have"] as const;
export const EVIDENCE = ["stated", "structural", "inferred", "none"] as const;

const Dimension = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string(),
});

const RequirementFinding = z.object({
  requirement: z.string(),
  importance: z.enum(IMPORTANCE),
  evidence: z.enum(EVIDENCE),
  note: z.string(),
});

export const EvaluationSchema = z.object({
  summary: z.string(),

  dimensions: z.object({
    roleFit: Dimension,
    skillsMatch: Dimension,
    experienceDepth: Dimension,
    domainContext: Dimension,
    logistics: Dimension,
  }),

  requirements: z.array(RequirementFinding),

  strengths: z.array(z.object({
    title: z.string(),
    detail: z.string(),
  })),

  gaps: z.array(z.object({
    title: z.string(),
    detail: z.string(),
    severity: z.enum(["blocking", "significant", "minor"]),
  })),

  cvTips: z.array(z.object({
    targetSection: z.string(),  // "Experience > Acme Corp" | "Skills"
    change: z.string(),         // the concrete edit
    reason: z.string(),         // which requirement it answers
  })),

  legitimacy: z.object({
    tier: z.enum(["verified", "likely_legitimate", "unverified", "suspicious"]),
    signals: z.array(z.object({
      signal: z.string(),
      verdict: z.enum(["pass", "unclear", "fail"]),
    })),
  }),

  modelRecommendation: z.enum(["apply", "consider", "skip"]),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
```

## Validation rules

**Validate after parsing, always.** `response.parsed_output` can be
`null` when parsing fails — guard it, then run `EvaluationSchema.safeParse()`
again before persisting. Constrained generation is not a reason to skip a
validation step. Invariant 4 in `architecture.md` says a `Match` is never
written without one.

**The JSON Schema subset drops Zod refinements.** `.refine()`,
`.superRefine()`, and cross-field rules never reach the model. Array
`.min()` / `.max()` and string `.max()` are advisory at best. So:

- Put count and length hints in the **prompt text** — "4 to 10
  requirements, most important first", "keep each quote under 125
  characters".
- Enforce hard rules in `score.ts`.
- **Truncate over-long arrays server-side rather than rejecting** the
  whole response. A schema violation on a $0.02 call should not throw
  away a usable evaluation.

**Shapes to avoid** in the schema: `z.union` of objects, `z.record`, and
`.optional()` on deeply nested fields. Prefer required fields with
explicit empty values.

## Where validation lives

Three distinct jobs, three homes:

| Concern | Location |
| --- | --- |
| The Claude output contract | `lib/evaluation/schema.ts` |
| Re-validation before persist | the evaluation task, using the same schema |
| Request body schemas | `lib/validation/*.ts` — separate directory, separate concern |
