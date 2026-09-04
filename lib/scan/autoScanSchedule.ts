import { schedules } from "@trigger.dev/sdk";
import { prisma } from "@/lib/db";

/**
 * Per-user scheduling for the auto-scan feature.
 *
 * There is deliberately no global cron on the `auto-scan-sweep` task — a
 * schedule that fires every few minutes regardless of whether anyone wants
 * it is waste. Instead, when a user turns auto-scan on in their preferences we
 * register one trigger.dev CRON schedule for them (keyed to their user id),
 * and delete it when they turn it off. The task's `run` then scans exactly
 * the user named by the schedule's `externalId`.
 */

const INTERVAL_CRON: Record<number, string> = {
  15: "*/15 * * * *",
  30: "*/30 * * * *",
  60: "0 * * * *",
  120: "0 */2 * * *",
  240: "0 */4 * * *",
  480: "0 */8 * * *",
  1440: "0 3 * * *",
};

export const AUTO_SCAN_TASK_ID = "auto-scan-sweep";
const dedupeKey = (userId: string) => `autoscan:${userId}`;

/**
 * Bring the user's trigger.dev schedule in line with their preferences.
 * Safe to call on every preferences save. Never throws — a scheduling
 * hiccup must not fail the preferences write; it is logged and retried on
 * the next save.
 */
export async function syncAutoScanSchedule(
  userId: string,
  opts: { enabled: boolean; intervalMinutes: number; existingScheduleId: string | null },
): Promise<{ scheduleId: string | null }> {
  try {
    if (!opts.enabled) {
      if (opts.existingScheduleId) {
        await schedules.del(opts.existingScheduleId).catch(() => {});
      }
      return { scheduleId: null };
    }

    const cron = INTERVAL_CRON[opts.intervalMinutes] ?? INTERVAL_CRON[60];
    // create() with a stable deduplicationKey is create-or-update, so this
    // also handles an interval change on an already-enabled user.
    const schedule = await schedules.create({
      task: AUTO_SCAN_TASK_ID,
      cron,
      deduplicationKey: dedupeKey(userId),
      externalId: userId,
    });
    return { scheduleId: schedule.id };
  } catch (err) {
    console.error(
      `syncAutoScanSchedule(${userId}) failed:`,
      err instanceof Error ? err.message : err,
    );
    // Leave the stored id as-is; the next preferences save retries.
    return { scheduleId: opts.existingScheduleId };
  }
}

/**
 * Run one auto-scan for the user a schedule points at. Called by the
 * `auto-scan-sweep` task with the schedule's `externalId`.
 */
export async function autoScanForUser(userId: string): Promise<string> {
  const { startScan } = await import("./startScan");
  const prefs = await prisma.preferences.findUnique({
    where: { userId },
    select: { autoScanEnabled: true, targetRoles: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true, onboardedAt: true, activeResumeId: true },
  });

  if (!prefs?.autoScanEnabled) return "skipped: auto-scan disabled";
  if (!prefs.targetRoles.length) return "skipped: no target roles";
  if (!user || user.deletedAt || !user.onboardedAt || !user.activeResumeId) {
    return "skipped: user not eligible";
  }

  const r = await startScan({
    userId,
    trigger: "SCHEDULED",
    sourcesOverride: ["GREENHOUSE", "LEVER", "ASHBY", "SCRAPED"],
  });
  await prisma.preferences.update({ where: { userId }, data: { lastAutoScanAt: new Date() } });
  return r.ok ? `started scan ${r.scanRun.id}` : `not started: ${r.reason}`;
}
