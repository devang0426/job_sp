# Application States

Ported from career-ops's `templates/states.yml`. The multi-language
aliases are dropped; everything else carries over.

## The canonical statuses

**The enum's declaration order is the Kanban column order.**

| # | Status      | Label     | Meaning                                      | Terminal |
| - | ----------- | --------- | -------------------------------------------- | -------- |
| 1 | `EVALUATED` | Evaluated | Evaluated with a report, decision pending    |          |
| 2 | `APPLIED`   | Applied   | Application submitted by the user            |          |
| 3 | `RESPONDED` | Responded | Company has responded, not yet an interview  |          |
| 4 | `INTERVIEW` | Interview | Active interview process                     |          |
| 5 | `OFFER`     | Offer     | Offer received                               | ✔        |
| 6 | `REJECTED`  | Rejected  | Rejected by the company                      | ✔        |
| 7 | `DISCARDED` | Discarded | Withdrawn by the user, or the posting closed | ✔        |
| 8 | `SKIP`      | Skip      | Doesn't fit — don't apply                    | ✔        |
| 9 | `HIRED`     | Hired     | Offer accepted                               | ✔        |

Note that `APPLIED` means *the user told us they applied*. Nothing in this
system submits an application — see the stance in
`project-overview.md`.

Terminal flags are policy, so they live in code rather than the database:

```ts
// lib/tracker/states.ts
export const STATUS_ORDER = [
  "EVALUATED", "APPLIED", "RESPONDED", "INTERVIEW",
  "OFFER", "REJECTED", "DISCARDED", "SKIP", "HIRED",
] as const;

export const TERMINAL: ReadonlySet<ApplicationStatus> =
  new Set(["OFFER", "REJECTED", "DISCARDED", "SKIP", "HIRED"]);
```

## Transition rules

Deliberately permissive. A job search does not proceed in a straight
line, and a tracker that argues with the user about what happened is
worse than useless.

- Any non-terminal status may move to any other status.
- A terminal status may be moved out of — people do get un-rejected, and
  a discarded application can be revived. Moving out of a terminal status
  is allowed but records an event, so the history stays honest.
- `EVALUATED` is the entry point. An application is created there when a
  job is saved from a match report.
- Nothing transitions automatically. Status is always a user action.

## The transactional rule

**Every status write updates `status` and `statusChangedAt` and inserts
an `ApplicationEvent`, in one transaction.**

```ts
// lib/tracker/transition.ts — the only place status is written
export async function transition(
  applicationId: string,
  userId: string,
  toStatus: ApplicationStatus,
  message?: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.application.findFirstOrThrow({
      where: { id: applicationId, userId },
    });
    if (current.status === toStatus) return current;

    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: toStatus,
        statusChangedAt: new Date(),
        ...(toStatus === "APPLIED" && !current.appliedAt
          ? { appliedAt: new Date() }
          : {}),
      },
    });

    await tx.applicationEvent.create({
      data: {
        applicationId,
        type: "STATUS_CHANGED",
        fromStatus: current.status,
        toStatus,
        message,
      },
    });

    return updated;
  });
}
```

A bare `application.update({ status })` anywhere else in the codebase is
a bug, not a shortcut. This is invariant 5 in `architecture.md`.

Two things depend on it:

- `statusChangedAt` feeds the Kanban card's days-in-status mono value.
- The event log is the application detail screen's Activity tab. A
  status change that leaves no event makes the history lie.

## Board layout

Nine columns is a wide board. `ui-context.md` specifies horizontally
scrolling columns, which handles it — but consider collapsing the five
terminal statuses behind an "Archived" toggle so the four live columns
fit a laptop screen without scrolling. Most of a user's attention is on
`EVALUATED` through `INTERVIEW`.

Each column header carries a mono count. Cards show company, role, score
meter at `sm`, and days-in-status.

## Follow-ups

`Application.nextFollowUpAt` drives the top status bar's overdue and
due-today counters. It is set by the user, not inferred. A follow-up
email draft generated for an application does not mark it as sent —
`FOLLOW_UP_SENT` is a separate, explicit user action, because the system
never sends anything.
