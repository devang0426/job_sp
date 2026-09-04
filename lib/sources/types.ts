import type { JobSource, Seniority } from "@prisma/client";

/**
 * Parameters passed from the scan orchestrator to each adapter.
 * Derived from user Preferences at scan time.
 */
export interface SearchParams {
  keywords: string[];
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  seniority: Seniority | null;
}

/**
 * The shape every adapter must produce. Anything a source does not
 * supply is null — never a guessed value.
 */
export interface NormalizedJob {
  source: JobSource;
  sourceId: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string | null;
  countryCode: string | null;
  isRemote: boolean;
  employmentType: string | null;
  seniority: Seniority | null;
  descriptionText: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "year" | "month" | "day" | "hour" | null;
  applyUrl: string;
  sourceUrl: string | null;
  postedAt: Date | null;
  raw: unknown;
}

/**
 * What search() returns. Errors are values, not exceptions — a source
 * failing must be something the scan records and continues past.
 */
export interface AdapterResult {
  jobs: NormalizedJob[];
  requests: number;
  errors: string[];
}

/**
 * The interface every source adapter implements.
 * See context/job-sources.md for the full contract.
 */
export interface JobSourceAdapter {
  readonly source: JobSource;
  readonly requiresKey: boolean;
  search(params: SearchParams): Promise<AdapterResult>;
}

/**
 * Per-board ceiling applied by every ATS adapter after normalization.
 *
 * Public ATS boards are unmetered but not small: some return several
 * thousand postings, and Greenhouse serves full descriptions inline. Left
 * uncapped, one board can dominate a scan and exhaust task memory. The
 * newest postings are kept, since the pre-filter drops stale ones anyway.
 */
export const MAX_JOBS_PER_BOARD = 100;

/** Newest first, postings with no date last, then capped. */
export function capBoardResults(jobs: NormalizedJob[]): NormalizedJob[] {
  if (jobs.length <= MAX_JOBS_PER_BOARD) return jobs;
  return [...jobs]
    .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
    .slice(0, MAX_JOBS_PER_BOARD);
}
