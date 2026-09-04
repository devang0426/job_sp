import type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
import { stripHtml, inferRemote, isValidNormalizedJob } from "./normalize";
import { cachedFetch, FetchError } from "./cache";
import { hasQuota, recordRequest } from "./quota";

/**
 * Adzuna job search API adapter.
 *
 * Endpoint: api.adzuna.com/v1/api/jobs/in/search/{page}
 * Auth: app_id + app_key query params
 * Free tier: ~250 calls/month, ~1 req/s
 *
 * Good India coverage and structured salary data.
 */

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created: string;
  company: { display_name: string };
  location: {
    display_name: string;
    area: string[];
  };
  category: { label: string; tag: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_type?: string;
  contract_time?: string;
  latitude?: number;
  longitude?: number;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean?: number;
  __class__?: string;
}

/**
 * Parse a relative date string like "3 days ago" to an absolute Date.
 * Returns null if the string can't be parsed — never guesses.
 */
function parseRelativeDate(raw: string): Date | null {
  // Try ISO/standard date parse first
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  // Try relative patterns: "N days/hours/minutes ago"
  const match = raw.match(/(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago/i);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const now = new Date();

  switch (unit) {
    case "second":
      now.setSeconds(now.getSeconds() - amount);
      break;
    case "minute":
      now.setMinutes(now.getMinutes() - amount);
      break;
    case "hour":
      now.setHours(now.getHours() - amount);
      break;
    case "day":
      now.setDate(now.getDate() - amount);
      break;
    case "week":
      now.setDate(now.getDate() - amount * 7);
      break;
    case "month":
      now.setMonth(now.getMonth() - amount);
      break;
    default:
      return null;
  }

  return now;
}

/**
 * Determine the salary period from Adzuna's contract_time and salary values.
 * Adzuna salaries are typically annual but can vary. The contract_time
 * field distinguishes full_time from part_time/contract.
 */
function inferSalaryPeriod(
  job: AdzunaJob,
): "year" | "month" | "day" | "hour" | null {
  if (job.salary_min == null && job.salary_max == null) return null;

  // Adzuna's India endpoint returns annual salaries by default.
  // Values under a threshold suggest non-annual periods.
  const salary = job.salary_max ?? job.salary_min ?? 0;

  // Heuristic: if the salary is below 1000, it's likely hourly or daily
  if (salary > 0 && salary < 1_000) return "hour";
  if (salary >= 1_000 && salary < 15_000) return "month";

  // Default to annual for larger values
  return "year";
}

function normalizeAdzunaJob(raw: AdzunaJob): Partial<NormalizedJob> {
  const locationName = raw.location?.display_name ?? null;
  const descriptionText = stripHtml(raw.description || "");
  const isRemote = inferRemote(raw.title, locationName);
  const salaryPeriod = inferSalaryPeriod(raw);

  // Adzuna can flag predicted vs actual salaries
  const hasSalary =
    raw.salary_min != null || raw.salary_max != null;
  const isPredicted = raw.salary_is_predicted === "1";

  return {
    source: "ADZUNA",
    sourceId: String(raw.id),
    title: raw.title,
    company: raw.company?.display_name ?? "Unknown",
    companyDomain: null,
    location: locationName,
    countryCode: "IN", // India endpoint
    isRemote,
    employmentType: raw.contract_type ?? raw.contract_time ?? null,
    seniority: null,
    descriptionText,
    // Don't report predicted salaries as real
    salaryMin: hasSalary && !isPredicted ? (raw.salary_min ?? null) : null,
    salaryMax: hasSalary && !isPredicted ? (raw.salary_max ?? null) : null,
    salaryCurrency: hasSalary && !isPredicted ? "INR" : null,
    salaryPeriod: hasSalary && !isPredicted ? salaryPeriod : null,
    applyUrl: raw.redirect_url,
    sourceUrl: raw.redirect_url,
    postedAt: parseRelativeDate(raw.created),
    raw,
  };
}

export function createAdzunaAdapter(): JobSourceAdapter {
  return {
    source: "ADZUNA",
    requiresKey: true,

    async search(params: SearchParams): Promise<AdapterResult> {
      const errors: string[] = [];

      // Quota check — skip gracefully if exhausted
      if (!hasQuota("ADZUNA")) {
        errors.push("Adzuna: monthly quota exhausted, skipping");
        return { jobs: [], requests: 0, errors };
      }

      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;

      if (!appId || !appKey) {
        errors.push("Adzuna: ADZUNA_APP_ID or ADZUNA_APP_KEY not set");
        return { jobs: [], requests: 0, errors };
      }

      // Build search query from params
      const queryParts: string[] = [];
      if (params.targetRoles.length > 0) {
        queryParts.push(...params.targetRoles);
      }
      if (params.keywords.length > 0) {
        queryParts.push(...params.keywords);
      }
      if (params.seniority === "INTERN" && !queryParts.some((p) => p.toLowerCase().includes("intern"))) {
        queryParts.push("intern");
      }
      const what = queryParts.join(" ") || "software engineer";

      const where = params.locations.length > 0
        ? params.locations[0]
        : "";

      // Build URL — one request per source per scan (rule 1)
      const searchParams = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "50",
        what,
        content_type: "application/json",
      });

      if (where) {
        searchParams.set("where", where);
      }

      if (params.remoteOnly) {
        searchParams.set("what_and", "remote");
      }

      // Page 1 only — never paginate on a free tier
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${searchParams.toString()}`;

      try {
        const { data, fromCache } = await cachedFetch<AdzunaResponse>(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });

        // Only count against quota if it was a real network request
        if (!fromCache) {
          recordRequest("ADZUNA");
        }

        if (!data.results || !Array.isArray(data.results)) {
          errors.push("Adzuna: unexpected response shape");
          return { jobs: [], requests: 1, errors };
        }

        const jobs: NormalizedJob[] = [];
        for (const raw of data.results) {
          const normalized = normalizeAdzunaJob(raw);
          if (isValidNormalizedJob(normalized)) {
            jobs.push(normalized);
          }
        }

        return { jobs, requests: fromCache ? 0 : 1, errors };
      } catch (err) {
        if (err instanceof FetchError) {
          if (err.status === 429) {
            errors.push("Adzuna: rate limited (429)");
          } else {
            errors.push(`Adzuna: HTTP ${err.status}`);
          }
          // Still count the request even on error
          recordRequest("ADZUNA");
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Adzuna: ${msg}`);
        }
        return { jobs: [], requests: 1, errors };
      }
    },
  };
}
