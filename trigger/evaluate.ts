import { task, logger } from "@trigger.dev/sdk";
import { evaluateJob } from "@/lib/ai/evaluate";

export interface EvaluateTaskPayload {
  userId: string;
  jobId: string;
  resumeId: string;
}

/**
 * Task id must be "evaluate" as required by the scan fan-out contract.
 * Accepts { userId, jobId, resumeId } and runs prompt-cached match evaluation.
 */
export const evaluateTask = task({
  id: "evaluate",
  maxDuration: 60,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: EvaluateTaskPayload, { ctx }) => {
    logger.info(`Starting evaluate task for user ${payload.userId}, job ${payload.jobId}`);

    const result = await evaluateJob({
      userId: payload.userId,
      jobId: payload.jobId,
      resumeId: payload.resumeId,
      triggerRunId: ctx?.run?.id,
    });

    if (!result.success) {
      logger.error(`Evaluate task failed for job ${payload.jobId}: ${result.error}`);
      throw new Error(result.error || "Match evaluation task failed.");
    }

    logger.info(`Evaluate task succeeded for job ${payload.jobId}, score: ${result.match?.score}`);
    return result;
  },
});
