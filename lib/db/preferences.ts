import { prisma } from "@/lib/db";
import { PreferencesInput } from "@/lib/validation/preferences";
import { Preferences } from "@prisma/client";
import { syncAutoScanSchedule } from "@/lib/scan/autoScanSchedule";

export async function getPreferences(userId: string): Promise<Preferences | null> {
  return prisma.preferences.findUnique({
    where: { userId },
  });
}

export async function upsertPreferences(
  userId: string,
  data: PreferencesInput,
): Promise<Preferences> {
  const clampedMaxJobs = Math.min(data.maxJobsPerScan ?? 40, 60);

  const before = await prisma.preferences.findUnique({
    where: { userId },
    select: { autoScanScheduleId: true },
  });

  const saved = await prisma.preferences.upsert({
    where: { userId },
    create: {
      userId,
      targetRoles: data.targetRoles,
      locations: data.locations,
      remoteOnly: data.remoteOnly,
      employmentTypes: data.employmentTypes,
      seniority: data.seniority ?? null,
      minSalary: data.minSalary ?? null,
      salaryCurrency: data.salaryCurrency,
      keywords: data.keywords,
      excludeKeywords: data.excludeKeywords,
      excludedCompanies: data.excludedCompanies,
      sources: data.sources,
      maxJobsPerScan: clampedMaxJobs,
      autoEvaluate: data.autoEvaluate,
      autoScanEnabled: data.autoScanEnabled,
      autoScanIntervalMinutes: data.autoScanIntervalMinutes,
    },
    update: {
      targetRoles: data.targetRoles,
      locations: data.locations,
      remoteOnly: data.remoteOnly,
      employmentTypes: data.employmentTypes,
      seniority: data.seniority ?? null,
      minSalary: data.minSalary ?? null,
      salaryCurrency: data.salaryCurrency,
      keywords: data.keywords,
      excludeKeywords: data.excludeKeywords,
      excludedCompanies: data.excludedCompanies,
      sources: data.sources,
      maxJobsPerScan: clampedMaxJobs,
      autoEvaluate: data.autoEvaluate,
      autoScanEnabled: data.autoScanEnabled,
      autoScanIntervalMinutes: data.autoScanIntervalMinutes,
    },
  });

  // Register / update / delete this user's trigger.dev CRON schedule to
  // match the toggle. Never throws.
  const { scheduleId } = await syncAutoScanSchedule(userId, {
    enabled: saved.autoScanEnabled,
    intervalMinutes: saved.autoScanIntervalMinutes,
    existingScheduleId: before?.autoScanScheduleId ?? null,
  });

  if (scheduleId !== (before?.autoScanScheduleId ?? null)) {
    return prisma.preferences.update({
      where: { userId },
      data: { autoScanScheduleId: scheduleId },
    });
  }

  return saved;
}

export async function completeOnboarding(userId: string) {
  const [user, preferences, resumeCount, latestResume] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true, onboardedAt: true },
    }),
    prisma.preferences.findUnique({
      where: { userId },
    }),
    prisma.resume.count({
      where: { userId },
    }),
    prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);

  // Refuses when no resume exists at all
  if (!user?.activeResumeId && resumeCount === 0) {
    return { error: "NO_ACTIVE_RESUME" as const };
  }

  // If user has a resume but activeResumeId wasn't linked, auto-link it
  if (!user?.activeResumeId && latestResume) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeResumeId: latestResume.id },
    }).catch(() => {});
  }

  // Requirement: Preferences must exist before stamping onboardedAt
  if (!preferences || preferences.targetRoles.length === 0) {
    return { error: "NO_PREFERENCES" as const };
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
    select: { onboardedAt: true },
  });

  return {
    success: true as const,
    onboardedAt: updatedUser.onboardedAt,
  };
}
