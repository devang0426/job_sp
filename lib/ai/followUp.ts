import { prisma } from "@/lib/db";
import { calculateCostUsd } from "./cost";
import { generate } from "./generate";
import {
  VERSION,
  SYSTEM,
  buildUser,
  FollowUpInput,
  FollowUpOutputSchema,
} from "./prompts/followUp";
import { Artifact, ArtifactKind, Prisma } from "@prisma/client";

export interface GenerateFollowUpParams {
  userId: string;
  applicationId: string;
  tone?: "direct" | "warm";
  userContextNote?: string | null;
}

export interface GenerateFollowUpResult {
  success: boolean;
  artifact?: Artifact;
  error?: string;
}

/**
 * Generates an editable follow-up email draft grounded in application and match context.
 * Uses Gemini API when configured, or Anthropic Claude with zodOutputFormat fallback.
 * Persists the result as an Artifact with kind: FOLLOW_UP_EMAIL, recording costUsd,
 * promptVersion, inputs, content (Claude draft), and editedContent (null initially).
 *
 * NOTE: The system NEVER sends the email. Generating a draft does not mark anything as sent.
 */
export async function generateFollowUpDraft({
  userId,
  applicationId,
  tone = "direct",
  userContextNote,
}: GenerateFollowUpParams): Promise<GenerateFollowUpResult> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: true,
      match: true,
    },
  });

  if (!application) {
    return { success: false, error: `Application ${applicationId} not found.` };
  }

  // Calculate days since applied if appliedAt is available
  let daysSinceApplied: number | null = null;
  if (application.appliedAt) {
    const diffMs = Date.now() - new Date(application.appliedAt).getTime();
    daysSinceApplied = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const promptInput: FollowUpInput = {
    company: application.job.company,
    role: application.job.title,
    appliedAt: application.appliedAt,
    daysSinceApplied,
    currentStatus: application.status,
    matchSummary: application.match?.summary || null,
    tone,
    userContextNote: userContextNote || null,
  };

  const inputsJson = {
    company: promptInput.company,
    role: promptInput.role,
    currentStatus: promptInput.currentStatus,
    appliedAt: promptInput.appliedAt ? new Date(promptInput.appliedAt).toISOString() : null,
    daysSinceApplied,
    tone,
    userContextNote: userContextNote || null,
  };

  try {
    const { data: draft, usage, model: usedModel } = await generate({
      system: SYSTEM,
      user: buildUser(promptInput),
      schema: FollowUpOutputSchema,
      maxOutputTokens: 2048,
    });

    const { inputTokens, outputTokens, cachedTokens, cacheCreationTokens } = usage;

    if (!draft.body.trim()) {
      throw new Error("The model returned an empty follow-up body.");
    }

    const costUsd = calculateCostUsd({
      model: usedModel,
      inputTokens,
      outputTokens,
      cachedTokens,
      cacheCreationTokens,
    });

    // Create Artifact record linked to the Application
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        kind: ArtifactKind.FOLLOW_UP_EMAIL,
        applicationId,
        jobId: application.jobId,
        matchId: application.matchId,
        subject: draft.subject,
        content: draft.body,
        editedContent: null,
        editedAt: null,
        inputs: inputsJson,
        model: usedModel,
        promptVersion: VERSION,
        inputTokens,
        outputTokens,
        costUsd: new Prisma.Decimal(costUsd),
      },
    });

    // Log ARTIFACT_GENERATED event on the application history
    await prisma.applicationEvent.create({
      data: {
        applicationId,
        type: "ARTIFACT_GENERATED",
        message: `Generated follow-up email draft (${tone} tone)`,
        payload: {
          artifactId: artifact.id,
          kind: ArtifactKind.FOLLOW_UP_EMAIL,
          tone,
        },
      },
    });

    return {
      success: true,
      artifact,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to generate follow-up email.";
    console.error(`Follow-up draft generation failed for application ${applicationId}:`, err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
