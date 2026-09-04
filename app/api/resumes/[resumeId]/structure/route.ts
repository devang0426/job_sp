import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { structureResume } from "@/lib/ai/structureResume";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  const user = await requireUser();
  if (!user) {
    return fail("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { resumeId } = await params;
  if (!resumeId) {
    return fail("VALIDATION_FAILED", "Missing resumeId parameter.", 400);
  }

  const existingResume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!existingResume) {
    return fail("NOT_FOUND", "Resume not found.", 404);
  }

  if (existingResume.userId !== user.id) {
    return fail("UNAUTHORIZED", "Forbidden. You do not own this resume.", 403);
  }

  const result = await structureResume(resumeId);

  if (!result.success) {
    return fail("INTERNAL", result.error || "Failed to structure resume.", 500);
  }

  const updatedResume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  return ok({
    resume: updatedResume,
    structured: result.structured,
  });
}
