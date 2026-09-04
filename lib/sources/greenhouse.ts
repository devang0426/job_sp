import type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
import { capBoardResults } from "./types";
import { stripHtml, inferRemote, safeParseDate, isValidNormalizedJob } from "./normalize";

/**
 * Greenhouse board API adapter.
 * Endpoint: boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 *
 * Unauthenticated, unmetered. `content=true` returns full JD text —
 * without it you get titles and nothing to evaluate.
 */

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location: { name: string } | null;
  content: string;
  departments: Array<{ name: string }>;
  metadata?: Array<{ name: string; value: unknown }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: { total: number };
}

function normalizeGreenhouseJob(
  raw: GreenhouseJob,
  company: string,
  token: string,
): Partial<NormalizedJob> {
  const locationName = raw.location?.name ?? null;
  const descriptionText = stripHtml(raw.content || "");
  const isRemote = inferRemote(raw.title, locationName);

  return {
    source: "GREENHOUSE",
    sourceId: String(raw.id),
    title: raw.title,
    company,
    companyDomain: null,
    location: locationName,
    countryCode: null,
    isRemote,
    employmentType: null,
    seniority: null,
    descriptionText,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: raw.absolute_url,
    sourceUrl: `https://boards.greenhouse.io/${token}/jobs/${raw.id}`,
    postedAt: safeParseDate(raw.updated_at),
    raw,
  };
}

export function createGreenhouseAdapter(
  company: string,
  token: string,
): JobSourceAdapter {
  return {
    source: "GREENHOUSE",
    requiresKey: false,

    async search(_params: SearchParams): Promise<AdapterResult> {
      const errors: string[] = [];
      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;

      let data: GreenhouseResponse;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          errors.push(`Greenhouse ${token}: HTTP ${res.status}`);
          return { jobs: [], requests: 1, errors };
        }

        data = (await res.json()) as GreenhouseResponse;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Greenhouse ${token}: ${msg}`);
        return { jobs: [], requests: 1, errors };
      }

      if (!data.jobs || !Array.isArray(data.jobs)) {
        errors.push(`Greenhouse ${token}: unexpected response shape`);
        return { jobs: [], requests: 1, errors };
      }

      const jobs: NormalizedJob[] = [];
      for (const raw of data.jobs) {
        const normalized = normalizeGreenhouseJob(raw, company, token);
        if (isValidNormalizedJob(normalized)) {
          jobs.push(normalized);
        }
      }

      return { jobs: capBoardResults(jobs), requests: 1, errors };
    },
  };
}
