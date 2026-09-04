# Feature 17 — Application tracker

**Depends on:** 16
**Status:** done

## Goal

A Kanban board, one column per canonical status, where a saved job moves
through the real stages of an application — with an honest history of
every move.

`../application-states.md` is the specification for this feature.

## In scope

- `POST /api/applications` — save from a match report.
- `GET /api/applications` — the grouped board payload.
- `PATCH /api/applications/[id]` — status, notes, order, follow-up date.
- `lib/tracker/transition.ts` — the one place status is written.
- The board, the cards, drag between columns.
- The application detail screen with its event timeline.

## Out of scope

- Follow-up email drafts — feature 18.
- Interview, offer, and outcome tabs. Those are named out of scope in
  `../project-overview.md`; hide the tabs rather than showing them empty.

## Implementation

### The transactional rule

**Every status write updates `status` and `statusChangedAt` and inserts
an `ApplicationEvent`, in one transaction.** The implementation is
written out in `../application-states.md`; use it.

A bare `application.update({ status })` anywhere else is a bug, not a
shortcut. This is invariant 5.

Two things depend on it: `statusChangedAt` feeds the days-in-status value
on every card, and the event log is the detail screen's activity
timeline. A status change that leaves no event makes the history lie.

### Saving from a report

`POST /api/applications` takes `{ jobId }`, creates the row in
`EVALUATED`, links `matchId`, sets `boardOrder` to max+1, and writes a
`CREATED` event.

Idempotent via `@@unique([userId, jobId])` — saving twice is a no-op, not
an error.

### The board

Horizontally scrolling columns in enum declaration order:
`EVALUATED, APPLIED, RESPONDED, INTERVIEW, OFFER, REJECTED, DISCARDED,
SKIP, HIRED`.

Each column header carries a mono count. Cards are compact: company,
role, `sm` score meter, days-in-status.

**Nine columns is a wide board.** Consider collapsing the five terminal
statuses behind an "Archived" toggle so the four live columns fit a
laptop. Most attention is on `EVALUATED` through `INTERVIEW`. Decide when
the board is real and record the decision.

### Transitions

Deliberately permissive. A job search does not proceed in a straight
line, and a tracker that argues with the user about what happened is
worse than useless.

- Any status may move to any other, including out of a terminal one.
- Moving out of terminal is allowed but still records an event, so the
  history stays honest.
- **Nothing transitions automatically.** Status is always a user action.
- Moving to `APPLIED` stamps `appliedAt` if it is not already set.

### Drag and drop

Dragging a card between columns is a status change and goes through
`transition()`. Dragging within a column reorders `boardOrder` only and
writes no event.

Optimistic UI, with a revert on failure. A card that snaps back needs to
say why.

### The detail screen

Left summary rail: company, role, status chip, `sm` meter, key dates in
mono. Right pane tabbed: Overview, Documents, Activity.

**Tabs with no content yet are hidden, not empty.** Interviews, Offer,
and Outcome do not appear in this phase.

The Activity tab is the event timeline — every status change with its
from/to and timestamp.

## Files

- `app/api/applications/route.ts`
- `app/api/applications/[applicationId]/route.ts`
- `lib/tracker/transition.ts`
- `lib/db/applications.ts`
- `lib/validation/applications.ts`
- `app/(console)/tracker/page.tsx`
- `app/(console)/tracker/[applicationId]/page.tsx`
- `components/tracker/Board.tsx`
- `components/tracker/Column.tsx`
- `components/tracker/Card.tsx`
- `components/tracker/EventTimeline.tsx`

## Verification

1. Saving from a match report creates a card in `EVALUATED` and the
   button reads "Saved to tracker".
2. Saving the same job twice does not create a second card and does not
   error.
3. Dragging a card to another column changes the status, updates
   `statusChangedAt`, **and writes an `ApplicationEvent`.** Check all
   three in Prisma Studio.
4. Days-in-status is correct. Move a card, wait, and confirm it counts
   from the move rather than from creation.
5. Reordering within a column writes no event.
6. Moving a card out of `REJECTED` works and records the event.
7. The activity timeline shows every transition in order.
8. Column counts match the cards in each column.
9. Interviews, Offer, and Outcome tabs are absent, not disabled.
10. `npm run build` passes.

## Notes

- Step 3 is the one to actually check in the database rather than by eye.
  A transition that updates status but skips the event looks identical in
  the UI and silently breaks the timeline.
- Step 4 catches the common bug of reading `updatedAt` instead of
  `statusChangedAt`.
