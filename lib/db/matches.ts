import { prisma } from "@/lib/db";
import type { Application, Job, Match, Prisma, Resume } from "@prisma/client";

/**
 * Match rows created by the scan fan-out.
 *
 * A `Match` is created at trigger time in `PENDING` (architecture.md:
 * three-tier flow). The scan does not evaluate — it creates the row the
 * feed renders a progress state against and hands the job id to the
 * evaluation task. `@@unique([userId, jobId])` is the idempotency guard.
 */

export interface CreatePendingMatchesParams {
  userId: string;
  resumeId: string;
  jobIds: string[];
}

/**
 * Ensure a `PENDING` match exists for each (user, job) pair and return
 * the job ids that still need evaluating.
 *
 * - No row yet            → create `PENDING`, needs evaluation.
 * - `PENDING` / `FAILED`  → reset to `PENDING` against the current CV,
 *                           needs evaluation.
 * - `RUNNING` older than  → the evaluation task died without writing back
 *   STALE_RUNNING_MS        (a killed dev worker, a trigger.dev
 *                           `TASK_RUN_STALLED_EXECUTING` / `SYSTEM_FAILURE`).
 *                           A real evaluation finishes in well under a
 *                           minute, so a row still `RUNNING` this long
 *                           after the scan created it is stuck. Re-queue it,
 *                           otherwise the next scan skips the job forever
 *                           and it is never scored.
 * - `RUNNING` (fresh)     → an evaluation genuinely in flight. Left alone;
 *                           the batch-trigger idempotency key would dedupe
 *                           a double dispatch anyway.
 * - `COMPLETE`            → left untouched. A finished evaluation is not
 *                           redone just because the posting was seen again;
 *                           that is an explicit re-evaluate action.
 */
const STALE_RUNNING_MS = 10 * 60 * 1000;

export async function createPendingMatches({
  userId,
  resumeId,
  jobIds,
}: CreatePendingMatchesParams): Promise<string[]> {
  if (jobIds.length === 0) return [];

  const existing = await prisma.match.findMany({
    where: { userId, jobId: { in: jobIds } },
    select: { jobId: true, status: true, createdAt: true },
  });
  const byJob = new Map(existing.map((m) => [m.jobId, m]));

  const staleBefore = Date.now() - STALE_RUNNING_MS;
  const needsEvaluation: string[] = [];

  for (const jobId of jobIds) {
    const match = byJob.get(jobId);

    if (match === undefined) {
      await prisma.match.create({
        data: { userId, jobId, resumeId, status: "PENDING" },
      });
      needsEvaluation.push(jobId);
      continue;
    }

    const isStaleRunning =
      match.status === "RUNNING" && match.createdAt.getTime() < staleBefore;

    if (match.status === "PENDING" || match.status === "FAILED" || isStaleRunning) {
      await prisma.match.update({
        where: { userId_jobId: { userId, jobId } },
        data: { status: "PENDING", resumeId, failureReason: null },
      });
      needsEvaluation.push(jobId);
    }
  }

  return needsEvaluation;
}

/** The resume fields the report needs — never the raw CV text. */
export type MatchReportResume = Pick<
  Resume,
  "id" | "label" | "fileName" | "createdAt"
>;

/** The application fields the verdict rail needs, if the job was saved. */
export type MatchReportApplication = Pick<
  Application,
  "id" | "status" | "appliedAt" | "statusChangedAt"
>;

/**
 * The evaluation's list fields are Prisma `Json`, so TypeScript sees
 * `JsonValue`. Every row was schema-validated before it was written
 * (Invariant 4), but a row written by an older prompt version might not
 * match today's shape — so narrow rather than cast, and let the report
 * render its empty state instead of throwing.
 */
export function asReportList<T>(value: Prisma.JsonValue | null | undefined): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

/** Same, for the object-shaped fields (`raw`, `legitimacySignals`). */
export function asReportObject(
  value: unknown,
): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export type MatchReportMatch = Match & { resume: MatchReportResume };

/**
 * One report, however it was addressed. `getMatchByJobId` can find a job
 * that has never been evaluated, so `match` is nullable and the report
 * screen renders its not-evaluated state from that.
 */
export interface MatchReportResult {
  match: MatchReportMatch | null;
  job: Job;
  resume: MatchReportResume | null;
  application: MatchReportApplication | null;
  /** True when the match was scored against a CV that is no longer active. */
  isStaleCv: boolean;
}

/**
 * Fetch complete match report record by matchId scoped to userId.
 */
export async function getMatchById(
  matchId: string,
  userId: string
): Promise<MatchReportResult | null> {
  const [match, user] = await Promise.all([
    prisma.match.findFirst({
      where: { id: matchId, userId },
      include: {
        job: true,
        resume: {
          select: {
            id: true,
            label: true,
            fileName: true,
            createdAt: true,
          },
        },
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            statusChangedAt: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    }),
  ]);

  if (!match) return null;

  const isStaleCv =
    Boolean(user?.activeResumeId) &&
    Boolean(match.resumeId) &&
    match.resumeId !== user?.activeResumeId;

  return {
    match,
    job: match.job,
    resume: match.resume,
    application: match.application,
    isStaleCv,
  };
}

/**
 * Fetch complete match report record by jobId scoped to userId.
 * Used by /feed/[jobId] route.
 */
export async function getMatchByJobId(
  jobId: string,
  userId: string
): Promise<MatchReportResult | null> {
  const [job, user] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      include: {
        matches: {
          where: { userId },
          include: {
            resume: {
              select: {
                id: true,
                label: true,
                fileName: true,
                createdAt: true,
              },
            },
          },
        },
        applications: {
          where: { userId },
          select: {
            id: true,
            status: true,
            appliedAt: true,
            statusChangedAt: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    }),
  ]);

  if (!job) return null;

  const match = job.matches[0] ?? null;
  const application = job.applications[0] ?? null;

  const isStaleCv =
    Boolean(user?.activeResumeId) &&
    Boolean(match?.resumeId) &&
    match?.resumeId !== user?.activeResumeId;

  return {
    match,
    job,
    resume: match?.resume ?? null,
    application,
    isStaleCv,
  };
}

