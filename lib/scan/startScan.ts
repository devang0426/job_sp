import { tasks } from "@trigger.dev/sdk";
import { Prisma } from "@prisma/client";
import type { JobSource, ScanRun, ScanTrigger } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPreferences } from "@/lib/db/preferences";
import { findActiveScanRun } from "@/lib/db/scanRuns";
import { buildQuerySnapshot } from "@/lib/sources/scanPlan";

/**
 * Start one scan for one user: validate, create the `ScanRun` in `QUEUED`,
 * trigger the orchestrator task, return the record id. Shared by the
 * `POST /api/scans` route and the `auto-scan-sweep` scheduled task so both
 * paths behave identically (concurrency guard, snapshot, three-tier flow).
 */

export type StartScanFailure =
  | "NO_PREFERENCES"
  | "NO_TARGET_ROLES"
  | "SCAN_IN_PROGRESS"
  | "TRIGGER_FAILED";

export type StartScanResult =
  | { ok: true; scanRun: Pick<ScanRun, "id" | "status"> }
  | { ok: false; reason: StartScanFailure; message: string };

export interface StartScanOptions {
  userId: string;
  trigger?: ScanTrigger;
  /** Restrict the scan to these sources regardless of saved preferences. */
  sourcesOverride?: JobSource[];
}

export async function startScan({
  userId,
  trigger = "MANUAL",
  sourcesOverride,
}: StartScanOptions): Promise<StartScanResult> {
  const prefs = await getPreferences(userId);
  if (!prefs) {
    return { ok: false, reason: "NO_PREFERENCES", message: "Set your scan preferences first." };
  }
  if (prefs.targetRoles.length === 0) {
    return {
      ok: false,
      reason: "NO_TARGET_ROLES",
      message: "Add your target roles in preferences before running a scan.",
    };
  }

  const active = await findActiveScanRun(userId);
  if (active) {
    return {
      ok: false,
      reason: "SCAN_IN_PROGRESS",
      message: "A scan is already running. Wait for it to finish before starting another.",
    };
  }

  const snapshot = buildQuerySnapshot(prefs);
  if (sourcesOverride) {
    snapshot.sources = prefs.sources.filter((s) => sourcesOverride.includes(s));
    if (snapshot.sources.length === 0) snapshot.sources = sourcesOverride;
  }

  const scanRun = await prisma.scanRun.create({
    data: {
      userId,
      status: "QUEUED",
      trigger,
      querySnapshot: snapshot as unknown as Prisma.InputJsonValue,
      sourcesUsed: snapshot.sources,
    },
  });

  try {
    const handle = await tasks.trigger(
      "scan",
      { scanRunId: scanRun.id },
      { idempotencyKey: `scan:${scanRun.id}` },
    );
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: { triggerRunId: handle.id },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to trigger scan task:", errorMessage, error);
    await prisma.scanRun.update({
      where: { id: scanRun.id },
      data: {
        status: "FAILED",
        error: `Could not start the scan task: ${errorMessage}. Check TRIGGER_SECRET_KEY and Trigger.dev configuration.`,
        finishedAt: new Date(),
      },
    });
    return {
      ok: false,
      reason: "TRIGGER_FAILED",
      message: "Couldn't start the scan task. Try again in a moment.",
    };
  }

  return { ok: true, scanRun: { id: scanRun.id, status: scanRun.status } };
}
