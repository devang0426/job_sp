# Feature 18 — Follow-up email

**Depends on:** 17
**Status:** done

## Goal

A follow-up email draft, generated from the application's context,
landing in an editable field for the user to copy and send themselves.

Ported from career-ops's `modes/email.md`.

## In scope

- `lib/ai/prompts/followUp.ts`.
- `POST /api/applications/[id]/follow-up`.
- The draft task.
- `Artifact` persistence with `kind: FOLLOW_UP_EMAIL`.
- The two-pane draft editor.
- `nextFollowUpAt` and the overdue counters.

## Out of scope

- Sending anything. Permanently. See below.
- Cover letters — out of scope for this phase.

## Implementation

### The system never sends

This is the product's stance, and it is not negotiable: **the draft lands
in an editable field and the user sends it themselves.** There is no
integration, no mailto automation, no "send" button.

Marking a follow-up as sent is a separate explicit user action that
writes a `FOLLOW_UP_SENT` event. Generating a draft does not imply it
went anywhere.

### The prompt

`lib/ai/prompts/followUp.ts`, three exports as always.

**Input**: company, role, `appliedAt`, days since applied, current
status, the match summary, optional tone (`direct` | `warm`), optional
user context note.

Rules the prompt must state:

- **Under 150 words.** A follow-up that needs scrolling does not get
  read.
- Reference something specific about the role or company, drawn from the
  match — not a generic enthusiasm sentence.
- No apology for following up, and no pressure.
- Plain text. No markdown, no emoji.
- One clear ask.

Returns a subject line and a body.

### The artifact

Stored as an `Artifact` with `kind: FOLLOW_UP_EMAIL`, linked to the
application.

`content` holds Claude's draft. `editedContent` holds the user's edit,
null until touched. This implements `../ui-context.md`'s rule that
generated text is editable and never read-only, while preserving the
original so "revert to generated" is possible.

`inputs` records the tone and context the draft was generated from, so a
result is reproducible.

### The editor

Two panes per `../ui-context.md`: source context on the left (the job,
the application's dates and status), the editable draft on the right. A
persistent footer bar carries the copy action.

**Generated text lands in an editable field, never read-only.** The
subject line is editable too.

Copy-to-clipboard is the primary action. It is what the user actually
does with this.

### Follow-up scheduling

`Application.nextFollowUpAt` is **set by the user, not inferred.** The
system does not decide when someone should chase an application.

It drives the top status bar's overdue and due-today counters, which is
the reason it exists.

### Async

Triggered as a task, per the three-tier flow. The button switches to a
mono progress state; the draft arrives by subscribing to the run.

## Files

- `lib/ai/prompts/followUp.ts`
- `lib/ai/followUp.ts`
- `trigger/followUp.ts`
- `app/api/applications/[applicationId]/follow-up/route.ts`
- `app/api/artifacts/[artifactId]/route.ts`
- `components/editor/DraftEditor.tsx`

## Verification

1. Generating a draft from an application produces a subject and body
   asynchronously, without blocking the UI.
2. The draft is under 150 words and references something specific to the
   role — **read it**, do not just check it exists.
3. Editing the draft persists to `editedContent` and leaves `content`
   untouched.
4. "Revert to generated" restores the original.
5. Copy-to-clipboard copies the edited version when one exists, the
   original otherwise.
6. Setting `nextFollowUpAt` in the past makes the status bar's overdue
   counter increment.
7. There is no way to send anything from this screen.
8. `costUsd` and `promptVersion` are recorded on the artifact.
9. `npm run build` passes.

## Notes

- Step 2 is the quality check. A draft that opens "I hope this email
  finds you well" and says nothing specific is worse than no draft — it
  costs the user credibility. If that is what comes back, the prompt
  needs the specificity rule stated harder.
- Two tones is enough. Resist adding a tone slider.
