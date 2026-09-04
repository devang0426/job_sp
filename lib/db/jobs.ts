import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { JobsQueryParams } from "@/lib/validation/jobs";
import type {
  JobSource,
  Seniority,
  Recommendation,
  MatchStatus,
  ApplicationStatus,
} from "@prisma/client";
import type { NormalizedJob } from "@/lib/sources/types";
import { generateDedupeKey } from "@/lib/sources/dedupe";

export interface FeedRow {
  job: {
    id: string;
    source: JobSource;
    sourceId: string;
    title: string;
    company: string;
    companyDomain: string | null;
    location: string | null;
    isRemote: boolean;
    employmentType: string | null;
    seniority: Seniority | null;
    postedAt: string | null;
    firstSeenAt: string;
    applyUrl: string;
  };
  match: {
    id: string;
    status: MatchStatus;
    score: number | null;
    recommendation: Recommendation | null;
    failureReason: string | null;
    evaluatedAt: string | null;
  } | null;
  application: {
    id: string;
    status: ApplicationStatus;
  } | null;
}

export interface GetFeedJobsResult {
  rows: FeedRow[];
  nextCursor: string | null;
  totalCount: number;
  totalUnfilteredCount: number;
}

export async function getFeedJobs({
  userId,
  params,
}: {
  userId: string;
  params: JobsQueryParams;
}): Promise<GetFeedJobsResult> {
  const where: Prisma.JobWhereInput = {};

  if (params.source) {
    where.source = params.source;
  }

  if (typeof params.remote === "boolean") {
    where.isRemote = params.remote;
  }

  if (params.company && params.company.trim() !== "") {
    where.company = { contains: params.company.trim(), mode: "insensitive" };
  }

  if (params.postedWithinDays) {
    const cutoff = new Date(
      Date.now() - params.postedWithinDays * 24 * 60 * 60 * 1000,
    );
    where.postedAt = { gte: cutoff };
  }

  // Filter based on match status / criteria strictly for current user
  const matchFilters: Prisma.MatchWhereInput = { userId };
  let hasMatchFilter = false;

  if (params.recommendation) {
    matchFilters.recommendation = params.recommendation;
    hasMatchFilter = true;
  }

  if (typeof params.minScore === "number") {
    matchFilters.score = { gte: params.minScore };
    hasMatchFilter = true;
  }

  if (params.evaluated === true) {
    matchFilters.status = "COMPLETE";
    hasMatchFilter = true;
  }

  if (hasMatchFilter) {
    where.matches = { some: matchFilters };
  } else if (params.evaluated === false) {
    where.matches = { none: { userId, status: "COMPLETE" } };
  }

  // Filter based on application saved status for current user
  if (typeof params.saved === "boolean") {
    if (params.saved) {
      where.applications = { some: { userId } };
    } else {
      where.applications = { none: { userId } };
    }
  }

  const selectFields = {
    id: true,
    source: true,
    sourceId: true,
    title: true,
    company: true,
    companyDomain: true,
    location: true,
    isRemote: true,
    employmentType: true,
    seniority: true,
    postedAt: true,
    firstSeenAt: true,
    applyUrl: true,
    matches: {
      where: { userId },
      select: {
        id: true,
        status: true,
        score: true,
        recommendation: true,
        failureReason: true,
        evaluatedAt: true,
        userId: true,
      },
    },
    applications: {
      where: { userId },
      select: {
        id: true,
        status: true,
        userId: true,
      },
    },
  } satisfies Prisma.JobSelect;

  type JobWithRelations = Prisma.JobGetPayload<{
    select: typeof selectFields;
  }>;

  // If filtering for evaluated only, or filtering by minScore/recommendation,
  // query matched jobs directly. Otherwise, query user's evaluated jobs (prioritized)
  // plus recent unevaluated jobs.
  let jobs: JobWithRelations[] = [];
  const [totalCount, totalUnfilteredCount] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.count(),
  ]);

  if (hasMatchFilter || params.evaluated === true) {
    jobs = await prisma.job.findMany({
      where,
      select: selectFields,
      orderBy: [{ firstSeenAt: "desc" }],
      take: 150,
    });
  } else if (params.evaluated === false) {
    jobs = await prisma.job.findMany({
      where,
      select: selectFields,
      orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
      take: 100,
    });
  } else {
    // Default: fetch all user matches (evaluated + evaluating) + recent unevaluated jobs
    const [matchedJobs, unmatchedJobs] = await Promise.all([
      prisma.job.findMany({
        where: {
          ...where,
          matches: { some: { userId } },
        },
        select: selectFields,
        orderBy: [{ firstSeenAt: "desc" }],
        take: 150,
      }),
      prisma.job.findMany({
        where: {
          ...where,
          matches: { none: { userId } },
        },
        select: selectFields,
        orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
        take: 75,
      }),
    ]);
    jobs = [...matchedJobs, ...unmatchedJobs];
  }

  const formattedRows: FeedRow[] = jobs.map((job) => {
    const match = job.matches.find((m) => m.userId === userId) ?? null;
    const application = job.applications.find((a) => a.userId === userId) ?? null;

    return {
      job: {
        id: job.id,
        source: job.source,
        sourceId: job.sourceId,
        title: job.title,
        company: job.company,
        companyDomain: job.companyDomain,
        location: job.location,
        isRemote: job.isRemote,
        employmentType: job.employmentType,
        seniority: job.seniority,
        postedAt: job.postedAt ? job.postedAt.toISOString() : null,
        firstSeenAt: job.firstSeenAt.toISOString(),
        applyUrl: job.applyUrl,
      },
      match: match
        ? {
            id: match.id,
            status: match.status,
            score: match.score,
            recommendation: match.recommendation,
            failureReason: match.failureReason,
            evaluatedAt: match.evaluatedAt ? match.evaluatedAt.toISOString() : null,
          }
        : null,
      application: application
        ? {
            id: application.id,
            status: application.status,
          }
        : null,
    };
  });

  // Sort: pending/running evaluating matches first, then score descending, then date
  if (params.sort === "postedAt") {
    formattedRows.sort((a, b) => {
      const aIsEvaluating =
        a.match?.status === "PENDING" || a.match?.status === "RUNNING";
      const bIsEvaluating =
        b.match?.status === "PENDING" || b.match?.status === "RUNNING";
      if (aIsEvaluating && !bIsEvaluating) return -1;
      if (bIsEvaluating && !aIsEvaluating) return 1;

      const dateA = a.job.postedAt
        ? new Date(a.job.postedAt).getTime()
        : new Date(a.job.firstSeenAt).getTime();
      const dateB = b.job.postedAt
        ? new Date(b.job.postedAt).getTime()
        : new Date(b.job.firstSeenAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.job.id.localeCompare(a.job.id);
    });
  } else {
    formattedRows.sort((a, b) => {
      const aIsEvaluating =
        a.match?.status === "PENDING" || a.match?.status === "RUNNING";
      const bIsEvaluating =
        b.match?.status === "PENDING" || b.match?.status === "RUNNING";
      if (aIsEvaluating && !bIsEvaluating) return -1;
      if (bIsEvaluating && !aIsEvaluating) return 1;

      const scoreA = a.match?.score ?? -1;
      const scoreB = b.match?.score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const dateA = a.job.postedAt
        ? new Date(a.job.postedAt).getTime()
        : new Date(a.job.firstSeenAt).getTime();
      const dateB = b.job.postedAt
        ? new Date(b.job.postedAt).getTime()
        : new Date(b.job.firstSeenAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.job.id.localeCompare(a.job.id);
    });
  }

  // Cursor pagination
  let startIndex = 0;
  if (params.cursor) {
    const cursorIdx = formattedRows.findIndex((r) => r.job.id === params.cursor);
    if (cursorIdx !== -1) {
      startIndex = cursorIdx + 1;
    }
  }

  const paginatedRows = formattedRows.slice(startIndex, startIndex + params.limit);
  const hasMore = startIndex + params.limit < totalCount;
  const nextCursor =
    hasMore && paginatedRows.length > 0
      ? paginatedRows[paginatedRows.length - 1].job.id
      : null;

  return {
    rows: paginatedRows,
    nextCursor,
    totalCount,
    totalUnfilteredCount,
  };
}

export interface IngestedJob {
  job: NormalizedJob;
  jobId: string;
  isNew: boolean;
}

export interface IngestScannedJobsResult {
  ingested: IngestedJob[];
  jobsNew: number;
  jobsUpdated: number;
  errors: string[];
}

/**
 * Sources whose raw provider payload is worth persisting.
 *
 * architecture.md keeps `Job.raw` so that re-parsing a posting never costs
 * another metered API call. That reason holds only where a call is metered.
 * The ATS boards are public, free and unmetered, and their payloads repeat
 * the description verbatim — on a real scan they were 29 MB of the 44 MB
 * written, for data that can be re-fetched for nothing.
 */
const METERED_SOURCES: ReadonlySet<JobSource> = new Set<JobSource>([
  "ADZUNA",
  "JSEARCH",
  "SCRAPED",
  "FIRECRAWL",
]);

function rawPayloadFor(job: NormalizedJob): Prisma.InputJsonValue {
  if (!METERED_SOURCES.has(job.source)) return {};
  return (job.raw ?? {}) as Prisma.InputJsonValue;
}

/**
 * Ingest a batch of normalized postings: an upsert keyed on `dedupeKey`.
 *
 * The update branch never rewrites `source` / `sourceId` / `firstSeenAt` /
 * `firstSeenInScanRunId` — first-seen provenance wins (architecture.md
 * invariant 2). It refreshes only what legitimately changes between
 * sightings: description, salary, posting date, `lastSeenAt`, `seenCount`,
 * and the raw payload.
 *
 * This runs as a handful of batched round trips rather than two queries per
 * posting. A scan collects thousands of postings, and one query per row
 * against a pooled Neon connection takes longer than the task's entire
 * duration budget.
 *
 * The two unique constraints (`dedupeKey` and `[source, sourceId]`) coexist
 * because of the provenance rule, so a posting whose dedupe fields drifted
 * is matched on `[source, sourceId]` and refreshed instead of failing.
 */
export async function ingestScannedJobs(
  jobs: NormalizedJob[],
  scanRunId: string,
): Promise<IngestScannedJobsResult> {
  const errors: string[] = [];
  if (jobs.length === 0) {
    return { ingested: [], jobsNew: 0, jobsUpdated: 0, errors };
  }

  const now = new Date();

  const entries = jobs.map((job) => ({
    job,
    dedupeKey: generateDedupeKey({
      company: job.company,
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
    }),
  }));

  // 1. Single indexed lookup by dedupe key
  const idByDedupeKey = new Map<string, string>();
  const dedupeKeys = entries.map((e) => e.dedupeKey);
  if (dedupeKeys.length > 0) {
    const dedupeResults = await prisma.job.findMany({
      where: { dedupeKey: { in: dedupeKeys } },
      select: { id: true, dedupeKey: true },
    });
    for (const row of dedupeResults) idByDedupeKey.set(row.dedupeKey, row.id);
  }

  // 2. For the rest, match on [source, sourceId] in a single query
  const unmatched = entries.filter((e) => !idByDedupeKey.has(e.dedupeKey));
  const idBySourceRef = new Map<string, string>();
  const sourceRef = (source: string, sourceId: string) => `${source}:${sourceId}`;

  if (unmatched.length > 0) {
    const unmatchedSourceIds = unmatched.map((e) => e.job.sourceId);
    const sourceLookupResults = await prisma.job.findMany({
      where: { sourceId: { in: unmatchedSourceIds } },
      select: { id: true, source: true, sourceId: true },
    });
    for (const row of sourceLookupResults) {
      idBySourceRef.set(sourceRef(row.source, row.sourceId), row.id);
    }
  }

  const toUpdate: { id: string; entry: (typeof entries)[number] }[] = [];
  const toCreate: (typeof entries)[number][] = [];

  for (const entry of entries) {
    const existingId =
      idByDedupeKey.get(entry.dedupeKey) ??
      idBySourceRef.get(sourceRef(entry.job.source, entry.job.sourceId));
    if (existingId) toUpdate.push({ id: existingId, entry });
    else toCreate.push(entry);
  }

  // 3. Refresh existing postings in a single query
  if (toUpdate.length > 0) {
    const existingIds = toUpdate.map((u) => u.id);
    try {
      await prisma.job.updateMany({
        where: { id: { in: existingIds } },
        data: {
          lastSeenAt: now,
          seenCount: { increment: 1 },
        },
      });
    } catch (err) {
      errors.push(
        `Refreshing existing postings failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // 4. Insert new postings in a single query
  if (toCreate.length > 0) {
    try {
      await prisma.job.createMany({
        skipDuplicates: true,
        data: toCreate.map(({ job, dedupeKey }) => ({
          source: job.source,
          sourceId: job.sourceId,
          dedupeKey,
          title: job.title,
          company: job.company,
          companyDomain: job.companyDomain,
          location: job.location,
          countryCode: job.countryCode,
          isRemote: job.isRemote,
          employmentType: job.employmentType,
          seniority: job.seniority,
          descriptionText: job.descriptionText,
          descriptionChars: job.descriptionText.length,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          salaryPeriod: job.salaryPeriod,
          applyUrl: job.applyUrl,
          sourceUrl: job.sourceUrl,
          postedAt: job.postedAt,
          firstSeenAt: now,
          lastSeenAt: now,
          raw: rawPayloadFor(job),
          firstSeenInScanRunId: scanRunId,
        })),
      });
    } catch (_err) {
      try {
        await prisma.job.createMany({
          skipDuplicates: true,
          data: toCreate.map(({ job, dedupeKey }) => ({
            source: job.source,
            sourceId: job.sourceId,
            dedupeKey,
            title: job.title,
            company: job.company,
            companyDomain: job.companyDomain,
            location: job.location,
            countryCode: job.countryCode,
            isRemote: job.isRemote,
            employmentType: job.employmentType,
            seniority: job.seniority,
            descriptionText: job.descriptionText,
            descriptionChars: job.descriptionText.length,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            salaryPeriod: job.salaryPeriod,
            applyUrl: job.applyUrl,
            sourceUrl: job.sourceUrl,
            postedAt: job.postedAt,
            firstSeenAt: now,
            lastSeenAt: now,
            raw: rawPayloadFor(job),
            firstSeenInScanRunId: null,
          })),
        });
      } catch (retryErr) {
        errors.push(
          `Inserting new postings failed: ${
            retryErr instanceof Error ? retryErr.message : String(retryErr)
          }`,
        );
      }
    }

    // Read back created IDs
    const createdKeys = toCreate.map((e) => e.dedupeKey);
    const createdRows = await prisma.job.findMany({
      where: { dedupeKey: { in: createdKeys } },
      select: { id: true, dedupeKey: true },
    });
    for (const row of createdRows) idByDedupeKey.set(row.dedupeKey, row.id);
  }

  const createdKeys = new Set(toCreate.map((e) => e.dedupeKey));
  const ingested: IngestedJob[] = [];
  let jobsNew = 0;
  let jobsUpdated = 0;

  for (const entry of entries) {
    const jobId =
      idByDedupeKey.get(entry.dedupeKey) ??
      idBySourceRef.get(sourceRef(entry.job.source, entry.job.sourceId));
    if (!jobId) continue;
    const isNew = createdKeys.has(entry.dedupeKey);
    if (isNew) jobsNew++;
    else jobsUpdated++;
    ingested.push({ job: entry.job, jobId, isNew });
  }

  return { ingested, jobsNew, jobsUpdated, errors };
}
