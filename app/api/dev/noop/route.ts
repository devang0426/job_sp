import { tasks, runs } from "@trigger.dev/sdk";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const triggerDevNoopSchema = z.object({
  recordId: z.string().optional(),
  shouldFail: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireUser();

    const body = await req.json().catch(() => ({}));
    const parseResult = triggerDevNoopSchema.safeParse(body);
    if (!parseResult.success) {
      return fail(
        "VALIDATION_FAILED",
        "Invalid parameters for background run.",
        400
      );
    }

    const { recordId, shouldFail, idempotencyKey } = parseResult.data;

    const handle = await tasks.trigger(
      "noop-task",
      { recordId, shouldFail },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return ok({
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    });
  } catch (error) {
    console.error("Failed to trigger noop background run:", error);
    return fail(
      "INTERNAL",
      "Failed to trigger background task.",
      500
    );
  }
}

export async function GET(req: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return fail(
        "VALIDATION_FAILED",
        "Missing runId parameter.",
        400
      );
    }

    const run = await runs.retrieve(runId);

    return ok({
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      attempts: run.attemptCount ?? 1,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
    });
  } catch (error) {
    console.error("Failed to retrieve run status:", error);
    return fail(
      "NOT_FOUND",
      "Run not found or failed to fetch status.",
      404
    );
  }
}
