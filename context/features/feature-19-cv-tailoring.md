# Feature 19 — CV tailoring

**Depends on:** 16
**Status:** complete

## Goal

Per-job CV rewriting guidance: which sections to change, what to change
them to, and which job requirement each change answers.

Ported from career-ops's `modes/pdf.md`, minus the PDF. We do not render
documents; we produce editable text the user takes into their own CV.

## In scope

- `lib/ai/prompts/tailorCv.ts`.
- `POST /api/matches/[matchId]/tailor`.
- The tailoring task.
- `Artifact` persistence with `kind: CV_VARIANT`.
- The tailoring editor, reusing feature 18's two-pane component.

## Out of scope

- **PDF or DOCX generation.** Explicitly out of scope in
  `../project-overview.md`. Tips and editable text only.
- ATS score simulation. There is no honest way to compute one.

## Implementation

### Reuse the match's gaps

The prompt takes the CV text, the job description, **and the gaps and CV
tips already on the `Match`.**

It does not re-derive them. The evaluation already did that work, paying
for it twice would be wasteful, and — more importantly — two independent
derivations will eventually disagree, which makes the report and the
tailoring contradict each other in front of the user.

### The rules that matter

The prompt must state all four:

- **Rewrite what is there. Never add experience the CV does not claim.**
  Keyword injection means surfacing a skill the person actually has and
  buried, not inventing one.
- **Preserve every factual claim**: dates, titles, employers, numbers.
- Say which requirement each rewrite targets.
- **Flag any requirement that cannot be honestly addressed by
  rewriting.** That is a real gap, and telling the user so is more useful
  than papering over it.

The fourth is what keeps this feature honest. A tailoring tool that
claims it can close every gap is lying, and the user finds out in the
interview.

### Output shape

Per suggestion: the target section (`"Experience > Acme Corp"`,
`"Skills"`), the current text, the proposed rewrite, and the requirement
it answers.

Plus a separate list of requirements that rewriting cannot address, with
a one-line reason.

### The editor

Reuse `DraftEditor` from feature 18. Source context on the left — the JD
and the match's gaps. The suggestions on the right, each editable.

Copy per section, and copy all. The user is assembling this into their
own document, so make both granularities available.

### Async and cost

Triggered as a task, per the three-tier flow. Same cost accounting as
every other AI call: `model`, `promptVersion`, tokens, `costUsd` on the
artifact.

This is the most expensive single call in the system — it sends the CV,
the JD, and the match findings. It is user-initiated per job, not
automatic, which is what keeps that acceptable. **Do not add a "tailor
all" button.**

## Files

- `lib/ai/prompts/tailorCv.ts`
- `lib/ai/tailorCv.ts`
- `trigger/tailorCv.ts`
- `app/api/matches/[matchId]/tailor/route.ts`
- `components/editor/TailorPanel.tsx`

## Verification

1. Tailoring from a match report produces suggestions asynchronously.
2. Each suggestion names a real section of the user's CV. **Check against
   the source** — a suggestion targeting a section that does not exist
   means the prompt is not reading the CV properly.
3. **No suggestion invents experience.** Read every one against the
   original CV. This is the check that matters most.
4. Dates, titles, employers, and numbers survive unchanged in the
   rewrites.
5. Each suggestion cites the requirement it answers.
6. At least one requirement is flagged as un-addressable when the CV
   genuinely lacks it. If everything is addressable, the prompt is being
   agreeable rather than useful.
7. Suggestions are editable and copyable, per section and in full.
8. `costUsd` and `promptVersion` are recorded.
9. `npm run build` passes.

## Notes

- Steps 3 and 6 are the feature. Everything else is plumbing. A tailoring
  tool that quietly adds "led a team of five" to a CV that never claimed
  it is actively harmful to the user, and it is exactly what an
  unconstrained model will produce.
- Reusing the match's gaps rather than re-deriving them is also the
  cheaper path. Both reasons point the same way.
