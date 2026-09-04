import { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { jobsQuerySchema } from "@/lib/validation/jobs";
import { getFeedJobs } from "@/lib/db/jobs";
import { reconcileStalledMatches } from "@/lib/runs/reconcile";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );
    const parseResult = jobsQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return fail(
        "VALIDATION_FAILED",
        parseResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", "),
        400,
      );
    }

    // Settle evaluations whose background run died, so the feed shows a
    // retryable failure instead of a progress state that never resolves.
    await reconcileStalledMatches(user.id);

    const result = await getFeedJobs({
      userId: user.id,
      params: parseResult.data,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    console.error("GET /api/jobs error:", error);
    return fail("INTERNAL", "An error occurred while fetching jobs.", 500);
  }
}
