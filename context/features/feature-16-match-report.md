# Feature 16 — Match report

**Depends on:** 05, 15
**Status:** complete

## Goal

The hub screen. Everything Claude concluded about one job, laid out so a
user can decide in under a minute whether to spend an afternoon on it.

A sticky verdict rail on the left that never scrolls out of view, and
the report blocks scrolling on the right.

## In scope

- `GET /api/matches/[matchId]`.
- The report screen: verdict rail plus seven report blocks.
- The score computation explainer.
- The apply link and the save-to-tracker action.
- Pending, failed, and stale-CV states.

## Out of scope

- The tracker itself — feature 17. This screen provides the button.
- CV tailoring — feature 19. The tips are shown here; acting on them is
  later.

## Implementation

### The verdict rail

Sticky left column. Never scrolls away — the verdict is the reason the
user opened the page.

- The score as a `display` numeral (40/44) in JetBrains Mono.
- The `lg` score meter beside it, 12px segments.
- The five dimension bars, each with its rationale.
- The legitimacy tier.
- The verdict chip.

When the result **first arrives** while the user is looking at it, the
numeral and meter resolve in the staggered fill from feature 05. Once,
never on re-render, disabled under reduced motion.

### The report blocks

Scrolling right pane, in the order given in `../evaluation-spec.md`:

1. **Role summary** — what this job actually is.
2. **Requirement → evidence map** — the heart of the report. A table:
   requirement, importance band, evidence tier, note. Sort critical
   first.
3. **Strengths.**
4. **Gaps** — with severity.
5. **CV improvement tips** — each showing its target section, the
   concrete change, and the requirement it answers.
6. **Legitimacy screen** — the six signals with pass/unclear/fail.
7. **Verdict** — the reasoning, plus the score explainer below.

### The requirement map is the differentiator

This block is what separates the product from a keyword matcher. Make it
legible:

- Importance and evidence are **chips with text labels**, not colors
  alone. Icons never carry meaning alone.
- A `critical` requirement with `inferred` or `none` evidence is visually
  distinct — it is the thing that capped the score.
- Long requirement text wraps; the table scrolls inside its own container
  rather than making the page scroll sideways.

### The score explainer

Show how the number was computed: the five dimensions, their weights, the
weighted total, and any cap that fired with its reason.

**This block is why the model does not return the score.** A user who can
see that a 39 came from two unevidenced critical requirements trusts the
system in a way that a bare number never earns. Do not skip it as
"internal detail" — it is the most persuasive thing on the page.

### Non-complete states

| State | Renders |
| --- | --- |
| `PENDING` / `RUNNING` | Mono progress state; report blocks absent, not skeleton-faked |
| `FAILED` | `--state-error`, the reason, a retry control |
| Stale CV | A quiet note that this was evaluated against an older CV, with a re-evaluate action |

The stale case matters: `Match` keeps one row per user per job, so
uploading a new CV leaves old evaluations in place. Saying so is more
honest than silently showing a stale score.

### Actions

- **Apply** — outbound link to `job.applyUrl`, new tab. Prominent. The
  product's stance made concrete: we link, we never submit.
- **Save to tracker** — feature 17.
- **Re-evaluate** — `?force=1`.

Per the copy rules, an action keeps its name through the flow: "Save to
tracker" produces "Saved to tracker".

## Files

- `app/api/matches/[matchId]/route.ts`
- `app/(console)/feed/[jobId]/page.tsx`
- `components/report/VerdictRail.tsx`
- `components/report/DimensionBars.tsx`
- `components/report/RequirementMap.tsx`
- `components/report/StrengthList.tsx`
- `components/report/GapList.tsx`
- `components/report/CvTips.tsx`
- `components/report/LegitimacyPanel.tsx`
- `components/report/ScoreExplainer.tsx`

## Verification

1. Opening a feed row shows the report for that job.
2. The verdict rail stays fixed while the right pane scrolls through all
   seven blocks.
3. The score explainer's weighted total matches the displayed score, and
   a capped score names its cap.
4. A capped match visibly shows which critical requirements lacked
   evidence.
5. The requirement table scrolls horizontally inside its own container —
   **the page body never scrolls sideways**.
6. Every importance and evidence chip carries a text label, readable
   without color.
7. Pending, failed, and stale-CV states each render correctly. Force each
   with seeded data.
8. The apply link opens the original posting.
9. `npm run build` passes.

## Notes

- Build against the feature 04 seed first, including the capped and
  pending rows. Do not spend API calls iterating on layout.
- Step 3 is a real check, not a formality. If the explainer and the score
  disagree, one of them is reading a stale field.
