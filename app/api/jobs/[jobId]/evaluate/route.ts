import { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getActiveResumeId } from "@/lib/db/resumes";
import { evaluateJob } from "@/lib/ai/evaluate";
import { tasks } from "@trigger.dev/sdk";
import { MatchStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/jobs/[jobId]/evaluate
 *
 * Evaluates a single job posting against the user's active CV.
 * Idempotent:
 * - Returns existing COMPLETE or RUNNING evaluation unless ?force=1 is set.
 * - Double-click / re-submit guard via @@unique([userId, jobId]) and trigger idempotencyKey.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
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

  const { jobId } = await params;
  if (!jobId) {
    return fail("VALIDATION_FAILED", "Missing jobId in request URL.", 400);
  }

  const activeResumeId = await getActiveResumeId(userId);
  if (!activeResumeId) {
    return fail(
      "NO_ACTIVE_RESUME",
      "No active CV found. Upload and activate a CV before evaluating matches.",
      400,
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });

  if (!job) {
    return fail("NOT_FOUND", "Job posting not found.", 404);
  }

  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get("force") === "1";
  const wait = searchParams.get("wait") === "1";

  // Check existing match to prevent accidental double-spend
  const existingMatch = await prisma.match.findUnique({
    where: { userId_jobId: { userId, jobId } },
  });

  if (!force) {
    if (existingMatch?.status === MatchStatus.COMPLETE) {
      return ok(existingMatch);
    }
    if (existingMatch?.status === MatchStatus.RUNNING) {
      return ok(existingMatch, 202);
    }
  }

  // Ensure match row exists in PENDING
  const match = await prisma.match.upsert({
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
  });

  // If client specifically requests synchronous evaluation (e.g. CLI or verification script)
  if (wait) {
    const result = await evaluateJob({
      userId,
      jobId,
      resumeId: activeResumeId,
    });

    if (!result.success) {
      return fail("INTERNAL", result.error || "Evaluation failed.", 500);
    }

    return ok(result.match);
  }

  // Otherwise trigger background task with idempotency key
  const idempotencyKey = force
    ? `eval:${userId}:${jobId}:${activeResumeId}:${Date.now()}`
    : `eval:${userId}:${jobId}:${activeResumeId}`;

  try {
    const handle = await tasks.trigger(
      "evaluate",
      { userId, jobId, resumeId: activeResumeId },
      { idempotencyKey },
    );

    await prisma.match.update({
      where: { id: match.id },
      data: { triggerRunId: handle.id },
    });

    return ok(
      {
        matchId: match.id,
        status: MatchStatus.PENDING,
        triggerRunId: handle.id,
      },
      202,
    );
  } catch (triggerError) {
    console.warn(
      "Trigger evaluate task dispatch failed, falling back to direct evaluation:",
      triggerError,
    );
    const result = await evaluateJob({
      userId,
      jobId,
      resumeId: activeResumeId,
    });

    if (!result.success) {
      return fail("INTERNAL", result.error || "Evaluation failed.", 500);
    }

    return ok(result.match);
  }
}
