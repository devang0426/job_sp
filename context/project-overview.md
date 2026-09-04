# Job Scraper and Resume Matcher

## Overview

A job search console. It pulls real postings from four sources, evaluates
each one against the user's CV with Claude, and returns a 0–100 fit score
with the reasoning behind it — then tracks what the user does about it.

The problem it solves is not "find jobs". Job boards already do that, and
they return hundreds. The problem is deciding which of those hundreds are
worth an afternoon of tailoring a CV and writing a cover letter. This
product is a filter: it reads the job description against the user's
actual experience, says how well they match and exactly where they fall
short, and recommends apply, consider, or skip.

**The system evaluates and recommends. The user decides and acts.** It
never submits an application, never clicks apply, never sends an email.
It surfaces the apply link and drafts text the human sends. This is a
product stance, not a technical limitation, and it shapes real decisions
downstream: every job carries an outbound link, every generated draft
lands in an editable field, and nothing is ever dispatched on the user's
behalf.

## Goals

1. Pull job postings from at least four distinct sources into one
   normalized, deduplicated feed.
2. Score every posting against the user's CV with a defensible number —
   one the user can interrogate, not a black box.
3. Make the decision fast. A user should be able to read a feed row and
   know whether to open it, and read a match report and know whether to
   apply.
4. Track the outcome of every application through a fixed set of statuses,
   so the user has one place that knows the state of their search.

## Core User Flow

1. User signs in with Clerk.
2. Onboarding: uploads a CV PDF, sets target roles, locations, and
   preferences.
3. User runs a scan. Postings are pulled from the enabled sources,
   normalized, deduplicated, and filtered against preferences.
4. Each surviving posting is evaluated against the CV by Claude. Results
   arrive asynchronously and fill into the feed as they land.
5. User reads the job feed — one row per posting, with a score meter,
   verdict chip, and the machine values that make the rows comparable.
6. User opens a match report: the score, the five dimensions behind it,
   which requirements are evidenced and which are not, strengths, gaps,
   CV improvement tips, and a legitimacy read on the posting itself.
7. From the report, the user follows the apply link to the original
   posting, and saves the job to the tracker.
8. In the tracker, the user moves the card through statuses as the
   application progresses, generates a tailored CV variant or a follow-up
   email draft, and copies what they need.

## Features

### Ingestion

- Four source adapters behind one interface: ATS job boards
  (Greenhouse / Lever / Ashby), Adzuna, JSearch, and a Playwright
  scraper.
- Normalization to a single posting shape regardless of source.
- Deduplication across sources — the same job on a company's Greenhouse
  board and on Adzuna collapses to one row.
- Scan runs are recorded with per-source statistics, so a partial failure
  is visible rather than silent.

### Matching

- CV PDF parsing to text, then to structured skills, experience, and
  education.
- Claude evaluates CV against job description and returns a structured
  report: five scored dimensions, a requirement-to-evidence map,
  strengths, gaps, CV tips, and a legitimacy screen.
- The headline 0–100 score is computed from those dimensions in
  application code, not returned by the model — see
  `evaluation-spec.md` for why.
- Recommendation of apply, consider, or skip, derived from the score with
  deterministic caps.

### Feed and report

- Full-bleed feed rows with a segmented score meter, sortable and
  filterable by score, verdict, source, location, and posting age.
- Every row carries a working apply link to the original posting.
- A match report per job: sticky verdict rail, scrolling report blocks.

### Tracker

- Kanban board, one column per canonical application status.
- Days-in-status on every card.
- An event history per application — every status change is recorded.

### Studio

- Per-job CV tailoring: which sections to rewrite, what to change, and
  which job requirement each change answers.
- Follow-up email drafts generated from application context.
- All generated text lands editable, with the original preserved.

## Scope

### In Scope

- Clerk authentication and onboarding.
- CV upload, PDF text extraction, and structured parsing.
- All four job source adapters, normalization, and dedup.
- AI match evaluation and the scoring model.
- Job feed with filters.
- Match report.
- Kanban tracker with the canonical statuses and event history.
- Follow-up email drafts.
- CV tailoring tips and variants.

### Out of Scope

Everything below appears in `ui-context.md`'s navigation because that
file describes the product's full shape. None of it is being built in
this phase. **Screens that are not built are absent from the nav, not
shown disabled.**

- Interview prep, practice interviewer, and debriefs.
- Offer review and salary negotiation.
- Cover letters, outreach, contact discovery, and company research.
- Story bank and upskilling.
- Insight: calibration, patterns, and the weekly digest.
- Discovery: reverse ATS and funded-company tracking.
- PDF rendering of tailored CVs. Tailoring produces tips and editable
  text, not a generated document.
- Any form of automated application submission. This is permanently out
  of scope, not deferred.

## Success Criteria

1. A signed-in user with an uploaded CV can run a scan and see at least
   20 scored jobs from at least two distinct sources, each with a working
   apply link.
2. Running the same scan twice produces no duplicate rows — the second
   run reports zero new jobs and N updated.
3. A match report shows a score, five dimension scores, and at least one
   named gap with a concrete CV tip attached to it.
4. A deliberately mismatched CV and job produce a skip recommendation
   with a visible reason, not a middling score.
5. A job saved from a match report appears on the tracker, and moving it
   between columns records both the new status and a timestamped event.
6. The full loop works on the deployed Vercel URL, not only locally.
