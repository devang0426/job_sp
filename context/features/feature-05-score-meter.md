# Feature 05 — Score meter

**Depends on:** 02
**Status:** not started

## Goal

The segmented signal meter. Ten discrete segments filled to the score,
colored by the recommendation, at three scales.

This is the one thing the product is remembered by, and the one place the
interface spends visual boldness. It gets its own feature because it
deserves to be correct rather than approximately correct, and because
every later screen depends on it.

## In scope

- `components/meter/ScoreMeter.tsx` at `sm`, `md`, and `lg`.
- `components/meter/useMeterStagger.ts` — the one orchestrated moment.
- `lib/evaluation/score.ts` — the segment mapping function only.
- A dev page rendering the meter across the full score range.

## Out of scope

- The rest of `score.ts` — weights and caps arrive with feature 15. Only
  the score-to-segments mapping is needed now.
- Any screen that uses the meter.

## Implementation

### The mapping

```ts
export function filledSegments(score: number): number {
  return score === 0 ? 0 : Math.max(1, Math.round(score / 10));
}
```

**The `Math.max(1, …)` is the point of this function.** A score of 4 must
show one lit segment. An empty meter reads as "not evaluated", which is a
different state entirely, and conflating the two is a real bug the user
will hit on their first low-scoring job.

Unit-test the boundaries: 0 → 0, 1 → 1, 4 → 1, 5 → 1, 50 → 5, 51 → 5,
55 → 6, 88 → 9, 100 → 10.

### Color

The meter is colored **entirely by recommendation** —
`--verdict-apply`, `--verdict-consider`, or `--verdict-skip` — never by
segment position. A gradient across segments would make it decoration;
a single verdict color makes it a judgment. Unfilled segments are
`--meter-track`.

### Scales

| Scale | Segment width | Used in |
| --- | --- | --- |
| `sm` | 3px | Feed rows, tracker cards |
| `md` | 6px | Saved job cards |
| `lg` | 12px | The match report, beside the `display` numeral |

### The stagger

When a match result **first arrives** for a job the user is looking at,
the segments fill one at a time, 40ms apart.

Three constraints, all of which have been got wrong before:

- It runs **once per result**, never on re-render. Key it on the match id
  and a "has animated" ref, not on prop identity.
- It runs only when the result *arrives*, not when a page loads with
  results already present. Landing on the feed must not set forty meters
  animating.
- `prefers-reduced-motion: reduce` disables it entirely — the meter
  appears in its final state, no transition.

This is the board updating, not a decorative flourish. Everything around
it stays quiet.

### Accessibility

The meter is not the only carrier of the score. Every meter is
accompanied by the mono numeral, and the verdict has a text chip. Icons
and color never carry meaning alone.

Give the meter `role="img"` with an `aria-label` of the form
`"Match score 88 out of 100, apply"`.

## Files

- `components/meter/ScoreMeter.tsx`
- `components/meter/useMeterStagger.ts`
- `lib/evaluation/score.ts` (partial)
- `lib/evaluation/score.test.ts`
- a temporary dev route rendering the range

## Verification

1. Render the meter at 0, 1, 4, 50, 51, 88, 100 and confirm the segment
   counts against the table above by eye. **4 must show one segment.**
2. All three scales render at the specified widths.
3. Each verdict band shows its own color, and the color does not vary
   across segments.
4. Trigger a result arrival — the stagger runs once. Re-render the
   component; it does not run again.
5. Enable reduced motion at the OS level and repeat step 4 — the meter
   appears complete with no animation.
6. A screen reader announces the score and verdict.
7. `npm run build` passes.

## Notes

- Build this against seeded data from feature 04. It must not wait on a
  real evaluation.
- Resist adding a percentage sign, a donut, a ring, or a progress bar.
  `../ui-context.md` rules all four out by name.
