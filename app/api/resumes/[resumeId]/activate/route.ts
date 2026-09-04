import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { setActiveResume } from "@/lib/db/resumes";

export const runtime = "nodejs";

export async function POST(
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

  const result = await setActiveResume(user.id, resumeId);

  if (result.error === "NOT_FOUND") {
    return fail("NOT_FOUND", "Resume not found.", 404);
  }

  return ok({ activeResumeId: resumeId });
}
