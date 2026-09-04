import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { generateTailoredCv } from "@/lib/ai/tailorCv";
import { ArtifactKind } from "@prisma/client";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

export const runtime = "nodejs";

const TailorRequestSchema = z.object({
  async: z.boolean().default(true),
});

/**
 * GET /api/matches/[matchId]/tailor
 * Retrieves the latest CV_VARIANT artifact for this match and user, if one exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const user = await requireUser();
    const { matchId } = await params;

    const artifact = await prisma.artifact.findFirst({
      where: {
        matchId,
        userId: user.id,
        kind: ArtifactKind.CV_VARIANT,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ artifact });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to view CV tailoring.", 401);
    }
    console.error("Error retrieving CV tailoring artifact:", err);
    return fail("INTERNAL", "Failed to retrieve tailoring artifact.", 500);
  }
}

/**
 * POST /api/matches/[matchId]/tailor
 * Generates CV tailoring recommendations grounded in match findings and candidate CV.
 * Triggers as a Trigger.dev task if configured, with resilient direct execution fallback.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const user = await requireUser();
    const { matchId } = await params;

    const match = await prisma.match.findFirst({
      where: { id: matchId, userId: user.id },
      include: {
        job: true,
      },
    });

    if (!match) {
      return fail("NOT_FOUND", "Match not found.", 404);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = TailorRequestSchema.safeParse(rawBody);
    const isAsync = parseResult.success ? parseResult.data.async : true;

    // Direct execution if async explicitly false or Trigger.dev not configured
    if (!isAsync || !process.env.TRIGGER_SECRET_KEY) {
      const result = await generateTailoredCv({
        userId: user.id,
        matchId,
      });

      if (!result.success) {
        return fail("INTERNAL", result.error || "Failed to generate CV tailoring.", 500);
      }

      return ok({
        artifact: result.artifact,
        suggestions: result.suggestions,
        unaddressableRequirements: result.unaddressableRequirements,
        isAsync: false,
      });
    }

    // Trigger.dev background execution
    try {
      const handle = await tasks.trigger(
        "tailor-cv",
        {
          userId: user.id,
          matchId,
        },
        {
          idempotencyKey: `tailor:${matchId}:${Date.now()}`,
        }
      );

      return ok({
        runId: handle.id,
        publicAccessToken: handle.publicAccessToken,
        isAsync: true,
      });
    } catch (triggerError) {
      console.warn(
        "Trigger.dev background dispatch failed, falling back to direct execution:",
        triggerError
      );
      const fallbackResult = await generateTailoredCv({
        userId: user.id,
        matchId,
      });

      if (!fallbackResult.success) {
        return fail("INTERNAL", fallbackResult.error || "Failed to generate CV tailoring.", 500);
      }

      return ok({
        artifact: fallbackResult.artifact,
        suggestions: fallbackResult.suggestions,
        unaddressableRequirements: fallbackResult.unaddressableRequirements,
        isAsync: false,
      });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to tailor your CV.", 401);
    }
    console.error("Error in tailor route:", err);
    return fail("INTERNAL", "Failed to process CV tailoring request.", 500);
  }
}
