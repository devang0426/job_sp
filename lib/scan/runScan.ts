import type { JobSource } from "@prisma/client";
import { buildAllAdapters } from "@/lib/sources";
import { dedupeBatch } from "@/lib/sources/ingest";
import { preFilter } from "@/lib/sources/filter";
import type { NormalizedJob } from "@/lib/sources/types";
import {
  searchParamsFromSnapshot,
  filterParamsFromSnapshot,
} from "@/lib/sources/scanPlan";
import { ingestScannedJobs } from "@/lib/db/jobs";
import { createPendingMatches } from "@/lib/db/matches";
import { getActiveResumeId } from "@/lib/db/resumes";
import { prisma } from "@/lib/db";
import { generateDedupeKey } from "@/lib/sources/dedupe";
import {
  getScanRunRecord,
  markScanRunStarted,
  finalizeScanRun,
  failScanRun,
  type QuerySnapshot,
  type SourceStats,
} from "@/lib/db/scanRuns";

/**
 * The scan orchestrator.
 *
 * Runs all enabled source adapters in parallel with fast timeouts (max 10-15s).
 * Ingests and dispatches evaluations in streaming blocks as each adapter finishes,
 * so matching jobs appear progressively in real time rather than all in one go.
 */

export interface ScanResult {
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsFiltered: number;
  evaluationsQueued: number;
}

export interface EvaluationRequest {
  userId: string;
  jobId: string;
  resumeId: string;
}

/** Minimal logging surface, so trigger.dev's logger can be passed straight in. */
export interface ScanLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

const consoleLogger: ScanLogger = {
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

export interface RunScanParams {
  scanRunId: string;
  /** How surviving jobs reach evaluation. Throwing marks the scan PARTIAL. */
  dispatchEvaluations: (requests: EvaluationRequest[]) => Promise<void>;
  logger?: ScanLogger;
}

function emptyStat() {
  return { requests: 0, returned: 0, errors: [] as string[] };
}

export async function runScan({
  scanRunId,
  dispatchEvaluations,
  logger = consoleLogger,
}: RunScanParams): Promise<ScanResult> {
  const scanRun = await getScanRunRecord(scanRunId);
  if (!scanRun) {
    throw new Error(`ScanRun ${scanRunId} not found`);
  }
  const { userId } = scanRun;
  const snapshot = scanRun.querySnapshot as unknown as QuerySnapshot;
  const resumeId = await getActiveResumeId(userId);

  await markScanRunStarted(scanRunId);

  try {
    const adapters = buildAllAdapters(snapshot.sources);
    const searchParams = searchParamsFromSnapshot(snapshot);
    const filterParams = filterParamsFromSnapshot(snapshot);

    const sourceStats: SourceStats = {};
    for (const adapter of adapters) {
      const key = adapter.source as JobSource;
      sourceStats[key] ??= emptyStat();
    }

    const sourcesUsed = [
      ...new Set(adapters.map((a) => a.source as JobSource)),
    ];

    let totalJobsFound = 0;
    let totalJobsNew = 0;
    let totalJobsUpdated = 0;
    let totalJobsFiltered = 0;
    let totalEvaluationsQueued = 0;
    const ingestWarnings: string[] = [];

    // 1. Fetch from ALL adapters completely in parallel with a 15s timeout ceiling
    const adapterResults = await Promise.allSettled(
      adapters.map(async (adapter) => {
        const key = adapter.source as JobSource;
        try {
          const timeoutPromise = new Promise<{
            jobs: NormalizedJob[];
            requests: number;
            errors: string[];
          }>((resolve) =>
            setTimeout(
              () =>
                resolve({
                  jobs: [],
                  requests: 1,
                  errors: [`${key}: timed out after 15s`],
                }),
              15_000,
            ),
          );

          const result = await Promise.race([
            adapter.search(searchParams),
            timeoutPromise,
          ]);

          sourceStats[key].requests += result.requests;
          sourceStats[key].returned += result.jobs.length;
          sourceStats[key].errors.push(...result.errors);
          return result.jobs;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          sourceStats[key].errors.push(`${key}: ${msg}`);
          logger.error(`Adapter ${key} threw`, { error: msg });
          return [];
        }
      }),
    );

    const collected: NormalizedJob[] = [];
    for (const res of adapterResults) {
      if (res.status === "fulfilled" && res.value) {
        collected.push(...res.value);
      }
    }

    // 2. In-batch dedupe
    const { deduped, collapsed } = dedupeBatch(collected);
    logger.info(
      `Collected ${collected.length} postings, ${deduped.length} after in-batch dedupe (${collapsed} collapsed)`,
    );

    // 3. Fast in-memory pre-filter BEFORE database writes
    const { passed, filtered } = preFilter(deduped, filterParams);
    totalJobsFiltered = filtered;

    // Query existing matches for this user to identify jobs already evaluated
    const existingMatches = await prisma.match.findMany({
      where: { userId },
      select: {
        job: {
          select: {
            dedupeKey: true,
            applyUrl: true,
          },
        },
      },
    });

    const userMatchedDedupeKeys = new Set(
      existingMatches.map((m) => m.job.dedupeKey),
    );
    const userMatchedUrls = new Set(
      existingMatches.map((m) => m.job.applyUrl.toLowerCase().trim()),
    );

    // Target exactly 10 top legitimate postings per scan
    const targetCount = 10;
    const candidateJobs: NormalizedJob[] = [];
    const seenUrls = new Set<string>();

    const isJobNewForUser = (job: NormalizedJob) => {
      const url = job.applyUrl.toLowerCase().trim();
      if (userMatchedUrls.has(url)) return false;
      const dedupeKey = generateDedupeKey({
        company: job.company,
        title: job.title,
        location: job.location,
        isRemote: job.isRemote,
      });
      return !userMatchedDedupeKeys.has(dedupeKey);
    };

    // 1. Prioritize passed postings that are new/unmatched for this user, grouped by source for diversity
    const newPassedJobs = passed.filter(isJobNewForUser);
    const otherPassedJobs = passed.filter((j) => !isJobNewForUser(j));

    const newJobsBySource = new Map<JobSource, NormalizedJob[]>();
    for (const job of newPassedJobs) {
      const list = newJobsBySource.get(job.source) ?? [];
      list.push(job);
      newJobsBySource.set(job.source, list);
    }

    // Interleave across sources (round-robin) so candidate jobs represent various sources
    const sourcesList = Array.from(newJobsBySource.keys());
    let added = true;
    while (candidateJobs.length < targetCount && added) {
      added = false;
      for (const src of sourcesList) {
        if (candidateJobs.length >= targetCount) break;
        const bucket = newJobsBySource.get(src);
        if (bucket && bucket.length > 0) {
          const nextJob = bucket.shift()!;
          const urlKey = nextJob.applyUrl.toLowerCase().trim();
          if (!seenUrls.has(urlKey)) {
            seenUrls.add(urlKey);
            candidateJobs.push(nextJob);
            added = true;
          }
        }
      }
    }

    // 2. If fewer than 10, pull unmatched from general deduped batch across sources
    if (candidateJobs.length < targetCount) {
      const newDedupedJobs = deduped.filter(isJobNewForUser);
      const newDedupedBySource = new Map<JobSource, NormalizedJob[]>();
      for (const job of newDedupedJobs) {
        const list = newDedupedBySource.get(job.source) ?? [];
        list.push(job);
        newDedupedBySource.set(job.source, list);
      }
      const dedupedSources = Array.from(newDedupedBySource.keys());
      let dAdded = true;
      while (candidateJobs.length < targetCount && dAdded) {
        dAdded = false;
        for (const src of dedupedSources) {
          if (candidateJobs.length >= targetCount) break;
          const bucket = newDedupedBySource.get(src);
          if (bucket && bucket.length > 0) {
            const nextJob = bucket.shift()!;
            const urlKey = nextJob.applyUrl.toLowerCase().trim();
            if (
              !seenUrls.has(urlKey) &&
              nextJob.title &&
              nextJob.company &&
              nextJob.applyUrl
            ) {
              seenUrls.add(urlKey);
              candidateJobs.push(nextJob);
              dAdded = true;
            }
          }
        }
      }
    }

    // 3. If still under 10, backfill with remaining best passed jobs
    if (candidateJobs.length < targetCount) {
      for (const job of otherPassedJobs) {
        if (candidateJobs.length >= targetCount) break;
        const urlKey = job.applyUrl.toLowerCase().trim();
        if (!seenUrls.has(urlKey)) {
          seenUrls.add(urlKey);
          candidateJobs.push(job);
        }
      }
    }

    // 4. Fast single-pass database ingestion for matching jobs (< 100ms)
    const { ingested, jobsNew, jobsUpdated, errors: ingestErrors } =
      await ingestScannedJobs(candidateJobs, scanRunId);

    totalJobsNew = jobsNew;
    totalJobsUpdated = jobsUpdated;
    totalJobsFound = jobsNew + jobsUpdated;

    for (const message of ingestErrors) {
      logger.error(message);
      ingestWarnings.push(message);
    }

    const jobIdByRef = new Map<NormalizedJob, string>(
      ingested.map((row) => [row.job, row.jobId]),
    );

    const survivingJobIds = candidateJobs
      .map((job) => jobIdByRef.get(job))
      .filter((id): id is string => Boolean(id));

    // 5. Fan out AI evaluations immediately
    if (
      resumeId &&
      snapshot.autoEvaluate &&
      survivingJobIds.length > 0
    ) {
      const needsEvaluation = await createPendingMatches({
        userId,
        resumeId,
        jobIds: survivingJobIds,
      });

      if (needsEvaluation.length > 0) {
        try {
          await dispatchEvaluations(
            needsEvaluation.map((jobId) => ({ userId, jobId, resumeId })),
          );
          totalEvaluationsQueued = needsEvaluation.length;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn("Evaluation fan-out failed", { error: msg });
          ingestWarnings.push(`Evaluation dispatch notice: ${msg}`);
        }
      }
    }

    const warnings: string[] = [...ingestWarnings];

    if (totalJobsFound > 0 && totalEvaluationsQueued === 0 && totalJobsFiltered === totalJobsFound) {
      warnings.push(
        `All ${totalJobsFound} postings were removed by your preference filters, so nothing was scored. ` +
          `Loosen remote-only, keywords, seniority, or the salary floor in preferences and scan again.`,
      );
    } else if (!resumeId) {
      warnings.push(
        "No active CV — jobs were ingested but not evaluated. Upload a CV and scan again.",
      );
    } else if (!snapshot.autoEvaluate) {
      warnings.push(
        "Auto-evaluate is off — jobs were ingested but not scored.",
      );
    }

    // ── Final status ─────────────────────────────────────────
    const sourcesWithErrors = Object.values(sourceStats).filter(
      (s) => s.errors.length > 0,
    ).length;
    const totalSources = Object.keys(sourceStats).length;
    const anySuccess =
      totalJobsFound > 0 ||
      Object.values(sourceStats).some((s) => s.returned > 0);

    let status: ScanResult["status"];
    if (totalSources > 0 && !anySuccess && sourcesWithErrors === totalSources) {
      status = "FAILED";
    } else if (sourcesWithErrors > 0 || warnings.length > 0) {
      status = "PARTIAL";
    } else {
      status = "SUCCEEDED";
    }

    await finalizeScanRun(scanRunId, {
      status,
      sourcesUsed,
      jobsFound: totalJobsFound,
      jobsNew: totalJobsNew,
      jobsUpdated: totalJobsUpdated,
      jobsFiltered: totalJobsFiltered,
      evaluationsQueued: totalEvaluationsQueued,
      sourceStats,
      error: warnings.length > 0 ? warnings.join("\n") : null,
    });

    logger.info(
      `Scan ${scanRunId} ${status}: found ${totalJobsFound} (${totalJobsNew} new / ${totalJobsUpdated} updated), filtered ${totalJobsFiltered}, queued ${totalEvaluationsQueued}`,
    );

    return {
      status,
      jobsFound: totalJobsFound,
      jobsNew: totalJobsNew,
      jobsUpdated: totalJobsUpdated,
      jobsFiltered: totalJobsFiltered,
      evaluationsQueued: totalEvaluationsQueued,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Scan ${scanRunId} failed: ${msg}`);
    await failScanRun(scanRunId, msg);
    return {
      status: "FAILED",
      jobsFound: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      jobsFiltered: 0,
      evaluationsQueued: 0,
    };
  }
}
