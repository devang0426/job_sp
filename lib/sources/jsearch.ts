import type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
import { stripHtml, inferRemote, isValidNormalizedJob } from "./normalize";
import { cachedFetch, FetchError } from "./cache";
import { hasQuota, recordRequest } from "./quota";

/**
 * JSearch (RapidAPI) adapter.
 *
 * Endpoint: jsearch.p.rapidapi.com/search-v2
 * Auth: X-RapidAPI-Key header
 * Free tier: **200 requests/month total.** Treat every call as expensive.
 *
 * The provider retired the plain `/search` endpoint in favor of
 * `/search-v2` at some point after this adapter was written — a
 * subscribed, working key still 404s on `/search` with the same message
 * an unsubscribed key gets ("Endpoint does not exist"), which is a false
 * signal worth remembering if this ever needs re-diagnosing. `/search-v2`
 * wraps the job list in `{ jobs, cursor }` instead of returning it
 * directly; this adapter only ever reads the first page, so the cursor
 * is unused. Job field names are otherwise unchanged.
 *
 * JSearch descriptions routinely run 15–20 KB — mostly benefits boilerplate
 * and equal-opportunity statements. Store the full text; truncation to
 * ~12,000 characters happens at evaluation time (feature 15).
 */

// Host header is a constant, not an environment variable
const RAPIDAPI_HOST = "jsearch.p.rapidapi.com";

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_website?: string;
  employer_company_type?: string;
  job_publisher?: string;
  job_employment_type?: string;
  job_apply_link: string;
  job_apply_is_direct?: boolean;
  job_description: string;
  job_is_remote?: boolean;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_latitude?: number;
  job_longitude?: number;
  job_google_link?: string;
  job_offer_expiration_datetime_utc?: string;
  job_offer_expiration_timestamp?: number;
  job_required_experience?: {
    no_experience_required?: boolean;
    required_experience_in_months?: number;
    experience_mentioned?: boolean;
    experience_preferred?: boolean;
  };
  job_required_skills?: string[] | null;
  job_required_education?: {
    postgraduate_degree?: boolean;
    professional_certification?: boolean;
    high_school?: boolean;
    associates_degree?: boolean;
    bachelors_degree?: boolean;
    degree_mentioned?: boolean;
    degree_preferred?: boolean;
    professional_certification_mentioned?: boolean;
  };
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_job_title?: string;
  job_onet_soc?: string;
  job_onet_job_zone?: string;
}

interface JSearchResponse {
  status: string;
  request_id: string;
  parameters: Record<string, string>;
  // /search-v2 wraps the list in an object with a pagination cursor. The
  // old /search endpoint returned this array directly — verified live
  // against the provider on 2026-09 after it started 404ing; see the git
  // history on this file for the diagnostic trail.
  data: {
    jobs: JSearchJob[];
    cursor?: string;
  };
}

/**
 * Parse a date from JSearch's various date formats.
 * Returns null rather than a guessed date.
 */
function parseJSearchDate(job: JSearchJob): Date | null {
  // Prefer timestamp (most reliable)
  if (job.job_posted_at_timestamp) {
    const d = new Date(job.job_posted_at_timestamp * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fall back to datetime string
  if (job.job_posted_at_datetime_utc) {
    const d = new Date(job.job_posted_at_datetime_utc);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Normalize JSearch's salary period string to our canonical form.
 * JSearch uses strings like "YEAR", "MONTH", "HOUR".
 * Never assume annual.
 */
function normalizeSalaryPeriod(
  period: string | null | undefined,
): "year" | "month" | "day" | "hour" | null {
  if (!period) return null;

  const lower = period.toLowerCase().trim();
  if (lower === "year" || lower === "yearly" || lower === "annual") return "year";
  if (lower === "month" || lower === "monthly") return "month";
  if (lower === "day" || lower === "daily") return "day";
  if (lower === "hour" || lower === "hourly") return "hour";

  return null;
}

/**
 * Build a location string from JSearch's city/state/country fields.
 */
function buildLocation(job: JSearchJob): string | null {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeJSearchJob(raw: JSearchJob): Partial<NormalizedJob> {
  const location = buildLocation(raw);
  const descriptionText = stripHtml(raw.job_description || "");
  const isRemote = raw.job_is_remote === true || inferRemote(raw.job_title, location);
  const salaryPeriod = normalizeSalaryPeriod(raw.job_salary_period);
  const hasSalary = raw.job_min_salary != null || raw.job_max_salary != null;

  return {
    source: "JSEARCH",
    sourceId: raw.job_id,
    title: raw.job_title,
    company: raw.employer_name ?? "Unknown",
    companyDomain: raw.employer_website ?? null,
    location,
    countryCode: raw.job_country ?? null,
    isRemote,
    employmentType: raw.job_employment_type ?? null,
    seniority: null,
    descriptionText,
    salaryMin: hasSalary ? (raw.job_min_salary ?? null) : null,
    salaryMax: hasSalary ? (raw.job_max_salary ?? null) : null,
    salaryCurrency: hasSalary && raw.job_salary_currency ? raw.job_salary_currency : null,
    salaryPeriod: hasSalary ? salaryPeriod : null,
    applyUrl: raw.job_apply_link,
    sourceUrl: raw.job_google_link ?? null,
    postedAt: parseJSearchDate(raw),
    raw,
  };
}

export function createJSearchAdapter(): JobSourceAdapter {
  return {
    source: "JSEARCH",
    requiresKey: true,

    async search(params: SearchParams): Promise<AdapterResult> {
      const errors: string[] = [];

      // Quota check — skip gracefully if exhausted
      if (!hasQuota("JSEARCH")) {
        errors.push("JSearch: monthly quota exhausted, skipping");
        return { jobs: [], requests: 0, errors };
      }

      const rapidApiKey = process.env.RAPIDAPI_KEY;

      if (!rapidApiKey) {
        errors.push("JSearch: RAPIDAPI_KEY not set");
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
      const query = queryParts.join(" ") || "software engineer";

      // Build URL — one request per source per scan (rule 1).
      // `/search-v2` paginates by cursor, not by `page`; requesting a
      // single page is `num_pages: "1"` alone.
      const searchParams = new URLSearchParams({
        query,
        num_pages: "1",
      });

      if (params.remoteOnly) {
        searchParams.set("remote_jobs_only", "true");
      }

      if (params.locations.length > 0) {
        // JSearch doesn't have a location filter per se,
        // but we can append location to the query
        searchParams.set("query", `${query} in ${params.locations[0]}`);
      }

      const url = `https://${RAPIDAPI_HOST}/search-v2?${searchParams.toString()}`;

      try {
        const { data, fromCache } = await cachedFetch<JSearchResponse>(url, {
          headers: {
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": RAPIDAPI_HOST,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(20_000),
        });

        // Only count against quota if it was a real network request
        if (!fromCache) {
          recordRequest("JSEARCH");
        }

        if (!data.data || !Array.isArray(data.data.jobs)) {
          errors.push("JSearch: unexpected response shape");
          return { jobs: [], requests: 1, errors };
        }

        const jobs: NormalizedJob[] = [];
        for (const raw of data.data.jobs) {
          const normalized = normalizeJSearchJob(raw);
          if (isValidNormalizedJob(normalized)) {
            jobs.push(normalized);
          }
        }

        return { jobs, requests: fromCache ? 0 : 1, errors };
      } catch (err) {
        if (err instanceof FetchError) {
          if (err.status === 429) {
            errors.push("JSearch: rate limited (429)");
          } else if (err.status === 403) {
            errors.push("JSearch: invalid or expired RAPIDAPI_KEY (403)");
          } else {
            errors.push(`JSearch: HTTP ${err.status}`);
          }
          // Still count the request even on error
          recordRequest("JSEARCH");
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`JSearch: ${msg}`);
        }
        return { jobs: [], requests: 1, errors };
      }
    },
  };
}
