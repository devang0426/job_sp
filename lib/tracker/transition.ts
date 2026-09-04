import { prisma } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";

/**
 * Every status write updates status and statusChangedAt and inserts
 * an ApplicationEvent, in one transaction. (Invariant 5)
 */
export async function transition(
  applicationId: string,
  userId: string,
  toStatus: ApplicationStatus,
  message?: string,
  boardOrder?: number,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.application.findFirstOrThrow({
      where: { id: applicationId, userId },
    });
    if (current.status === toStatus && boardOrder === undefined) return current;

    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: toStatus,
        statusChangedAt: current.status !== toStatus ? new Date() : current.statusChangedAt,
        ...(boardOrder !== undefined ? { boardOrder } : {}),
        ...(toStatus === "APPLIED" && !current.appliedAt
          ? { appliedAt: new Date() }
          : {}),
      },
    });

    if (current.status !== toStatus) {
      await tx.applicationEvent.create({
        data: {
          applicationId,
          type: "STATUS_CHANGED",
          fromStatus: current.status,
          toStatus,
          message,
        },
      });
    }

    return updated;
  });
}
