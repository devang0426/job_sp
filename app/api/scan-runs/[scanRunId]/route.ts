import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getScanRunRow, toScanRunView } from "@/lib/db/scanRuns";
import { reconcileScanRun } from "@/lib/runs/reconcile";

export const runtime = "nodejs";

// GET /api/scan-runs/[scanRunId] — one run, for the UI to subscribe to
// while it executes. A run whose background task died is reconciled to
// FAILED here rather than being polled forever.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ scanRunId: string }> },
) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Couldn't load the scan run.", 500);
  }

  const { scanRunId } = await params;
  const row = await getScanRunRow(userId, scanRunId);
  if (!row) {
    return fail("NOT_FOUND", "Scan run not found.", 404);
  }

  const reconciled = await reconcileScanRun(row);

  // Compute live match evaluation counts for this user
  const runStartTime = reconciled.startedAt ?? reconciled.createdAt;
  const [evaluationsPending, evaluationsCompleted, evaluationsFailed] =
    await Promise.all([
      prisma.match.count({
        where: {
          userId,
          status: { in: ["PENDING", "RUNNING"] },
        },
      }),
      prisma.match.count({
        where: {
          userId,
          status: "COMPLETE",
          evaluatedAt: { gte: runStartTime },
        },
      }),
      prisma.match.count({
        where: {
          userId,
          status: "FAILED",
          createdAt: { gte: runStartTime },
        },
      }),
    ]);

  return ok(
    toScanRunView(reconciled, {
      evaluationsPending,
      evaluationsCompleted,
      evaluationsFailed,
    }),
  );
}
