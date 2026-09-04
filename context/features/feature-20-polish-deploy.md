# Feature 20 — Polish and deploy

**Depends on:** all
**Status:** done

## Goal

The board, finished. Real counters, every empty state written, and the
whole loop working on the deployed URL rather than on localhost.

## In scope

- `GET /api/stats` — the top status bar's live counters.
- Every empty state.
- Follow-up overdue logic.
- Accessibility and reduced-motion pass.
- Vercel and trigger.dev production deployment.
- End-to-end verification of the whole loop.

## Out of scope

- New features. If something is missing, it belongs in a phase-two
  feature file, not smuggled in here.

## Implementation

### The status bar

`GET /api/stats` returns the counters the shell shows:
`14 live · 3 overdue · 2 due today`. `GET /api/status/counters` is the
same payload under the name the shell first shipped with, kept so an open
tab polling the old path does not start 404ing after a deploy. Both read
`getStatusCounters()` in `lib/tracker/counters.ts`; the console layout
also calls it server-side and hands the bar its first values, so the
counters never flash zero.

- **live** — applications in non-terminal statuses.
- **overdue** — `nextFollowUpAt` in the past.
- **due today** — `nextFollowUpAt` is today.

Mono figures, in fixed positions so they do not shift as they change.

### Empty states

Every screen needs one. A DM Mono uppercase label, one DM Sans sentence,
the action that fills the space. Never an illustration — the shared
`components/ui/EmptyState` primitive is that shape, and every screen uses
it rather than hand-rolling a bordered box with an icon in it.

The one that is easy to get wrong: **"no jobs yet" and "no jobs match
your filters" are different states.** Telling a user to run a scan when
they already have 200 jobs and an over-narrow filter is a small
insult. Check each screen for this class of conflation.

Screens needing states: feed (both cases), tracker (per column and whole
board), scan runs, resumes, artifacts.

### Accessibility pass

- Tab through every screen. Focus rings visible on every surface,
  achromatic, 2px with 2px offset.
- Every icon that communicates state has a text label beside it.
- The score meter announces score and verdict.
- Verdict, importance, and evidence chips are readable without color.
- Enable reduced motion and confirm the meter stagger and all transitions
  are disabled — results appear in their final state.

### Copy pass

Read every string against `../ui-context.md`'s copy rules:

- Sentence case except DM Mono uppercase labels.
- Errors say what happened **and what to do**. No apologies, no
  vagueness.
- Actions keep their name through the flow: "Save to tracker" produces
  "Saved to tracker".
- Named the way the user thinks: "saved jobs", not "tracked entities".

### Deployment

**Vercel:** every variable from `../env-reference.md`, with
`NEXT_PUBLIC_APP_URL` set to the deployed origin.

**Clerk:** add the production webhook endpoint at
`<origin>/api/webhooks/clerk` and set the signing secret.

**trigger.dev:** `npx trigger.dev@latest deploy`. Remember the tasks run
on trigger.dev's infrastructure and do **not** inherit Vercel's
environment — `DATABASE_URL`, `DIRECT_URL`, the AI key
(`GOOGLE_GENERATIVE_AI_API_KEY` and/or `ANTHROPIC_API_KEY`), and the
source keys must all be set in the trigger.dev dashboard separately.

**Neon:** confirm the pooled URL is what the app uses and the direct URL
is what migrations use.

## Files

- `app/api/stats/route.ts`
- `components/shell/StatusBar.tsx`
- empty states across `components/`
- `README.md` — setup and run instructions

## Verification

The whole loop, **on the deployed URL**, in one sitting, with a fresh
account:

1. Sign up. Exactly one `User` row is created.
2. Upload a real CV PDF. It parses on Vercel, not just locally.
3. Set preferences. Complete onboarding.
4. Run a scan. It pulls real jobs from at least two sources.
5. Evaluations arrive asynchronously and fill into the feed. The UI never
   blocks.
6. Filter the feed. The URL reflects it and survives a reload.
7. Open a match report. The verdict rail, all seven blocks, and the score
   explainer render.
8. Follow an apply link to the real posting.
9. Save to the tracker. Move the card through two statuses.
10. Check the activity timeline shows both moves.
11. Generate a follow-up draft. Edit it. Copy it.
12. Generate tailoring suggestions for a job.
13. Set a follow-up date in the past; the overdue counter increments.
14. Re-run the same scan; it reports zero new jobs.

Then:

15. Every empty state has been seen at least once.
16. Reduced motion disables the stagger.
17. `npm run build` passes.

## Notes

- Do the whole verification list in one pass with a genuinely fresh
  account. Testing individual steps against a database full of your own
  seeded data hides exactly the bugs a grader will hit first.
- Step 2 is the one that has failed for other people. If `pdf-parse` was
  not tested on a real deploy back in feature 08, it will surface here.
- If something is broken and unfixable in the time available, remove it
  from the nav rather than shipping it broken. `../ui-context.md` is
  explicit: what is not built is absent, not disabled.
