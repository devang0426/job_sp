import type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
import { capBoardResults } from "./types";
import { stripHtml, inferRemote, safeParseDate, isValidNormalizedJob } from "./normalize";

/**
 * Lever postings API adapter.
 * Endpoint: api.lever.co/v0/postings/{company}?mode=json
 *
 * Unauthenticated, unmetered.
 */

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
  categories: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  description: string;
  descriptionPlain: string;
  lists: Array<{ text: string; content: string }>;
  additional: string;
  additionalPlain: string;
}

function normalizeLeverPosting(
  raw: LeverPosting,
  company: string,
): Partial<NormalizedJob> {
  const locationName = raw.categories?.location ?? null;
  const isRemote = inferRemote(raw.text, locationName);

  // Build full description from all available text
  let fullDescription = raw.descriptionPlain || stripHtml(raw.description || "");

  // Append list sections (requirements, qualifications, etc.)
  if (raw.lists && Array.isArray(raw.lists)) {
    for (const list of raw.lists) {
      const listText = stripHtml(list.content || "");
      if (listText) {
        fullDescription += `\n\n${list.text}\n${listText}`;
      }
    }
  }

  // Append additional info
  if (raw.additionalPlain) {
    fullDescription += `\n\n${raw.additionalPlain}`;
  } else if (raw.additional) {
    fullDescription += `\n\n${stripHtml(raw.additional)}`;
  }

  return {
    source: "LEVER",
    sourceId: raw.id,
    title: raw.text,
    company,
    companyDomain: null,
    location: locationName,
    countryCode: null,
    isRemote,
    employmentType: raw.categories?.commitment ?? null,
    seniority: null,
    descriptionText: fullDescription.trim(),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: raw.hostedUrl || raw.applyUrl,
    sourceUrl: raw.hostedUrl,
    postedAt: safeParseDate(raw.createdAt),
    raw,
  };
}

export function createLeverAdapter(
  company: string,
  token: string,
): JobSourceAdapter {
  return {
    source: "LEVER",
    requiresKey: false,

    async search(_params: SearchParams): Promise<AdapterResult> {
      const errors: string[] = [];
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;

      let data: LeverPosting[];
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          errors.push(`Lever ${token}: HTTP ${res.status}`);
          return { jobs: [], requests: 1, errors };
        }

        data = (await res.json()) as LeverPosting[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Lever ${token}: ${msg}`);
        return { jobs: [], requests: 1, errors };
      }

      if (!Array.isArray(data)) {
        errors.push(`Lever ${token}: unexpected response shape`);
        return { jobs: [], requests: 1, errors };
      }

      const jobs: NormalizedJob[] = [];
      for (const raw of data) {
        const normalized = normalizeLeverPosting(raw, company);
        if (isValidNormalizedJob(normalized)) {
          jobs.push(normalized);
        }
      }

      return { jobs: capBoardResults(jobs), requests: 1, errors };
    },
  };
}
