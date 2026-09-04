import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { getStatusCounters } from "@/lib/tracker/counters";

export const runtime = "nodejs";

/**
 * GET /api/stats — the status bar's three counters.
 *
 * live      applications in a non-terminal status
 * overdue   nextFollowUpAt before today
 * dueToday  nextFollowUpAt is today
 *
 * `/api/status/counters` is the same payload under the name the shell
 * shipped with; both are kept so an open tab polling the old path does
 * not start 404ing after a deploy.
 */
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getStatusCounters(user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to see your counters.", 401);
    }
    console.error("Failed to read status counters:", error);
    return fail(
      "INTERNAL",
      "Couldn't read your counters. Reload the page to try again.",
      500,
    );
  }
}
