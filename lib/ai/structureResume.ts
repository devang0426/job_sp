import { prisma } from "@/lib/db";
import { calculateCostUsd } from "./cost";
import { generate } from "./generate";
import {
  VERSION,
  SYSTEM,
  buildUser,
  ResumeProfileSchema,
  ResumeProfile,
} from "./prompts/structureResume";
import { ParseStatus, Prisma } from "@prisma/client";

export interface StructuredResumePayload extends ResumeProfile {
  meta: {
    model: string;
    promptVersion: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    costUsd: number;
  };
}

export interface StructureResumeResult {
  success: boolean;
  structured?: StructuredResumePayload;
  error?: string;
}

/**
 * Parses raw CV text into a structured profile with skills, roles, education, and total experience.
 * Performs cost accounting and records the output or failure onto the database Resume record.
 */
export async function structureResume(resumeId: string): Promise<StructureResumeResult> {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    return { success: false, error: "Resume not found." };
  }

  if (!resume.rawText || !resume.rawText.trim()) {
    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        parseStatus: ParseStatus.FAILED,
        parseError: "Resume raw text is empty.",
      },
    });
    return { success: false, error: "Resume raw text is empty." };
  }

  try {
    const { data: profile, usage, model: usedModel } = await generate({
      system: SYSTEM,
      user: buildUser(resume.rawText),
      schema: ResumeProfileSchema,
    });

    const { inputTokens, outputTokens, cachedTokens, cacheCreationTokens } = usage;

    const costUsd = calculateCostUsd({
      model: usedModel,
      inputTokens,
      outputTokens,
      cachedTokens,
      cacheCreationTokens,
    });

    const structuredPayload: StructuredResumePayload = {
      skills: profile.skills,
      roles: profile.roles,
      education: profile.education,
      totalYearsExperience: profile.totalYearsExperience,
      meta: {
        model: usedModel,
        promptVersion: VERSION,
        inputTokens,
        outputTokens,
        cachedTokens,
        costUsd,
      },
    };

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        structured: structuredPayload as unknown as Prisma.InputJsonValue,
        structuredAt: new Date(),
        parseStatus: ParseStatus.PARSED,
        parseError: null,
      },
    });

    return {
      success: true,
      structured: structuredPayload,
    };
  } catch (err: unknown) {
    console.error(`Failed to structure resume ${resumeId}:`, err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to structure resume with AI.";

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        parseStatus: ParseStatus.FAILED,
        parseError: errorMessage,
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
