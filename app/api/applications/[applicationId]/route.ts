import { requireUser, UnauthorizedError } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { UpdateApplicationSchema } from "@/lib/validation/applications";
import { getApplicationDetail, updateApplicationMeta } from "@/lib/db/applications";
import { transition } from "@/lib/tracker/transition";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;

    const application = await getApplicationDetail(applicationId, user.id);
    if (!application) {
      return fail("NOT_FOUND", "Application not found.", 404);
    }

    return ok(application);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to view application.", 401);
    }
    console.error("Error fetching application:", err);
    return fail("INTERNAL", "Failed to fetch application.", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  try {
    const user = await requireUser();
    const { applicationId } = await params;

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = UpdateApplicationSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail("VALIDATION_FAILED", parseResult.error.issues[0]?.message || "Invalid payload.", 400);
    }

    const { status, notes, boardOrder, nextFollowUpAt, lastContactAt, message } = parseResult.data;

    // Verify application exists and belongs to user
    const current = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
    });

    if (!current) {
      return fail("NOT_FOUND", "Application not found.", 404);
    }

    // If status is provided, it MUST go through transition()
    if (status) {
      await transition(applicationId, user.id, status, message, boardOrder);
    }

    // Handle any metadata updates
    const hasMetaUpdates =
      notes !== undefined ||
      nextFollowUpAt !== undefined ||
      lastContactAt !== undefined ||
      (!status && boardOrder !== undefined);

    if (hasMetaUpdates) {
      await updateApplicationMeta(applicationId, user.id, {
        ...(notes !== undefined ? { notes } : {}),
        ...(boardOrder !== undefined && !status ? { boardOrder } : {}),
        ...(nextFollowUpAt !== undefined
          ? { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }
          : {}),
        ...(lastContactAt !== undefined
          ? { lastContactAt: lastContactAt ? new Date(lastContactAt) : null }
          : {}),
      });
    }

    const updated = await getApplicationDetail(applicationId, user.id);
    return ok(updated);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to update application.", 401);
    }
    console.error("Error updating application:", err);
    return fail("INTERNAL", "Failed to update application.", 500);
  }
}
