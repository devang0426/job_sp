import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getActiveResumeId } from "@/lib/db/resumes";
import { createPendingMatches } from "@/lib/db/matches";
import { tasks } from "@trigger.dev/sdk";
import { MatchStatus } from "@prisma/client";

export const runtime = "nodejs";

const BatchEvaluateSchema = z.object({
  jobIds: z.array(z.string().min(1)).min(1).max(60),
  force: z.boolean().optional().default(false),
});

/**
 * POST /api/matches/evaluate-batch
 *
 * Batch evaluates a list of jobs against the user's active CV.
 * Sets up PENDING matches and dispatches "evaluate" background tasks via batchTrigger.
 */
export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Authentication error.", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_FAILED", "Invalid JSON request body.", 400);
  }

  const parsed = BatchEvaluateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
      400,
    );
  }

  const { jobIds, force } = parsed.data;

  const activeResumeId = await getActiveResumeId(userId);
  if (!activeResumeId) {
    return fail(
      "NO_ACTIVE_RESUME",
      "No active CV found. Upload and activate a CV before evaluating matches.",
      400,
    );
  }

  let targetJobIds: string[];

  if (force) {
    // Reset all target jobs to PENDING
    await Promise.all(
      jobIds.map((jobId) =>
        prisma.match.upsert({
          where: { userId_jobId: { userId, jobId } },
          create: {
            userId,
            jobId,
            resumeId: activeResumeId,
            status: MatchStatus.PENDING,
          },
          update: {
            resumeId: activeResumeId,
            status: MatchStatus.PENDING,
            failureReason: null,
          },
        }),
      ),
    );
    targetJobIds = jobIds;
  } else {
    // Deduplicate against already running or completed evaluations
    targetJobIds = await createPendingMatches({
      userId,
      resumeId: activeResumeId,
      jobIds,
    });
  }

  if (targetJobIds.length === 0) {
    return ok({ queued: 0, jobIds: [], message: "All specified jobs are already evaluated or running." });
  }

  try {
    const batchResult = await tasks.batchTrigger(
      "evaluate",
      targetJobIds.map((jobId) => ({
        payload: { userId, jobId, resumeId: activeResumeId },
        options: {
          idempotencyKey: force
            ? `eval:${userId}:${jobId}:${activeResumeId}:${Date.now()}`
            : `eval:${userId}:${jobId}:${activeResumeId}`,
        },
      })),
    );

    return ok(
      {
        queued: targetJobIds.length,
        jobIds: targetJobIds,
        batchId: batchResult.batchId,
      },
      202,
    );
  } catch (triggerError) {
    console.warn("Batch trigger evaluate failed:", triggerError);
    return ok(
      {
        queued: 0,
        pending: targetJobIds.length,
        jobIds: targetJobIds,
        warning: "Matches created in PENDING state; background trigger dispatch deferred.",
      },
      202,
    );
  }
}
