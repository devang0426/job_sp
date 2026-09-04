import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { JobSource, ScanRun, ScanStatus } from "@prisma/client";

/**
 * Persistence for scan runs. A `ScanRun` is the record the scan API
 * creates in `QUEUED`, the orchestrator task fills in, and the scans
 * screen subscribes to. See context/data-model.md and
 * context/features/feature-14-scan-orchestration.md.
 */

/** Per-source tally stored on `ScanRun.sourceStats`. */
export interface SourceStat {
  requests: number;
  returned: number;
  errors: string[];
}

export type SourceStats = Record<string, SourceStat>;

/**
 * The frozen copy of `Preferences` taken at scan time. Makes a run
 * reproducible and explains a stale result set after the user edits
 * their preferences.
 */
export interface QuerySnapshot {
  capturedAt: string;
  targetRoles: string[];
  keywords: string[];
  locations: string[];
  remoteOnly: boolean;
  seniority: string | null;
  employmentTypes: string[];
  excludeKeywords: string[];
  excludedCompanies: string[];
  minSalary: number | null;
  salaryCurrency: string;
  sources: JobSource[];
  maxJobsPerScan: number;
  autoEvaluate: boolean;
}

/** Shape returned to the API / UI — dates serialized, duration derived. */
export interface ScanRunView {
  id: string;
  status: ScanStatus;
  trigger: ScanRun["trigger"];
  sourcesUsed: JobSource[];
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsFiltered: number;
  evaluationsQueued: number;
  evaluationsCompleted?: number;
  evaluationsPending?: number;
  evaluationsFailed?: number;
  sourceStats: SourceStats | null;
  querySnapshot: QuerySnapshot | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

const ACTIVE_STATUSES: ScanStatus[] = ["QUEUED", "RUNNING"];

/** A run left QUEUED/RUNNING longer than this is treated as abandoned. */
const STALE_ACTIVE_MS = 15 * 60 * 1000;

export function toScanRunView(
  row: ScanRun,
  extra?: unknown,
): ScanRunView {
  const details =
    typeof extra === "object" && extra !== null
      ? (extra as {
          evaluationsCompleted?: number;
          evaluationsPending?: number;
          evaluationsFailed?: number;
        })
      : undefined;

  const start = row.startedAt ?? row.createdAt;
  const end = row.finishedAt;
  return {
    id: row.id,
    status: row.status,
    trigger: row.trigger,
    sourcesUsed: row.sourcesUsed,
    jobsFound: row.jobsFound,
    jobsNew: row.jobsNew,
    jobsUpdated: row.jobsUpdated,
    jobsFiltered: row.jobsFiltered,
    evaluationsQueued: row.evaluationsQueued,
    evaluationsCompleted: details?.evaluationsCompleted,
    evaluationsPending: details?.evaluationsPending,
    evaluationsFailed: details?.evaluationsFailed,
    sourceStats: (row.sourceStats as unknown as SourceStats | null) ?? null,
    querySnapshot:
      (row.querySnapshot as unknown as QuerySnapshot | null) ?? null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    durationMs: end ? end.getTime() - start.getTime() : null,
  };
}

/**
 * The user's currently-running scan, if any. Ignores runs that have been
 * stuck in an active state past `STALE_ACTIVE_MS` — a crashed task must
 * not lock the user out of scanning forever.
 */
export async function findActiveScanRun(userId: string): Promise<ScanRun | null> {
  const cutoff = new Date(Date.now() - STALE_ACTIVE_MS);
  return prisma.scanRun.findFirst({
    where: {
      userId,
      status: { in: ACTIVE_STATUSES },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createQueuedScanRun(params: {
  userId: string;
  querySnapshot: QuerySnapshot;
  sourcesUsed: JobSource[];
}): Promise<ScanRun> {
  return prisma.scanRun.create({
    data: {
      userId: params.userId,
      status: "QUEUED",
      trigger: "MANUAL",
      querySnapshot: params.querySnapshot as unknown as Prisma.InputJsonValue,
      sourcesUsed: params.sourcesUsed,
    },
  });
}

export async function attachTriggerRunId(
  scanRunId: string,
  triggerRunId: string,
): Promise<void> {
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: { triggerRunId },
  });
}

export async function markScanRunStarted(scanRunId: string): Promise<void> {
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export interface FinalizeScanRunInput {
  status: Extract<ScanStatus, "SUCCEEDED" | "PARTIAL" | "FAILED">;
  sourcesUsed: JobSource[];
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsFiltered: number;
  evaluationsQueued: number;
  sourceStats: SourceStats;
  error?: string | null;
}

export async function updateScanRunProgress(
  scanRunId: string,
  data: {
    jobsFound?: number;
    jobsNew?: number;
    jobsUpdated?: number;
    jobsFiltered?: number;
    evaluationsQueued?: number;
    sourceStats?: SourceStats;
  },
): Promise<void> {
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      ...(data.jobsFound !== undefined ? { jobsFound: data.jobsFound } : {}),
      ...(data.jobsNew !== undefined ? { jobsNew: data.jobsNew } : {}),
      ...(data.jobsUpdated !== undefined ? { jobsUpdated: data.jobsUpdated } : {}),
      ...(data.jobsFiltered !== undefined ? { jobsFiltered: data.jobsFiltered } : {}),
      ...(data.evaluationsQueued !== undefined ? { evaluationsQueued: data.evaluationsQueued } : {}),
      ...(data.sourceStats
        ? { sourceStats: data.sourceStats as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function finalizeScanRun(
  scanRunId: string,
  input: FinalizeScanRunInput,
): Promise<void> {
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      status: input.status,
      sourcesUsed: input.sourcesUsed,
      jobsFound: input.jobsFound,
      jobsNew: input.jobsNew,
      jobsUpdated: input.jobsUpdated,
      jobsFiltered: input.jobsFiltered,
      evaluationsQueued: input.evaluationsQueued,
      sourceStats: input.sourceStats as unknown as Prisma.InputJsonValue,
      error: input.error ?? null,
      finishedAt: new Date(),
    },
  });
}

export async function failScanRun(
  scanRunId: string,
  error: string,
): Promise<void> {
  await prisma.scanRun.update({
    where: { id: scanRunId },
    data: { status: "FAILED", error, finishedAt: new Date() },
  });
}

/** One run's raw row, scoped to its owner. */
export async function getScanRunRow(
  userId: string,
  scanRunId: string,
): Promise<ScanRun | null> {
  return prisma.scanRun.findFirst({ where: { id: scanRunId, userId } });
}

/** Raw row for the orchestrator (needs `userId` + `querySnapshot`). */
export async function getScanRunRecord(scanRunId: string): Promise<ScanRun | null> {
  return prisma.scanRun.findUnique({ where: { id: scanRunId } });
}

export interface ListScanRunsResult {
  rows: ScanRun[];
  nextCursor: string | null;
}

/** A page of raw rows, newest first. Callers reconcile, then map to views. */
export async function listScanRunRows(params: {
  userId: string;
  limit: number;
  cursor?: string;
}): Promise<ListScanRunsResult> {
  const rows = await prisma.scanRun.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;

  return {
    rows: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
