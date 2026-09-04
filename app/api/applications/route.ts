import { requireUser, UnauthorizedError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { ApplicationStatus, EventType } from "@prisma/client";
import { CreateApplicationSchema, ReorderColumnSchema } from "@/lib/validation/applications";
import { getBoardApplications, reorderColumn } from "@/lib/db/applications";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const board = await getBoardApplications(user.id);
    return ok(board);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to view applications.", 401);
    }
    console.error("Error fetching board applications:", err);
    return fail("INTERNAL", "Failed to fetch applications.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = CreateApplicationSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail("VALIDATION_FAILED", parseResult.error.issues[0]?.message || "Invalid payload.", 400);
    }

    const { jobId } = parseResult.data;

    // Verify Job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return fail("NOT_FOUND", "Job posting not found.", 404);
    }

    // Check if application already saved (idempotent no-op)
    const existing = await prisma.application.findUnique({
      where: { userId_jobId: { userId: user.id, jobId } },
    });

    if (existing) {
      return ok(existing);
    }

    // Find latest match if available
    const match = await prisma.match.findUnique({
      where: { userId_jobId: { userId: user.id, jobId } },
    });

    // Get current max boardOrder in EVALUATED
    const maxOrderApp = await prisma.application.findFirst({
      where: { userId: user.id, status: ApplicationStatus.EVALUATED },
      orderBy: { boardOrder: "desc" },
      select: { boardOrder: true },
    });

    const boardOrder = (maxOrderApp?.boardOrder ?? -1) + 1;

    // Create row in EVALUATED and write CREATED event
    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          userId: user.id,
          jobId,
          matchId: match?.id ?? null,
          status: ApplicationStatus.EVALUATED,
          boardOrder,
          statusChangedAt: new Date(),
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: app.id,
          type: EventType.CREATED,
          toStatus: ApplicationStatus.EVALUATED,
          message: `Saved to tracker from match report for ${job.title} at ${job.company}.`,
        },
      });

      return app;
    });

    return ok(application, 201);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to save this application.", 401);
    }
    console.error("Error saving application to tracker:", err);
    return fail("INTERNAL", "Failed to save application to tracker.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = ReorderColumnSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return fail("VALIDATION_FAILED", parseResult.error.issues[0]?.message || "Invalid payload.", 400);
    }

    const { columnStatus, orderedIds } = parseResult.data;
    await reorderColumn(user.id, columnStatus, orderedIds);

    return ok({ reordered: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", "Sign in to reorder applications.", 401);
    }
    console.error("Error reordering column:", err);
    return fail("INTERNAL", "Failed to reorder applications.", 500);
  }
}
