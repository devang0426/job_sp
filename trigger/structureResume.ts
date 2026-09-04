import { task } from "@trigger.dev/sdk";
import { structureResume } from "@/lib/ai/structureResume";

export interface StructureResumeTaskPayload {
  resumeId: string;
}

export const structureResumeTask = task({
  id: "structure-resume",
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: StructureResumeTaskPayload) => {
    const result = await structureResume(payload.resumeId);
    if (!result.success) {
      throw new Error(result.error || "CV structuring task failed.");
    }
    return result;
  },
});
