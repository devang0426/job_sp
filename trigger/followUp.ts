import { task, logger } from "@trigger.dev/sdk";
import { generateFollowUpDraft } from "@/lib/ai/followUp";

export interface FollowUpTaskPayload {
  userId: string;
  applicationId: string;
  tone?: "direct" | "warm";
  userContextNote?: string | null;
}

/**
 * Task id: "follow-up"
 * Generates an editable follow-up email draft asynchronously per the three-tier flow.
 */
export const followUpTask = task({
  id: "follow-up",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: FollowUpTaskPayload) => {
    logger.info(`Starting follow-up task for application ${payload.applicationId}`);

    const result = await generateFollowUpDraft({
      userId: payload.userId,
      applicationId: payload.applicationId,
      tone: payload.tone,
      userContextNote: payload.userContextNote,
    });

    if (!result.success) {
      logger.error(`Follow-up task failed for application ${payload.applicationId}: ${result.error}`);
      throw new Error(result.error || "Follow-up email generation task failed.");
    }

    logger.info(`Follow-up task completed successfully: artifact ${result.artifact?.id}`);
    return result;
  },
});
