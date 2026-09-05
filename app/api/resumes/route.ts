import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { parsePdfResume, PdfUnreadableError } from "@/lib/resume/parse";
import { createResume, getResumes } from "@/lib/db/resumes";
import { MAX_RESUME_FILE_SIZE_BYTES } from "@/lib/validation/resumes";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const result = await getResumes(user.id);
    return ok(result);
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return fail("UNAUTHORIZED", "Authentication required.", 401);
    }
    console.error("GET /api/resumes error:", err);
    return fail("INTERNAL", "Failed to retrieve resumes.", 500);
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof Error && err.name === "UnauthorizedError") {
      return fail("UNAUTHORIZED", "Authentication required.", 401);
    }
    console.error("POST /api/resumes auth error:", err);
    return fail("INTERNAL", "Authentication failed.", 500);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("VALIDATION_FAILED", "Invalid request body.", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return fail("VALIDATION_FAILED", "No PDF file provided.", 400);
  }

  const fileName = file.name || "resume.pdf";
  const mimeType = file.type || "application/pdf";
  const sizeBytes = file.size;

  // Validation gates before parsing
  if (!fileName.toLowerCase().endsWith(".pdf") && mimeType !== "application/pdf") {
    return fail(
      "VALIDATION_FAILED",
      "Only PDF files are supported for resume upload.",
      400
    );
  }

  if (sizeBytes > MAX_RESUME_FILE_SIZE_BYTES) {
    return fail(
      "VALIDATION_FAILED",
      "Resume file size exceeds the 5 MB limit.",
      400
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const parsed = await parsePdfResume(buffer);
    const resume = await createResume({
      userId: user.id,
      fileName,
      mimeType: "application/pdf",
      sizeBytes,
      pageCount: parsed.pageCount,
      rawText: parsed.rawText,
      charCount: parsed.charCount,
      parseSource: parsed.parseSource,
    });

    // Asynchronously trigger AI CV structuring task
    try {
      const { tasks } = await import("@trigger.dev/sdk");
      await tasks.trigger("structure-resume", { resumeId: resume.id });
    } catch {
      const { structureResume } = await import("@/lib/ai/structureResume");
      structureResume(resume.id).catch((err) =>
        console.error("Fallback structuring execution failed:", err)
      );
    }

    return ok(resume, 201);
  } catch (err) {
    if (err instanceof PdfUnreadableError) {
      return fail("PDF_UNREADABLE", err.message, 422);
    }
    console.error("Error parsing resume PDF:", err);
    return fail(
      "PDF_UNREADABLE",
      "Couldn't read that PDF. Try a text-based PDF, or paste your CV instead.",
      422
    );
  }
}
