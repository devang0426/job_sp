import { task, wait } from "@trigger.dev/sdk";
import { prisma } from "@/lib/db";

export interface NoopPayload {
  recordId?: string;
  shouldFail?: boolean;
}

export const noopTask = task({
  id: "noop-task",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: NoopPayload) => {
    // Simulated failure for testing retry behavior and failure UI state
    if (payload.shouldFail) {
      throw new Error("Simulated task failure to verify retry and error states.");
    }

    // Sleep 3 seconds without blocking the route handler or client UI
    await wait.for({ seconds: 3 });

    // Verify DB connectivity if a recordId is supplied
    if (payload.recordId) {
      const userCount = await prisma.user.count();
      return {
        success: true,
        message: "NOOP background task executed successfully with DB access.",
        recordId: payload.recordId,
        userCount,
        executedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      message: "NOOP background task executed successfully.",
      executedAt: new Date().toISOString(),
    };
  },
});

