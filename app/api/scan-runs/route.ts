import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { listScanRunRows, toScanRunView } from "@/lib/db/scanRuns";
import { reconcileScanRuns } from "@/lib/runs/reconcile";
import { scanRunsQuerySchema } from "@/lib/validation/scans";

export const runtime = "nodejs";

// GET /api/scan-runs — the caller's scan history, newest first.
export async function GET(req: Request) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Couldn't load scan runs.", 500);
  }

  const { searchParams } = new URL(req.url);
  const parsed = scanRunsQuerySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", "Invalid query parameters.", 400);
  }

  const { rows, nextCursor } = await listScanRunRows({
    userId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  const reconciled = await reconcileScanRuns(rows);
  return ok({ runs: reconciled.map(toScanRunView), nextCursor });
}
