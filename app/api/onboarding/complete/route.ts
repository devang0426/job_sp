import { requireUser, UnauthorizedError } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { completeOnboarding } from "@/lib/db/preferences";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await completeOnboarding(user.id);

    if ("error" in result) {
      if (result.error === "NO_ACTIVE_RESUME") {
        return fail("NO_ACTIVE_RESUME", "Upload a CV before completing onboarding.", 400);
      }
      if (result.error === "NO_PREFERENCES") {
        return fail(
          "VALIDATION_FAILED",
          "Set your target roles and preferences before completing onboarding.",
          400,
        );
      }
    }

    return ok(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Failed to complete onboarding.", 500);
  }
}
