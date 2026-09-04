import { prisma } from "@/lib/db";
import { calculateCostUsd } from "./cost";
import { generate } from "./generate";
import {
  VERSION,
  SYSTEM,
  buildUser,
  TailorCvInput,
  TailorCvOutputSchema,
  TailorSuggestion,
  UnaddressableRequirement,
} from "./prompts/tailorCv";
import { Artifact, ArtifactKind, Prisma } from "@prisma/client";

/** Match findings are stored as Prisma JSON. Present them as an array or nothing. */
function asJsonArray(value: Prisma.JsonValue | null): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export interface GenerateTailorCvParams {
  userId: string;
  matchId: string;
}

export interface GenerateTailorCvResult {
  success: boolean;
  artifact?: Artifact;
  suggestions?: TailorSuggestion[];
  unaddressableRequirements?: UnaddressableRequirement[];
  error?: string;
}

/**
 * Generates per-job CV rewriting guidance grounded in existing match gaps and CV tips.
 * Uses Google Gemini API (gemini-2.5-flash) with Anthropic Claude Sonnet fallback.
 * Persists the result as an Artifact with kind: CV_VARIANT, recording model, promptVersion,
 * tokens, and computed costUsd.
 */
export async function generateTailoredCv({
  userId,
  matchId,
}: GenerateTailorCvParams): Promise<GenerateTailorCvResult> {
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId },
    include: {
      job: true,
      resume: true,
      application: true,
    },
  });

  if (!match) {
    return { success: false, error: `Match ${matchId} not found.` };
  }

  // Retrieve CV rawText either from match.resume or active resume
  let cvRawText = match.resume?.rawText || "";
  if (!cvRawText && match.resumeId) {
    const fullResume = await prisma.resume.findUnique({
      where: { id: match.resumeId },
      select: { rawText: true },
    });
    cvRawText = fullResume?.rawText || "";
  }

  if (!cvRawText) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    });
    if (user?.activeResumeId) {
      const activeResume = await prisma.resume.findUnique({
        where: { id: user.activeResumeId },
        select: { rawText: true },
      });
      cvRawText = activeResume?.rawText || "";
    }
  }

  if (!cvRawText) {
    return {
      success: false,
      error: "No resume text found to tailor. Please ensure an active CV is uploaded.",
    };
  }

  const promptInput: TailorCvInput = {
    jobTitle: match.job.title,
    company: match.job.company,
    jobDescription: match.job.descriptionText,
    cvText: cvRawText,
    gaps: asJsonArray(match.gaps),
    cvTips: asJsonArray(match.cvTips),
    requirements: asJsonArray(match.requirements),
  };

  const inputsJson = {
    jobTitle: promptInput.jobTitle,
    company: promptInput.company,
    gapsCount: Array.isArray(promptInput.gaps) ? promptInput.gaps.length : 0,
    cvTipsCount: Array.isArray(promptInput.cvTips) ? promptInput.cvTips.length : 0,
    requirementsCount: Array.isArray(promptInput.requirements)
      ? promptInput.requirements.length
      : 0,
    cvCharLength: cvRawText.length,
  };

  try {
    const { data: tailoring, usage, model: usedModel } = await generate({
      system: SYSTEM,
      cacheableContext: `# CANDIDATE CV

${cvRawText.trim()}`,
      user: buildUser(promptInput),
      schema: TailorCvOutputSchema,
    });

    const { inputTokens, outputTokens, cachedTokens, cacheCreationTokens } = usage;

    if (tailoring.suggestions.length === 0) {
      throw new Error("The model returned no CV rewrite suggestions.");
    }

    const costUsd = calculateCostUsd({
      model: usedModel,
      inputTokens,
      outputTokens,
      cachedTokens,
      cacheCreationTokens,
    });

    // Create Artifact record linked to Match, Job, and optional Application
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        kind: ArtifactKind.CV_VARIANT,
        matchId: match.id,
        jobId: match.jobId,
        applicationId: match.application?.id || null,
        subject: `Tailored CV — ${match.job.title} at ${match.job.company}`,
        content: JSON.stringify(tailoring, null, 2),
        editedContent: null,
        editedAt: null,
        inputs: {
          ...inputsJson,
          suggestionsCount: tailoring.suggestions.length,
          unaddressableCount: tailoring.unaddressableRequirements.length,
        },
        model: usedModel,
        promptVersion: VERSION,
        inputTokens,
        outputTokens,
        costUsd: new Prisma.Decimal(costUsd),
      },
    });

    // Log ARTIFACT_GENERATED event on application history if application exists
    if (match.application?.id) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: match.application.id,
          type: "ARTIFACT_GENERATED",
          message: `Generated tailored CV variant (${tailoring.suggestions.length} section rewrites)`,
          payload: {
            artifactId: artifact.id,
            kind: ArtifactKind.CV_VARIANT,
            suggestionsCount: tailoring.suggestions.length,
          },
        },
      });
    }

    return {
      success: true,
      artifact,
      suggestions: tailoring.suggestions,
      unaddressableRequirements: tailoring.unaddressableRequirements,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to generate CV tailoring suggestions.";
    console.error(`CV tailoring generation failed for match ${matchId}:`, err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
