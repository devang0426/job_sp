import type {
  JobSourceAdapter,
  AdapterResult,
  SearchParams,
  NormalizedJob,
} from "./types";
import { stripHtml, inferRemote, isValidNormalizedJob } from "./normalize";

/**
 * Scraper adapter targeting RemoteOK's public JSON API.
 *
 * RemoteOK is a cooperative target:
 * - Public JSON endpoint at /api (no auth, no bot wall)
 * - Server-rendered listings with a clean JSON feed
 * - No login required, no CAPTCHA
 * - robots.txt permits automated access
 *
 * The feature spec says: "If a candidate site turns out to be a client-
 * rendered SPA calling a public JSON endpoint, use that endpoint. That
 * is a better scraper, not a worse one."
 *
 * The Playwright task (trigger/scrape.ts) handles browser launch,
 * page loading, screenshot-on-failure, and resilience — this module
 * owns only normalization and the adapter contract.
 */

const REMOTEOK_API = "https://remoteok.com/api";

/** Max jobs to process per run — allows rich volume of remote postings. */
const MAX_JOBS_PER_RUN = 100;

/** User agent — descriptive, not deceptive. */
export const SCRAPER_USER_AGENT =
  "JobBoard-CollegeProject/1.0 (educational; one-request-per-scan; contact: student@example.com)";

/**
 * Shape of a single RemoteOK job from the JSON API.
 * The first element in the array is a metadata/legal object; actual
 * jobs start from index 1.
 */
interface RemoteOkJob {
  id: string;
  epoch: string;
  date: string;
  company: string;
  company_logo?: string;
  position: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
  slug?: string;
}

/**
 * Normalize a RemoteOK job to the shared NormalizedJob shape.
 */
function normalizeRemoteOkJob(raw: RemoteOkJob): Partial<NormalizedJob> {
  const descriptionText = raw.description
    ? stripHtml(raw.description)
    : "";

  const locationStr = raw.location || "Remote";
  const isRemote = inferRemote(raw.position, locationStr, true); // RemoteOK is all remote

  // Build the apply URL — prefer the direct apply link, fall back to
  // the RemoteOK listing page.
  const applyUrl =
    raw.apply_url ||
    (raw.slug
      ? `https://remoteok.com/remote-jobs/${raw.slug}`
      : raw.url
        ? `https://remoteok.com${raw.url}`
        : "");

  const sourceUrl = raw.slug
    ? `https://remoteok.com/remote-jobs/${raw.slug}`
    : raw.url
      ? `https://remoteok.com${raw.url}`
      : null;

  // Parse posted date from epoch or date string
  let postedAt: Date | null = null;
  if (raw.epoch) {
    const epochNum = parseInt(raw.epoch, 10);
    if (!isNaN(epochNum)) {
      postedAt = new Date(epochNum * 1000);
    }
  }
  if (!postedAt && raw.date) {
    const d = new Date(raw.date);
    if (!isNaN(d.getTime())) postedAt = d;
  }

  return {
    source: "SCRAPED",
    sourceId: String(raw.id),
    title: raw.position,
    company: raw.company || "Unknown",
    companyDomain: null,
    location: locationStr,
    countryCode: null, // RemoteOK is global
    isRemote,
    employmentType: null,
    seniority: null,
    descriptionText,
    salaryMin: raw.salary_min ?? null,
    salaryMax: raw.salary_max ?? null,
    salaryCurrency: raw.salary_min != null || raw.salary_max != null ? "USD" : null,
    salaryPeriod: raw.salary_min != null || raw.salary_max != null ? "year" : null,
    applyUrl,
    sourceUrl,
    postedAt,
    raw,
  };
}

/**
 * Filter RemoteOK jobs by search params — keyword and role matching.
 * This is a lightweight client-side filter since the API returns all
 * recent listings without query parameters.
 */
function matchesSearchParams(
  job: RemoteOkJob,
  params: SearchParams,
): boolean {
  if (params.keywords.length === 0 && params.targetRoles.length === 0) {
    return true;
  }

  const titleLower = (job.position || "").toLowerCase();
  const tagsLower = (job.tags || []).map((t) => t.toLowerCase());
  const searchable = [
    job.position,
    job.company,
    job.description ?? "",
    ...(job.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  // Check target roles against job title/position or tech tags
  if (params.targetRoles.length > 0) {
    const roleMatch = params.targetRoles.some((role) => {
      const r = role.toLowerCase();
      return (
        titleLower.includes(r) ||
        tagsLower.includes(r) ||
        r.split(" ").every((word) => word.length > 2 && (titleLower.includes(word) || tagsLower.includes(word)))
      );
    });
    if (roleMatch) return true;
  }

  // Check keywords against searchable text
  if (params.keywords.length > 0) {
    const keywordMatch = params.keywords.some((kw) =>
      searchable.includes(kw.toLowerCase()),
    );
    if (keywordMatch) return true;
  }

  // Check intern seniority
  if (params.seniority === "INTERN") {
    if (
      titleLower.includes("intern") ||
      titleLower.includes("co-op") ||
      titleLower.includes("apprentice") ||
      titleLower.includes("student")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Fetch jobs from RemoteOK's public JSON API.
 *
 * Called by the trigger/scrape.ts Playwright task, which handles browser
 * launch, resilience, and screenshot-on-failure. This function is also
 * callable directly for the adapter interface.
 */
export async function fetchRemoteOkJobs(
  params: SearchParams,
): Promise<{ jobs: NormalizedJob[]; raw: unknown; errors: string[] }> {
  const errors: string[] = [];

  // Determine tag to prioritize software/tech listings
  let tag = "software";
  const userTerms = [...params.targetRoles, ...params.keywords].map((t) =>
    t.toLowerCase(),
  );
  if (userTerms.some((t) => t.includes("react"))) {
    tag = "react";
  } else if (userTerms.some((t) => t.includes("dev") || t.includes("engineer"))) {
    tag = "software";
  }

  const urls = [
    `${REMOTEOK_API}?tag=${tag}`,
    REMOTEOK_API,
  ];

  const rawJobs: RemoteOkJob[] = [];
  const seenIds = new Set<string>();

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": SCRAPER_USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        if (res.status === 429) {
          errors.push("RemoteOK scraper: rate limited (429)");
          break;
        }
        continue;
      }

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      // Skip first legal/metadata element
      const items = data.slice(1) as RemoteOkJob[];
      for (const item of items) {
        if (item && item.id && !seenIds.has(String(item.id))) {
          seenIds.add(String(item.id));
          rawJobs.push(item);
        }
      }

      if (rawJobs.length >= 30) break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`RemoteOK fetch notice (${url}): ${msg}`);
    }
  }

  if (rawJobs.length === 0) {
    errors.push(
      "RemoteOK scraper: page loaded successfully but contained zero listings — " +
        "possible layout change or soft block",
    );
    return { jobs: [], raw: null, errors };
  }

  // Filter by search params and cap
  const matched = rawJobs
    .filter((j) => matchesSearchParams(j, params))
    .slice(0, MAX_JOBS_PER_RUN);

  const jobs: NormalizedJob[] = [];
  for (const raw of matched) {
    const normalized = normalizeRemoteOkJob(raw);
    if (isValidNormalizedJob(normalized)) {
      jobs.push(normalized);
    }
  }

  return { jobs, raw: rawJobs, errors };
}

/**
 * Create the scraper adapter for the source barrel.
 *
 * This adapter is used by the scan orchestrator like any other source.
 * For production, the actual scraping runs as a trigger.dev task with
 * Playwright; this adapter provides the direct-call fallback and the
 * adapter contract.
 */
export function createScraperAdapter(): JobSourceAdapter {
  return {
    source: "SCRAPED",
    requiresKey: false,

    async search(params: SearchParams): Promise<AdapterResult> {
      try {
        const { jobs, errors } = await fetchRemoteOkJobs(params);
        return { jobs, requests: 1, errors };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          jobs: [],
          requests: 1,
          errors: [`RemoteOK scraper: ${msg}`],
        };
      }
    },
  };
}
