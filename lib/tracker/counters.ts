import { prisma } from "@/lib/db";

export interface StatusCounters {
  live: number;
  overdue: number;
  dueToday: number;
}

/**
 * Computes live, overdue, and due-today counters for a given user.
 * - live: count of applications in non-terminal states
 * - overdue: count of applications with nextFollowUpAt < today 00:00:00 (in user's local day context or UTC)
 * - dueToday: count of applications with nextFollowUpAt within today [startOfDay, endOfDay]
 */
export async function getStatusCounters(userId: string): Promise<StatusCounters> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Live applications: not in terminal states (OFFER, REJECTED, DISCARDED, SKIP, HIRED)
  const [liveCount, overdueCount, dueTodayCount] = await Promise.all([
    prisma.application.count({
      where: {
        userId,
        status: {
          notIn: ["OFFER", "REJECTED", "DISCARDED", "SKIP", "HIRED"],
        },
      },
    }),
    prisma.application.count({
      where: {
        userId,
        nextFollowUpAt: {
          lt: startOfToday,
        },
      },
    }),
    prisma.application.count({
      where: {
        userId,
        nextFollowUpAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
  ]);

  return {
    live: liveCount,
    overdue: overdueCount,
    dueToday: dueTodayCount,
  };
}
