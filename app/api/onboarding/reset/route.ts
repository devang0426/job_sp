import { requireUser, UnauthorizedError } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { resetOnboarding } from "@/lib/db/preferences";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await resetOnboarding(user.id);
    return ok(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Failed to reset onboarding.", 500);
  }
}
