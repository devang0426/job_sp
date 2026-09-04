import { task, logger } from "@trigger.dev/sdk";
import { generateTailoredCv } from "@/lib/ai/tailorCv";

export interface TailorCvTaskPayload {
  userId: string;
  matchId: string;
}

/**
 * Task id: "tailor-cv"
 * Generates CV tailoring recommendations asynchronously per the three-tier flow.
 */
export const tailorCvTask = task({
  id: "tailor-cv",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: TailorCvTaskPayload) => {
    logger.info(`Starting tailor-cv task for match ${payload.matchId}`);

    const result = await generateTailoredCv({
      userId: payload.userId,
      matchId: payload.matchId,
    });

    if (!result.success) {
      logger.error(`tailor-cv task failed for match ${payload.matchId}: ${result.error}`);
      throw new Error(result.error || "CV tailoring generation task failed.");
    }

    logger.info(`tailor-cv task completed successfully: artifact ${result.artifact?.id}`);
    return result;
  },
});
