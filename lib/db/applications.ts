import { prisma } from "@/lib/db";
import { ApplicationStatus, Prisma } from "@prisma/client";
import { STATUS_ORDER } from "@/lib/tracker/states";

export type ApplicationBoardItem = Prisma.ApplicationGetPayload<{
  include: {
    job: {
      select: {
        id: true;
        title: true;
        company: true;
        location: true;
        isRemote: true;
        salaryMin: true;
        salaryMax: true;
        salaryCurrency: true;
        applyUrl: true;
      };
    };
    match: {
      select: {
        id: true;
        score: true;
        recommendation: true;
      };
    };
  };
}>;

export type BoardColumns = Record<ApplicationStatus, ApplicationBoardItem[]>;

export interface BoardPayload {
  columns: BoardColumns;
  counts: Record<ApplicationStatus, number>;
  totalCount: number;
}

/**
 * Fetch all applications for a user, sorted by boardOrder asc, then statusChangedAt desc,
 * and grouped into the 9 canonical status columns.
 */
export async function getBoardApplications(userId: string): Promise<BoardPayload> {
  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: [
      { boardOrder: "asc" },
      { statusChangedAt: "desc" },
    ],
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          isRemote: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          applyUrl: true,
        },
      },
      match: {
        select: {
          id: true,
          score: true,
          recommendation: true,
        },
      },
    },
  });

  // Initialize all canonical status columns in declaration order
  const columns: BoardColumns = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as BoardColumns);

  const counts: Record<ApplicationStatus, number> = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  for (const app of applications) {
    if (columns[app.status]) {
      columns[app.status].push(app);
      counts[app.status] += 1;
    }
  }

  return {
    columns,
    counts,
    totalCount: applications.length,
  };
}

/** One application with everything the detail screen renders. */
export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplicationDetail>>
>;

/**
 * Fetch a single application detail with full job, match, ordered events, and artifacts.
 */
export async function getApplicationDetail(applicationId: string, userId: string) {
  return prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: true,
      match: true,
      events: {
        orderBy: { createdAt: "desc" },
      },
      artifacts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Reorder applications within a single status column.
 * Writes NO events (only updates boardOrder).
 */
export async function reorderColumn(
  userId: string,
  columnStatus: ApplicationStatus,
  orderedIds: string[],
) {
  return prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.application.updateMany({
        where: { id, userId, status: columnStatus },
        data: { boardOrder: index },
      })
    )
  );
}

/**
 * Update metadata (notes, follow-up dates, etc.)
 */
export async function updateApplicationMeta(
  applicationId: string,
  userId: string,
  data: {
    notes?: string | null;
    nextFollowUpAt?: Date | null;
    lastContactAt?: Date | null;
    boardOrder?: number;
  },
) {
  return prisma.application.update({
    where: { id: applicationId, userId },
    data,
  });
}
