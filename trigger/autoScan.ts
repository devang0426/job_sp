import { schedules, logger } from "@trigger.dev/sdk";
import { autoScanForUser } from "@/lib/scan/autoScanSchedule";

/**
 * Per-user auto-scan.
 *
 * This task has NO declarative `cron` — it never runs on its own. A CRON
 * schedule is attached to it per user, only while that user has auto-scan
 * enabled in their preferences (see lib/scan/autoScanSchedule.ts). Each
 * firing carries that user's id as `payload.externalId`, and we scan only
 * them, restricted to the unmetered sources.
 */
export const autoScanSweep = schedules.task({
  id: "auto-scan-sweep",
  run: async (payload) => {
    const userId = payload.externalId;
    if (!userId) {
      logger.warn("auto-scan-sweep fired with no externalId — nothing to do");
      return { skipped: "no externalId" };
    }
    const outcome = await autoScanForUser(userId);
    logger.info(`auto-scan-sweep for ${userId}: ${outcome}`);
    return { userId, outcome };
  },
});
