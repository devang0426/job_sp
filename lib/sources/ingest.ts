import type { NormalizedJob } from "./types";
import { generateDedupeKey } from "./dedupe";

/**
 * Collapse duplicates *within a single scan batch* before any database
 * write. Two adapters (say a company's Greenhouse board and Adzuna) can
 * return the same opening in one scan; without this the two rows race on
 * the `dedupeKey` unique constraint during upsert.
 *
 * First occurrence wins — it carries the provenance (`source`,
 * `sourceId`) that the DB upsert then protects. Later duplicates only
 * fill in nullable fields the first copy was missing (salary, domain,
 * posting date) and contribute the longer description if they have one.
 *
 * Pure — no IO. The cross-scan dedupe is the `dedupeKey` upsert itself,
 * in lib/db/jobs.ts.
 */

export interface DedupeBatchResult {
  deduped: NormalizedJob[];
  collapsed: number;
}

function enrich(base: NormalizedJob, dup: NormalizedJob): NormalizedJob {
  return {
    ...base,
    companyDomain: base.companyDomain ?? dup.companyDomain,
    countryCode: base.countryCode ?? dup.countryCode,
    employmentType: base.employmentType ?? dup.employmentType,
    seniority: base.seniority ?? dup.seniority,
    salaryMin: base.salaryMin ?? dup.salaryMin,
    salaryMax: base.salaryMax ?? dup.salaryMax,
    salaryCurrency: base.salaryCurrency ?? dup.salaryCurrency,
    salaryPeriod: base.salaryPeriod ?? dup.salaryPeriod,
    postedAt: base.postedAt ?? dup.postedAt,
    isRemote: base.isRemote || dup.isRemote,
    descriptionText:
      dup.descriptionText.length > base.descriptionText.length
        ? dup.descriptionText
        : base.descriptionText,
  };
}

export function dedupeBatch(jobs: NormalizedJob[]): DedupeBatchResult {
  const byKey = new Map<string, NormalizedJob>();
  let collapsed = 0;

  for (const job of jobs) {
    const key = generateDedupeKey({
      company: job.company,
      title: job.title,
      location: job.location,
      isRemote: job.isRemote,
    });

    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, enrich(existing, job));
      collapsed++;
    } else {
      byKey.set(key, job);
    }
  }

  return { deduped: [...byKey.values()], collapsed };
}
