import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { startScan } from "@/lib/scan/startScan";

export const runtime = "nodejs";

// POST /api/scans — start a scan against the caller's saved Preferences.
// Three-tier: create the ScanRun in QUEUED, trigger the orchestrator,
// return the id immediately. The task fills the record in; the UI
// subscribes to it.
export async function POST() {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Couldn't start the scan. Try again.", 500);
  }

  const result = await startScan({ userId, trigger: "MANUAL" });

  if (!result.ok) {
    if (result.reason === "SCAN_IN_PROGRESS") {
      return fail("SCAN_IN_PROGRESS", result.message, 409);
    }
    if (result.reason === "NO_PREFERENCES" || result.reason === "NO_TARGET_ROLES") {
      return fail("VALIDATION_FAILED", result.message, 400);
    }
    return fail("INTERNAL", result.message, 500);
  }

  return ok({ id: result.scanRun.id, status: result.scanRun.status }, 202);
}
