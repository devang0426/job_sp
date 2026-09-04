import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { JobSource } from "@prisma/client";
import type { JobSourceAdapter } from "./types";
import { createGreenhouseAdapter } from "./greenhouse";
import { createLeverAdapter } from "./lever";
import { createAshbyAdapter } from "./ashby";
import { createAdzunaAdapter } from "./adzuna";
import { createJSearchAdapter } from "./jsearch";
import { createScraperAdapter } from "./scraper";
import { createFirecrawlAdapter } from "./firecrawl";

// Re-export everything consumers need
export type { JobSourceAdapter, AdapterResult, SearchParams, NormalizedJob } from "./types";
export { preFilter, buildFilterParams } from "./filter";
export type { FilterParams, FilterResult } from "./filter";
export { generateDedupeKey } from "./dedupe";
export { dedupeBatch } from "./ingest";
export type { DedupeBatchResult } from "./ingest";
export { hasQuota, recordRequest, remainingQuota, currentUsage } from "./quota";
export { readCache, writeCache, cachedFetch } from "./cache";

/**
 * A portal entry from config/portals.yml.
 */
export interface Portal {
  company: string;
  ats: "greenhouse" | "lever" | "ashby";
  token: string;
}

interface PortalsFile {
  portals: Portal[];
}

let cachedPortals: Portal[] | null = null;

/**
 * Load portals from config/portals.yml. Cached after first read.
 */
export function loadPortals(): Portal[] {
  if (cachedPortals) return cachedPortals;

  // Tasks run on trigger.dev's infrastructure, where only what the build
  // bundles exists. `additionalFiles` in trigger.config.ts copies this file
  // in at the same relative path, so cwd resolution holds there too.
  const filePath = join(process.cwd(), "config", "portals.yml");
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      `Could not read ${filePath}. If this is a trigger.dev task, confirm ` +
        `config/portals.yml is listed in the additionalFiles build extension.`,
    );
  }
  const parsed = parseYaml(raw) as PortalsFile;

  if (!parsed.portals || !Array.isArray(parsed.portals)) {
    throw new Error("config/portals.yml: missing or invalid 'portals' array");
  }

  cachedPortals = parsed.portals;
  return cachedPortals;
}

/**
 * Map ATS name to JobSource enum value.
 */
const ATS_TO_SOURCE: Record<Portal["ats"], JobSource> = {
  greenhouse: "GREENHOUSE",
  lever: "LEVER",
  ashby: "ASHBY",
};

/**
 * Build adapters from portals.yml, optionally filtered by enabled sources.
 */
export function buildAtsAdapters(
  enabledSources?: JobSource[],
): JobSourceAdapter[] {
  const portals = loadPortals();
  const adapters: JobSourceAdapter[] = [];

  for (const portal of portals) {
    const source = ATS_TO_SOURCE[portal.ats];

    // Skip if this source type is not enabled
    if (enabledSources && !enabledSources.includes(source)) {
      continue;
    }

    switch (portal.ats) {
      case "greenhouse":
        adapters.push(createGreenhouseAdapter(portal.company, portal.token));
        break;
      case "lever":
        adapters.push(createLeverAdapter(portal.company, portal.token));
        break;
      case "ashby":
        adapters.push(createAshbyAdapter(portal.company, portal.token));
        break;
    }
  }

  return adapters;
}

/**
 * Build metered search API adapters, filtered by enabled sources.
 * These require API keys and have monthly quotas.
 */
export function buildSearchAdapters(
  enabledSources?: JobSource[],
): JobSourceAdapter[] {
  const adapters: JobSourceAdapter[] = [];

  if (!enabledSources || enabledSources.includes("ADZUNA")) {
    adapters.push(createAdzunaAdapter());
  }

  if (!enabledSources || enabledSources.includes("JSEARCH")) {
    adapters.push(createJSearchAdapter());
  }

  return adapters;
}

/**
 * Build the scraper adapter if SCRAPED is in the enabled sources.
 */
export function buildScraperAdapters(
  enabledSources?: JobSource[],
): JobSourceAdapter[] {
  if (enabledSources && !enabledSources.includes("SCRAPED")) {
    return [];
  }
  return [createScraperAdapter()];
}

/**
 * Build the Firecrawl adapter if FIRECRAWL is in the enabled sources.
 * A separate function from `buildSearchAdapters` on purpose: Firecrawl is
 * metered like Adzuna/JSearch, but it scrapes a listing page rather than
 * calling a job-aggregator API, which puts it closer in kind to
 * `buildScraperAdapters` above.
 */
export function buildFirecrawlAdapters(
  enabledSources?: JobSource[],
): JobSourceAdapter[] {
  if (enabledSources && !enabledSources.includes("FIRECRAWL")) {
    return [];
  }
  return [createFirecrawlAdapter()];
}

/**
 * Build all adapters — ATS boards + metered search APIs + scrapers —
 * filtered by the user's enabled sources preference.
 */
export function buildAllAdapters(
  enabledSources?: JobSource[],
): JobSourceAdapter[] {
  return [
    ...buildAtsAdapters(enabledSources),
    ...buildSearchAdapters(enabledSources),
    ...buildScraperAdapters(enabledSources),
    ...buildFirecrawlAdapters(enabledSources),
  ];
}
