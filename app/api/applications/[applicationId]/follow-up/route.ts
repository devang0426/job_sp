import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { generateFollowUpDraft } from "@/lib/ai/followUp";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

export const runtime = "nodejs";

const FollowUpRequestSchema = z.object({
  tone: z.enum(["direct", "warm"]).default("direct"),
  userContextNote: z.string().max(1000).optional().nullable(),
  async: z.boolean().default(true), // defaults to trigger task flow
});

/**
 * POST /api/applications/[applicationId]/follow-up
 * Generates an editable follow-up email draft grounded in application context.
 * Can trigger as a background task (async: true, default) or run synchronously (async: false or dev).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: {
        job: true,
        match: true,
      },
    });

    if (!application) {
      return fail("NOT_FOUND", "Application not found.", 404);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = FollowUpRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail(
        "VALIDATION_FAILED",
        parseResult.error.issues[0]?.message || "Invalid follow-up parameters.",
        400
      );
    }

    const { tone, userContextNote, async: isAsync } = parseResult.data;

    // In local dev without Trigger.dev dev worker or if explicitly sync requested, execute directly
    if (!isAsync || !process.env.TRIGGER_SECRET_KEY) {
      const result = await generateFollowUpDraft({
        userId: user.id,
        applicationId,
        tone,
        userContextNote,
      });

      if (!result.success) {
        return fail("INTERNAL", result.error || "Failed to generate follow-up draft.", 500);
      }

      return ok({
        artifact: result.artifact,
        isAsync: false,
      });
    }

    // Trigger.dev background task execution (per three-tier flow)
    try {
      const handle = await tasks.trigger(
        "follow-up",
        {
          userId: user.id,
          applicationId,
          tone,
          userContextNote,
        },
        {
          idempotencyKey: `followup:${applicationId}:${Date.now()}`,
        }
      );

      return ok({
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken,
        isAsync: true,
      });
    } catch (triggerError) {
      console.warn("Trigger.dev background dispatch failed, falling back to direct execution:", triggerError);
      // Resilient fallback to direct execution
      const fallbackResult = await generateFollowUpDraft({
        userId: user.id,
        applicationId,
        tone,
        userContextNote,
      });

      if (!fallbackResult.success) {
        return fail("INTERNAL", fallbackResult.error || "Failed to generate follow-up draft.", 500);
      }

      return ok({
        artifact: fallbackResult.artifact,
        isAsync: false,
      });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to generate follow-up draft.", 401);
    }
    console.error("Error in follow-up route:", err);
    return fail("INTERNAL", "Failed to process follow-up draft request.", 500);
  }
}
