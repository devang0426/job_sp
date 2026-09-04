import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { deleteResume } from "@/lib/db/resumes";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ resumeId: string }> }
) {
  const user = await requireUser();
  if (!user) {
    return fail("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { resumeId } = await context.params;
  if (!resumeId) {
    return fail("VALIDATION_FAILED", "Resume ID is required.", 400);
  }

  const result = await deleteResume(user.id, resumeId);

  if (result.error === "NOT_FOUND") {
    return fail("NOT_FOUND", "Resume not found.", 404);
  }

  if (result.error === "SOLE_ACTIVE_RESUME_BLOCKED") {
    return fail(
      "VALIDATION_FAILED",
      "Cannot delete active resume when it is your only resume.",
      400
    );
  }

  return ok({ deleted: true });
}
