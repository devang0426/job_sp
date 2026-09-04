import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateArtifactSchema = z.object({
  subject: z.string().optional().nullable(),
  editedContent: z.string().nullable().optional(),
  revert: z.boolean().optional(),
});

/**
 * GET /api/artifacts/[artifactId]
 * Retrieve an artifact belonging to the authenticated user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  try {
    const user = await requireUser();
    const { artifactId } = await params;

    const artifact = await prisma.artifact.findFirst({
      where: { id: artifactId, userId: user.id },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!artifact) {
      return fail("NOT_FOUND", "Artifact not found.", 404);
    }

    return ok(artifact);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to view artifact.", 401);
    }
    console.error("Error fetching artifact:", err);
    return fail("INTERNAL", "Failed to fetch artifact.", 500);
  }
}

/**
 * PATCH /api/artifacts/[artifactId]
 * Updates artifact content (saving editedContent while keeping content untouched),
 * or reverts to the original generated draft.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  try {
    const user = await requireUser();
    const { artifactId } = await params;

    const artifact = await prisma.artifact.findFirst({
      where: { id: artifactId, userId: user.id },
    });

    if (!artifact) {
      return fail("NOT_FOUND", "Artifact not found.", 404);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = UpdateArtifactSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail(
        "VALIDATION_FAILED",
        parseResult.error.issues[0]?.message || "Invalid payload.",
        400
      );
    }

    const { subject, editedContent, revert } = parseResult.data;

    let updated;
    if (revert) {
      // Revert to generated original: set editedContent to null
      updated = await prisma.artifact.update({
        where: { id: artifactId },
        data: {
          editedContent: null,
          editedAt: null,
        },
      });
    } else {
      // Persist user edits to editedContent and update editedAt, leaving content intact
      updated = await prisma.artifact.update({
        where: { id: artifactId },
        data: {
          ...(subject !== undefined ? { subject } : {}),
          ...(editedContent !== undefined
            ? {
                editedContent,
                editedAt: new Date(),
              }
            : {}),
        },
      });
    }

    return ok(updated);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to update artifact.", 401);
    }
    console.error("Error updating artifact:", err);
    return fail("INTERNAL", "Failed to update artifact.", 500);
  }
}
