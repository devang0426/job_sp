import { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { resumePasteSchema } from "@/lib/validation/resumes";
import { normalizeResumeText } from "@/lib/resume/parse";
import { createResume } from "@/lib/db/resumes";
import { ParseSource } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    console.error("requireUser error in /api/resumes/paste:", error);
    return fail("INTERNAL", "Authentication error. Please re-sign in.", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("VALIDATION_FAILED", "Invalid JSON payload.", 400);
  }

  const parsed = resumePasteSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid resume text.";
    return fail("VALIDATION_FAILED", issue, 400);
  }

  const normalizedText = normalizeResumeText(parsed.data.text);
  if (normalizedText.length < 10) {
    return fail(
      "VALIDATION_FAILED",
      "Pasted resume text is too short.",
      400
    );
  }

  try {
    const resume = await createResume({
      userId: user.id,
      label: parsed.data.label || "Pasted CV",
      fileName: "pasted-resume.txt",
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(normalizedText, "utf-8"),
      pageCount: null,
      rawText: normalizedText,
      charCount: normalizedText.length,
      parseSource: ParseSource.PASTED,
    });

    // Asynchronously trigger AI CV structuring task (non-blocking)
    (async () => {
      try {
        const { tasks } = await import("@trigger.dev/sdk");
        await tasks.trigger("structure-resume", { resumeId: resume.id });
      } catch {
        const { structureResume } = await import("@/lib/ai/structureResume");
        structureResume(resume.id).catch((err) =>
          console.error("Fallback structuring execution failed:", err)
        );
      }
    })().catch(() => {});

    return ok(resume, 201);
  } catch (dbErr) {
    console.error("Failed to create resume in database:", dbErr);
    return fail("INTERNAL", "Database error while saving resume.", 500);
  }
}

