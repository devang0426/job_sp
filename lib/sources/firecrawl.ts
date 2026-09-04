import type {
  JobSourceAdapter,
  AdapterResult,
  SearchParams,
  NormalizedJob,
} from "./types";
import { stripHtml, inferRemote, isValidNormalizedJob } from "./normalize";

/**
 * Firecrawl adapter.
 *
 * Endpoint: api.firecrawl.dev/v2/scrape
 * Auth: `Authorization: Bearer <FIRECRAWL_API_KEY>`
 *
 * Unlike Adzuna and JSearch, Firecrawl is not a job aggregator — it is a
 * scrape-and-extract service. There is no "search jobs" call to make; the
 * adapter instead scrapes one listing page and asks Firecrawl's hosted
 * model to pull an array of postings out of it via a JSON schema. This is
 * the same shape of tool as the Playwright scraper (`scraper.ts`) — a
 * cooperative page, fetched whole, filtered client-side — except the
 * fetch and the HTML→structured-data step both happen on Firecrawl's
 * infrastructure rather than in a trigger.dev browser.
 *
 * Target: **WeWorkRemotely**, `/categories/remote-programming-jobs`.
 * Chosen for the same reasons `scraper.ts` chose RemoteOK: no login, no
 * CAPTCHA, robots.txt (`Allow: /`, only `/admin` and account paths
 * disallowed) permits it, and the plain category page returns real
 * listings with no bot challenge. Its `/remote-jobs/search?term=...`
 * route sits behind a Cloudflare challenge and is deliberately never
 * called — this adapter only ever requests the plain category page.
 *
 * The extraction schema pulls the listing fields straight off the page;
 * it does not follow through to each job's own detail page (that would
 * be one Firecrawl call per posting, not one per scan). `descriptionText`
 * is therefore the listing blurb, not the full JD — shorter than the ATS
 * adapters' descriptions, which is a real trade-off of this approach, not
 * an oversight.
 */

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";
const TARGET_URL = "https://weworkremotely.com/categories/remote-programming-jobs";

/** Max jobs to process per run — mirrors the Playwright scraper's ceiling. */
const MAX_JOBS_PER_RUN = 50;

/**
 * The extraction schema handed to Firecrawl. It asks for exactly the
 * fields normalization needs; nothing here is inferred by our own code
 * from raw HTML — that inference is what we are paying Firecrawl to do.
 */
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          applyUrl: {
            type: "string",
            description: "Absolute URL of the individual job posting's own page.",
          },
          location: { type: "string" },
          postedText: {
            type: "string",
            description: "The relative posted date as shown, e.g. '5d' or '2mo'.",
          },
          isRemote: { type: "boolean" },
        },
        required: ["title", "company", "applyUrl"],
      },
    },
  },
  required: ["jobs"],
} as const;

interface FirecrawlJob {
  title?: string;
  company?: string;
  applyUrl?: string;
  location?: string;
  postedText?: string;
  isRemote?: boolean;
}

interface FirecrawlScrapeResponse {
  success: boolean;
  error?: string;
  data?: {
    json?: { jobs?: FirecrawlJob[] };
  };
}

/**
 * WeWorkRemotely mixes sponsored placements into the listing stream —
 * they render like job cards but link out to `/listing_ads/...` tracking
 * redirects instead of a `/remote-jobs/...` posting. The extraction
 * schema has no way to tell the model to distinguish them, so this is a
 * second, deterministic pass: keep only URLs shaped like a real posting.
 */
function isRealPostingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith("weworkremotely.com") &&
      parsed.pathname.startsWith("/remote-jobs/") &&
      parsed.pathname !== "/remote-jobs/search"
    );
  } catch {
    return false;
  }
}

/** Relative "posted Xd/Xmo ago" text → an actual Date, best-effort. */
function parsePostedText(text: string | undefined): Date | null {
  if (!text) return null;
  const match = /^(\d+)\s*(d|day|days|mo|month|months|h|hour|hours)$/i.exec(text.trim());
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const msPerUnit = unit.startsWith("h")
    ? 60 * 60 * 1000
    : unit.startsWith("mo")
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

  const date = new Date(Date.now() - amount * msPerUnit);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Stable id from the posting's own path — WWR has no separate numeric id in the listing. */
function sourceIdFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\/remote-jobs\//, "");
}

function normalizeFirecrawlJob(raw: FirecrawlJob): Partial<NormalizedJob> | null {
  if (!raw.applyUrl || !isRealPostingUrl(raw.applyUrl)) return null;

  return {
    source: "FIRECRAWL",
    sourceId: sourceIdFromUrl(raw.applyUrl),
    title: raw.title ?? "",
    company: raw.company ?? "Unknown",
    companyDomain: null,
    location: raw.location ?? "Remote",
    countryCode: null,
    isRemote: raw.isRemote ?? inferRemote(raw.title ?? "", raw.location ?? "", true),
    employmentType: null,
    seniority: null,
    // The listing blurb, not the full JD — see the module doc comment.
    descriptionText: [raw.title, raw.company, raw.location].filter(Boolean).join(" — "),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: raw.applyUrl,
    sourceUrl: raw.applyUrl,
    postedAt: parsePostedText(raw.postedText),
    raw,
  };
}

/** Lightweight client-side filter — Firecrawl scraped the whole category page unfiltered. */
function matchesSearchParams(job: FirecrawlJob, params: SearchParams): boolean {
  if (params.keywords.length === 0 && params.targetRoles.length === 0) return true;

  const searchable = [job.title, job.company, job.location].filter(Boolean).join(" ").toLowerCase();
  const terms = [...params.targetRoles, ...params.keywords];
  return terms.some((term) => searchable.includes(term.toLowerCase()));
}

function getCleanFirecrawlApiKey(): string {
  const raw = process.env.FIRECRAWL_API_KEY || "";
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key;
}

export function isFirecrawlConfigured(): boolean {
  return getCleanFirecrawlApiKey().length > 0;
}

const WWR_RSS_CATEGORIES = [
  "remote-programming-jobs",
  "remote-full-stack-programming-jobs",
  "remote-front-end-programming-jobs",
  "remote-back-end-programming-jobs",
  "remote-devops-sysadmin-jobs",
];

export async function fetchWwrRssJobs(
  _params: SearchParams,
): Promise<{ jobs: NormalizedJob[]; errors: string[] }> {
  const errors: string[] = [];
  const jobs: NormalizedJob[] = [];
  const seenUrls = new Set<string>();

  const results = await Promise.allSettled(
    WWR_RSS_CATEGORIES.map(async (category) => {
      const url = `https://weworkremotely.com/categories/${category}.rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "JobBoard-Aggregator/1.0 (RSS Reader; one-request-per-scan; contact: student@example.com)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.text();
    }),
  );

  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    const xml = res.value;
    const rawItems = xml.split("<item>").slice(1);

    for (const itemXml of rawItems) {
      const itemEnd = itemXml.indexOf("</item>");
      const item = itemEnd !== -1 ? itemXml.slice(0, itemEnd) : itemXml;

      const titleMatch =
        /<title><\!\[CDATA\[(.*?)\]\]><\/title>/i.exec(item) ||
        /<title>(.*?)<\/title>/i.exec(item);
      const linkMatch =
        /<link><\!\[CDATA\[(.*?)\]\]><\/link>/i.exec(item) ||
        /<link>(.*?)<\/link>/i.exec(item);
      const descMatch =
        /<description><\!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(item) ||
        /<description>([\s\S]*?)<\/description>/i.exec(item);
      const pubDateMatch =
        /<pubDate><\!\[CDATA\[(.*?)\]\]><\/pubDate>/i.exec(item) ||
        /<pubDate>(.*?)<\/pubDate>/i.exec(item);

      const rawTitle = (titleMatch?.[1] || "").trim();
      const applyUrl = (linkMatch?.[1] || "").trim();
      if (!rawTitle || !applyUrl || seenUrls.has(applyUrl) || !isRealPostingUrl(applyUrl)) {
        continue;
      }

      // Extract Company and Title from "Company: Title" format
      let company = "Unknown";
      let title = rawTitle;
      const colonIdx = rawTitle.indexOf(":");
      if (colonIdx > 0) {
        company = rawTitle.slice(0, colonIdx).trim();
        title = rawTitle.slice(colonIdx + 1).trim();
      }

      const descriptionHtml = descMatch?.[1] || "";
      const descriptionText = stripHtml(descriptionHtml);

      let postedAt: Date | null = null;
      if (pubDateMatch?.[1]) {
        const d = new Date(pubDateMatch[1]);
        if (!isNaN(d.getTime())) postedAt = d;
      }

      const normalized: NormalizedJob = {
        source: "FIRECRAWL",
        sourceId: sourceIdFromUrl(applyUrl),
        title,
        company,
        companyDomain: null,
        location: "Remote",
        countryCode: null,
        isRemote: true,
        employmentType: null,
        seniority: null,
        descriptionText: descriptionText || `${title} at ${company}`,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        applyUrl,
        sourceUrl: applyUrl,
        postedAt,
        raw: { title, company, applyUrl, pubDate: pubDateMatch?.[1] },
      };

      if (isValidNormalizedJob(normalized)) {
        seenUrls.add(applyUrl);
        jobs.push(normalized);
      }
    }
  }

  return { jobs, errors };
}

export async function fetchFirecrawlJobs(
  params: SearchParams,
): Promise<{ jobs: NormalizedJob[]; errors: string[] }> {
  const errors: string[] = [];

  // 1. Fetch from official public WWR category RSS feeds (zero IP block risk, instant, high volume)
  try {
    const rssResult = await fetchWwrRssJobs(params);
    if (rssResult.jobs.length > 0) {
      return rssResult;
    }
  } catch (rssErr) {
    const msg = rssErr instanceof Error ? rssErr.message : String(rssErr);
    errors.push(`WWR RSS fallback notice: ${msg}`);
  }

  // 2. Fallback to Firecrawl extraction if RSS returned 0 and key is configured
  const apiKey = getCleanFirecrawlApiKey();
  if (!apiKey) {
    return { jobs: [], errors };
  }

  try {
    const response = await fetch(FIRECRAWL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: TARGET_URL,
        formats: [{ type: "json", schema: EXTRACTION_SCHEMA }],
        onlyMainContent: true,
        timeout: 15_000,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) {
        errors.push("Firecrawl: rate limited (429)");
      } else if (response.status === 401 || response.status === 403) {
        errors.push(`Firecrawl: invalid or unauthorized FIRECRAWL_API_KEY (${response.status})`);
      } else {
        errors.push(`Firecrawl: HTTP ${response.status} — ${body.slice(0, 200)}`);
      }
      return { jobs: [], errors };
    }

    const result = (await response.json()) as FirecrawlScrapeResponse;
    if (!result.success) {
      errors.push(`Firecrawl: ${result.error ?? "scrape reported failure"}`);
      return { jobs: [], errors };
    }

    const rawJobs = result.data?.json?.jobs;
    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
      return { jobs: [], errors };
    }

    const matched = rawJobs.filter((j) => matchesSearchParams(j, params)).slice(0, MAX_JOBS_PER_RUN);
    const seen = new Set<string>();
    const jobs: NormalizedJob[] = [];
    for (const raw of matched) {
      const normalized = normalizeFirecrawlJob(raw);
      if (!normalized || !isValidNormalizedJob(normalized)) continue;
      if (seen.has(normalized.applyUrl)) continue;
      seen.add(normalized.applyUrl);
      jobs.push(normalized);
    }

    return { jobs, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Firecrawl fallback: ${msg}`);
    return { jobs: [], errors };
  }
}

export function createFirecrawlAdapter(): JobSourceAdapter {
  return {
    source: "FIRECRAWL",
    requiresKey: false,

    async search(params: SearchParams): Promise<AdapterResult> {
      try {
        const { jobs, errors } = await fetchFirecrawlJobs(params);
        return { jobs, requests: 1, errors };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { jobs: [], requests: 1, errors: [`WeWorkRemotely: ${msg}`] };
      }
    },
  };
}
