import { requireUser, UnauthorizedError } from "@/lib/auth";
import { getMatchById } from "@/lib/db/matches";
import { ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const user = await requireUser();
    const { matchId } = await params;

    if (!matchId) {
      return fail("VALIDATION_FAILED", "Missing match ID parameter.", 400);
    }

    const result = await getMatchById(matchId, user.id);
    if (!result) {
      return fail("NOT_FOUND", "Match report not found.", 404);
    }

    return ok(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to view this match report.", 401);
    }
    console.error("Error retrieving match report:", err);
    return fail("INTERNAL", "Failed to retrieve match report.", 500);
  }
}
