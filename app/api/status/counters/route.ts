import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { getStatusCounters } from "@/lib/tracker/counters";

export const runtime = "nodejs";

/**
 * GET /api/status/counters
 * Returns live, overdue, and due-today counters for the active user.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const counters = await getStatusCounters(user.id);
    return ok(counters);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to access status counters.", 401);
    }
    console.error("Error fetching status counters:", err);
    return fail("INTERNAL", "Failed to fetch status counters.", 500);
  }
}
