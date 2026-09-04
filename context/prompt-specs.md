# Prompt Specs

Four Claude calls. Ported in part from career-ops's `modes/pdf.md` and
`modes/email.md`.

## Where prompts live

**All prompt text lives in `lib/ai/prompts/*.ts` and nowhere else.** Never
in a route handler, never in a trigger.dev task, never in a component.

Each prompt file exports exactly three things:

```ts
export const VERSION = "eval@1";           // bump on ANY text change
export const SYSTEM = `...`;               // stable, never interpolated
export function buildUser(input: Input): string { ... }   // the volatile part
```

`SYSTEM` must be a constant with no interpolation at all — no dates, no
ids, no user values. This is what makes prompt caching possible; see
below.

`VERSION` is persisted to every `Match` and `Artifact` that the prompt
produces. It is what makes "the scores changed last week" an answerable
question rather than a mystery.

## Model

`claude-sonnet-5` for all four calls. Set once in `lib/ai/client.ts`
alongside the pricing constants used by `lib/ai/cost.ts`.

Use `client.messages.parse()` with `zodOutputFormat(Schema)` in
`output_config.format` for any call with a structured result. Do not ask
for JSON in prose and parse the reply.

---

## 1. CV parse

`lib/ai/prompts/structureResume.ts`

**Input** — the resume's `rawText`.
**Output** — structured skills, experience, and education JSON, stored on
`Resume.structured`.

Runs asynchronously after upload; the user is not blocked on it. The
`rawText` is what feeds match evaluation, so a failure here degrades the
UI (no parsed skills chips) without breaking matching.

Ask for: skills as a flat deduplicated array of canonical names; roles
with company, title, start, end, and a one-line scope summary; education
with institution, qualification, and year; total years of relevant
experience as a number, or null if it cannot be determined honestly.

The instruction that matters: **extract only what the CV states.** No
inference, no filling gaps, no generous rounding of dates. A parser that
invents a skill poisons every downstream evaluation.

---

## 2. Match evaluation

`lib/ai/prompts/evaluate.ts` — the important one.

**Input** — CV text, plus job description, title, company, location, and
salary band.
**Output** — the `EvaluationSchema` contract defined in full in
`evaluation-spec.md`.

### Request ordering, for caching

The message must be assembled in exactly this order:

```
system:   SYSTEM (the rules — stable across every user)
          + CV text                    <-- cache breakpoint here
messages: the job description
```

In a scan, the CV is identical across all 40 evaluations and only the JD
varies. With the breakpoint after the CV, cached reads cost about 10% of
input price — removing roughly half the input cost of a scan. All of a
scan's calls land inside the 5-minute cache TTL when triggered together.

**The prefix must be byte-identical.** No timestamps, no job ids, no
per-job interpolation before the breakpoint. Caching is a prefix match:
one changed byte invalidates everything after it.

Verify it works by reading `usage.cache_read_input_tokens`. If it is zero
across a scan, something is silently invalidating the prefix. Note the
minimum cacheable prefix is model-dependent (512–4096 tokens); the system
prompt plus a CV should clear it, but a very short CV may not cache at
all.

### What the prompt must state

- The five dimensions and what each one means. Score each 0–100 with a
  short rationale.
- **Do not produce an overall score.** It is computed downstream.
- Extract 4 to 10 requirements from the JD, most important first. Tag
  each with an importance band and an evidence tier.
- The evidence tiers and what separates them — particularly that
  `inferred` means plausible-by-adjacency and `none` means no support.
  Say explicitly that `none` is an expected and useful answer, not a
  failure to try.
- Quote discipline, from career-ops: quotes from the JD or CV go in
  quotation marks and stay under 125 characters.
- The six legitimacy signals and the four tiers.
- CV tips must name a target section and a concrete edit, and each must
  cite the requirement it answers. A tip with no requirement behind it is
  filler.

### Count and length rules

Array bounds and string lengths in the Zod schema are advisory — the
JSON Schema subset drops refinements. So state counts in the prompt text
("4 to 10 requirements", "at most 5 CV tips") and truncate over-long
arrays server-side rather than rejecting a usable $0.02 response.

---

## 3. CV tailoring

`lib/ai/prompts/tailorCv.ts` — ported from career-ops's `modes/pdf.md`,
minus the PDF.

**Input** — CV text, the job description, and the gaps and CV tips from
the existing `Match`.
**Output** — rewritten section text and keyword guidance, stored as an
`Artifact` with `kind: CV_VARIANT`.

career-ops generates an ATS-optimized PDF. We do not render documents.
This produces editable text and guidance; the user takes it into their
own CV.

The prompt reuses the match's gaps rather than re-deriving them — the
evaluation already did that work and paying for it twice would also risk
the two disagreeing.

Rules to state:

- Rewrite what is there. **Never add experience the CV does not claim.**
  Keyword injection means surfacing a skill the person actually has and
  buried, not inventing one.
- Preserve every factual claim: dates, titles, employers, numbers.
- Say which requirement each rewrite targets.
- Flag any requirement that cannot be honestly addressed by rewriting.
  That is a real gap, and telling the user so is more useful than
  papering over it.

---

## 4. Follow-up email

`lib/ai/prompts/followUp.ts` — ported from career-ops's `modes/email.md`.

**Input** — company, role, `appliedAt`, days since applied, current
status, the match summary, and an optional tone (`direct` | `warm`) and
user context note.
**Output** — a subject line and body, stored as an `Artifact` with
`kind: FOLLOW_UP_EMAIL`.

Rules to state:

- Short. Under 150 words. A follow-up that needs scrolling does not get
  read.
- Reference something specific about the role or company, drawn from the
  match — not a generic enthusiasm sentence.
- No apology for following up, and no pressure.
- Plain text. No markdown, no emoji.
- One clear ask.

The draft lands in an editable field. **The system never sends it.**
Marking a follow-up as sent is a separate explicit user action — see
`application-states.md`.

---

## Cost accounting

Every call records `model`, `promptVersion`, input tokens, output tokens,
cached tokens, and computed `costUsd` onto the row it produced. The
conversion lives in `lib/ai/cost.ts` with the per-model rates.

At `claude-sonnet-5` rates ($2 / $10 per 1M tokens), a match evaluation
runs roughly 4,300 input and 1,200 output tokens — about **$0.021 per
job**, so a 40-job scan is around **$0.85** before caching. Caching the
system-plus-CV prefix takes a meaningful bite out of the input half.

Four cost controls, in order of value:

1. Prompt caching on the system + CV prefix.
2. The deterministic pre-filter in `lib/sources/filter.ts` — every
   posting it drops is a call not made.
3. `maxJobsPerScan`, default 40, hard cap 60, plus a per-user daily
   evaluation cap.
4. JD truncation to ~12,000 characters.

**A considered non-choice:** the Batch API would halve the cost and fits a
scan's latency profile perfectly. It is not used because it adds a
poll-a-batch-id state machine on top of trigger.dev for no benefit this
project can demonstrate. Recorded here so it is not rediscovered as a
missed opportunity.
