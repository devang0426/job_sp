import { runs } from "@trigger.dev/sdk";
import { requireUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireUser();
    const { runId } = await params;

    if (!runId) {
      return fail(
        "VALIDATION_FAILED",
        "Run ID is required.",
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
    console.error("Failed to retrieve run:", error);
    return fail(
      "NOT_FOUND",
      "Run status not found.",
      404
    );
  }
}
