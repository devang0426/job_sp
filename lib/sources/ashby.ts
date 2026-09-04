import type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
import { capBoardResults } from "./types";
import { stripHtml, inferRemote, safeParseDate, isValidNormalizedJob } from "./normalize";

/**
 * Ashby job board API adapter.
 * Endpoint: api.ashbyhq.com/posting-api/job-board/{name}
 *
 * Unauthenticated, unmetered.
 */

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  department: string;
  publishedAt: string;
  descriptionHtml: string;
  descriptionPlain?: string;
  isRemote: boolean;
  compensationTierSummary?: string;
  jobUrl: string;
  applyUrl?: string;
  secondaryLocations?: Array<{ location: string }>;
}

interface AshbyResponse {
  jobs: AshbyJob[];
  apiVersion: string;
}

function normalizeAshbyJob(
  raw: AshbyJob,
  company: string,
): Partial<NormalizedJob> {
  const locationName = raw.location || null;
  const isRemote = raw.isRemote || inferRemote(raw.title, locationName);
  const descriptionText = raw.descriptionPlain || stripHtml(raw.descriptionHtml || "");

  return {
    source: "ASHBY",
    sourceId: raw.id,
    title: raw.title,
    company,
    companyDomain: null,
    location: locationName,
    countryCode: null,
    isRemote,
    employmentType: raw.employmentType || null,
    seniority: null,
    descriptionText,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: raw.applyUrl || raw.jobUrl,
    sourceUrl: raw.jobUrl,
    postedAt: safeParseDate(raw.publishedAt),
    raw,
  };
}

export function createAshbyAdapter(
  company: string,
  token: string,
): JobSourceAdapter {
  return {
    source: "ASHBY",
    requiresKey: false,

    async search(_params: SearchParams): Promise<AdapterResult> {
      const errors: string[] = [];
      const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`;

      let data: AshbyResponse;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          errors.push(`Ashby ${token}: HTTP ${res.status}`);
          return { jobs: [], requests: 1, errors };
        }

        data = (await res.json()) as AshbyResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Ashby ${token}: ${msg}`);
        return { jobs: [], requests: 1, errors };
      }

      if (!data.jobs || !Array.isArray(data.jobs)) {
        errors.push(`Ashby ${token}: unexpected response shape`);
        return { jobs: [], requests: 1, errors };
      }

      const jobs: NormalizedJob[] = [];
      for (const raw of data.jobs) {
        const normalized = normalizeAshbyJob(raw, company);
        if (isValidNormalizedJob(normalized)) {
          jobs.push(normalized);
        }
      }

      return { jobs: capBoardResults(jobs), requests: 1, errors };
    },
  };
}
