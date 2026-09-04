# Feature 06 — Job feed

**Depends on:** 04, 05
**Status:** done

## Goal

The board. Full-bleed rows of scored jobs in fixed columns, filterable,
with a working apply link on every row.

Built entirely against seeded data. No external API, no Claude call. This
is the visual payoff, landed early and deliberately decoupled from any
quota.

## In scope

- `GET /api/jobs` with filters, sort, and cursor pagination.
- The feed screen: sticky column headers, full-bleed rows, hover state.
- The filter chip bar.
- Row states: evaluated, pending, failed, not yet evaluated.
- Apply links.
- The empty state.

## Out of scope

- Triggering evaluations from the feed — feature 15.
- Saving to the tracker — feature 17.
- Real scan data — feature 14.

## Implementation

### The API

`GET /api/jobs`, auth first, Zod-parsed query second.

Query parameters: `recommendation`, `minScore`, `source`, `remote`,
`company`, `postedWithinDays`, `evaluated`, `saved`, `sort`
(`score` | `postedAt`), `cursor`, `limit`.

Left-joins the requesting user's `Match` and `Application` onto each
`Job`, so one request produces a complete row. Returns
`{ rows: FeedRow[], nextCursor }`.

Cursor pagination, not offset — the feed is sorted by score and new
evaluations land while the user is reading.

**Every query is scoped by `userId`.** A job is global; a match is not.

### The rows

Rows, not a card grid. A board is rows.

Column order: score meter (`sm`) · mono score · company · role ·
location · posted age · source · verdict chip.

- Sticky column headers in Barlow Condensed, uppercase.
- Every computed value in JetBrains Mono with tabular figures. The
  alignment is the whole point.
- Hover raises the row to `--bg-raised`, 120ms.
- The whole row opens the match report. The apply link is a separate
  control that does not trigger the row.

### Row states

A row must render correctly in four states:

| State | Renders |
| --- | --- |
| Evaluated | Meter, score, verdict chip |
| Pending / running | Mono progress state in place of the score. No meter. |
| Failed | `--state-error`, the failure reason, a retry control |
| Not evaluated | Empty meter track, an "Evaluate" action |

The seed from feature 04 includes a pending match specifically so this
can be built now.

### Apply links

Every row carries an outbound link to `job.applyUrl`, `target="_blank"`
with `rel="noopener noreferrer"`.

This is the product's stance made concrete: we link, we never submit. The
link is prominent, not buried.

### Filters

A single sticky bar above the feed, not a sidebar. Filters are chips that
display their active value. Filter state lives in the URL query string so
a filtered feed is shareable and survives a reload.

### Empty state

Barlow Condensed label, one Archivo sentence, the action that fills the
space:

> **NO JOBS YET** — Run a scan to pull postings matching your
> preferences. → *Run scan*

Never an illustration.

## Files

- `app/api/jobs/route.ts`
- `lib/validation/jobs.ts`
- `lib/db/jobs.ts`
- `app/(console)/feed/page.tsx`
- `components/feed/FeedTable.tsx`
- `components/feed/FeedRow.tsx`
- `components/feed/FilterBar.tsx`

## Verification

1. The feed renders all 10 seeded jobs, sorted by score descending.
2. Each filter chip narrows the result set, and the URL reflects it.
   Reloading the filtered URL restores the same view.
3. All four row states render — evaluated, pending, failed, and not
   evaluated. Force each with seeded data.
4. Mono values align vertically down each column.
5. Every apply link opens the original posting in a new tab.
6. Clearing all filters shows the empty state only when there are
   genuinely no jobs, not when filters exclude everything — those are
   different messages.
7. `npm run build` passes.

## Notes

- The "no jobs match your filters" case is a distinct empty state from
  "no jobs yet". Conflating them tells a user to run a scan when they
  already have data.
- Do not paginate by loading everything and slicing in the client. The
  cursor exists for a reason.
