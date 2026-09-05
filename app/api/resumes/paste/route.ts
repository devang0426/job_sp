import { NextRequest } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { resumePasteSchema } from "@/lib/validation/resumes";
import { normalizeResumeText } from "@/lib/resume/normalize";
import { createResume } from "@/lib/db/resumes";
import { ParseSource } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (
      err instanceof UnauthorizedError ||
      (err instanceof Error && err.name === "UnauthorizedError")
    ) {
      return fail("UNAUTHORIZED", "Authentication required.", 401);
    }
    console.error("POST /api/resumes/paste auth error:", err);
    return fail("UNAUTHORIZED", "Authentication required.", 401);
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

    // Asynchronously dispatch AI CV structuring without blocking the response
    const triggerKey = process.env.TRIGGER_SECRET_KEY;
    if (triggerKey && !triggerKey.includes("placeholder")) {
      import("@trigger.dev/sdk")
        .then(({ tasks }) => tasks.trigger("structure-resume", { resumeId: resume.id }))
        .catch((triggerErr) => {
          console.warn("Trigger.dev dispatch failed, falling back to direct structuring:", triggerErr);
          import("@/lib/ai/structureResume").then(({ structureResume }) => {
            structureResume(resume.id).catch((err) =>
              console.error("Fallback structuring execution failed:", err)
            );
          });
        });
    } else {
      import("@/lib/ai/structureResume").then(({ structureResume }) => {
        structureResume(resume.id).catch((err) =>
          console.error("Direct structuring execution failed:", err)
        );
      });
    }

    return ok(resume, 201);
  } catch (err) {
    console.error("Failed to create pasted resume in database:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to save resume. Please try again.";
    return fail("INTERNAL", errorMessage, 500);
  }
}
