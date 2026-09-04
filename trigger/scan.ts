import { task, tasks, logger } from "@trigger.dev/sdk";
import { runScan, type ScanResult } from "@/lib/scan/runScan";

/**
 * Thin wrapper around the scan orchestrator. The task owns no logic: it
 * supplies trigger.dev's logger and its batch-trigger fan-out, and lets
 * lib/scan/runScan.ts do the work.
 */

export interface ScanPayload {
  scanRunId: string;
}

/** The evaluation task fans out from here, one run per surviving job. */
const EVALUATE_TASK_ID = "evaluate";

export const scanTask = task({
  id: "scan",
  retry: { maxAttempts: 1 }, // a partly-done scan must not silently re-run
  // Hard 2-minute limit ceiling: scan and data fetching completes in under 30s.
  maxDuration: 120,
  run: async (payload: ScanPayload): Promise<ScanResult> =>
    runScan({
      scanRunId: payload.scanRunId,
      logger,
      dispatchEvaluations: async (requests) => {
        await tasks.batchTrigger(
          EVALUATE_TASK_ID,
          requests.map((r) => ({
            payload: r,
            options: {
              idempotencyKey: `eval:${r.userId}:${r.jobId}:${r.resumeId}`,
            },
          })),
        );
      },
    }),
});
