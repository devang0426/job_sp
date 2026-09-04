import { runs } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/db";
import type { ScanRun } from "@prisma/client";

/**
 * Reconciles database records against the trigger.dev runs that own them.
 *
 * The three-tier flow leaves a record in a pending state until the task
 * writes back. When a run never executes — no worker connected, the run
 * expired, the container crashed — nothing writes back and the record
 * stays pending forever. These functions close that gap by asking
 * trigger.dev what actually happened and recording the failure.
 */

/** Run states that mean the work will never complete. */
const DEAD_RUN_STATUSES = new Set([
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
]);

/** A record still pending after this long is abandoned, worker or not. */
const ABANDONED_AFTER_MS = 15 * 60 * 1000;

const DEAD_RUN_MESSAGE: Record<string, string> = {
  EXPIRED: "The run expired before any worker picked it up.",
  CANCELED: "The run was canceled.",
  CRASHED: "The background worker crashed.",
  SYSTEM_FAILURE: "The run failed inside the background worker.",
  TIMED_OUT: "The run timed out.",
  FAILED: "The run failed.",
};

const NO_WORKER_MESSAGE =
  "No background worker picked this up. Start the worker with `npx trigger.dev@latest dev`, or deploy your tasks, then try again.";

type RunVerdict =
  | { state: "dead"; message: string }
  | { state: "alive" }
  /** trigger.dev could not be reached, or the run is not known to it. */
  | { state: "unknown" };

/**
 * A retrieve failure is deliberately not treated as a dead run. A
 * transient API error must never mark healthy work as failed on its own;
 * only the abandonment clock can do that.
 */
async function inspectRun(triggerRunId: string): Promise<RunVerdict> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 2000),
    );
    const run = await Promise.race([
      runs.retrieve(triggerRunId),
      timeoutPromise,
    ]);
    if (!DEAD_RUN_STATUSES.has(run.status)) return { state: "alive" };
    const detail =
      typeof run.error === "object" && run.error !== null && "message" in run.error
        ? String((run.error as { message?: unknown }).message ?? "")
        : "";
    const base = DEAD_RUN_MESSAGE[run.status] ?? `The run ended as ${run.status}.`;
    return { state: "dead", message: detail ? `${base} ${detail}` : base };
  } catch {
    return { state: "unknown" };
  }
}

function isAbandoned(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > ABANDONED_AFTER_MS;
}

/** Decide whether a pending record should be failed, and why. */
async function resolveFailure(
  triggerRunId: string | null,
  createdAt: Date,
): Promise<string | null> {
  if (!triggerRunId) {
    return isAbandoned(createdAt) ? NO_WORKER_MESSAGE : null;
  }
  const verdict = await inspectRun(triggerRunId);
  if (verdict.state === "dead") return verdict.message;
  if (verdict.state === "unknown" && isAbandoned(createdAt)) {
    return NO_WORKER_MESSAGE;
  }
  return null;
}

/**
 * Bring one scan run's record in line with its trigger.dev run.
 * Returns the row as it now stands.
 */
export async function reconcileScanRun(row: ScanRun): Promise<ScanRun> {
  if (row.status !== "QUEUED" && row.status !== "RUNNING") return row;

  const failure = await resolveFailure(row.triggerRunId, row.createdAt);
  if (!failure) return row;

  return prisma.scanRun.update({
    where: { id: row.id },
    data: { status: "FAILED", error: failure, finishedAt: new Date() },
  });
}

export async function reconcileScanRuns(rows: ScanRun[]): Promise<ScanRun[]> {
  return Promise.all(rows.map((row) => reconcileScanRun(row)));
}

/**
 * Mark evaluations abandoned when their run died. Without this a feed row
 * shows a progress state forever instead of an actionable retry.
 * Returns how many rows were failed.
 */
export async function reconcileStalledMatches(userId: string): Promise<number> {
  // Only rows past the abandonment window are inspected. Evaluations that
  // are legitimately in flight must not cost an API call on every feed load.
  const stalled = await prisma.match.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "RUNNING"] },
      createdAt: { lt: new Date(Date.now() - ABANDONED_AFTER_MS) },
    },
    select: { id: true, triggerRunId: true, createdAt: true },
    take: 50,
  });

  if (stalled.length === 0) return 0;

  const results = await Promise.all(
    stalled.map(async (match) => {
      const failure = await resolveFailure(match.triggerRunId, match.createdAt);
      return failure ? match.id : null;
    }),
  );

  const dead = results.filter((id): id is string => id !== null);

  if (dead.length === 0) return 0;

  const result = await prisma.match.updateMany({
    where: { id: { in: dead }, userId, status: { in: ["PENDING", "RUNNING"] } },
    data: {
      status: "FAILED",
      failureReason:
        "This evaluation never ran. Start the trigger.dev worker or deploy your tasks, then evaluate again.",
    },
  });

  return result.count;
}
