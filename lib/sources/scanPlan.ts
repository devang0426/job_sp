import type { Preferences } from "@prisma/client";
import type { QuerySnapshot } from "@/lib/db/scanRuns";
import type { SearchParams } from "./types";
import { buildFilterParams, type FilterParams } from "./filter";

/**
 * Freeze the fields of `Preferences` a scan depends on. Stored on
 * `ScanRun.querySnapshot` so the run stays reproducible after the user
 * edits their preferences.
 */
export function buildQuerySnapshot(prefs: Preferences): QuerySnapshot {
  return {
    capturedAt: new Date().toISOString(),
    targetRoles: prefs.targetRoles,
    keywords: prefs.keywords,
    locations: prefs.locations,
    remoteOnly: prefs.remoteOnly,
    seniority: prefs.seniority ?? null,
    employmentTypes: prefs.employmentTypes,
    excludeKeywords: prefs.excludeKeywords,
    excludedCompanies: prefs.excludedCompanies,
    minSalary: prefs.minSalary ?? null,
    salaryCurrency: prefs.salaryCurrency,
    sources: prefs.sources,
    maxJobsPerScan: prefs.maxJobsPerScan,
    autoEvaluate: prefs.autoEvaluate,
  };
}

export function searchParamsFromSnapshot(snapshot: QuerySnapshot): SearchParams {
  return {
    keywords: snapshot.keywords,
    targetRoles: snapshot.targetRoles,
    locations: snapshot.locations,
    remoteOnly: snapshot.remoteOnly,
    seniority:
      (snapshot.seniority as SearchParams["seniority"]) ?? null,
  };
}

export function filterParamsFromSnapshot(snapshot: QuerySnapshot): FilterParams {
  // targetRoles gate the job TITLE; keywords gate title + description. They
  // were previously merged into one title-or-description keyword list, which
  // let any posting whose description named a listed technology through
  // regardless of what the role actually was.
  return buildFilterParams({
    targetRoles: (snapshot.targetRoles || []).filter((k) => k.trim() !== ""),
    keywords: (snapshot.keywords || []).filter((k) => k.trim() !== ""),
    excludeKeywords: snapshot.excludeKeywords,
    excludedCompanies: snapshot.excludedCompanies,
    remoteOnly: snapshot.remoteOnly,
    minSalary: snapshot.minSalary,
    salaryCurrency: snapshot.salaryCurrency,
    seniority: snapshot.seniority ?? null,
    employmentTypes: snapshot.employmentTypes ?? [],
  });
}
