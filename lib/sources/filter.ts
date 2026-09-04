import type { NormalizedJob } from "./types";

/**
 * Deterministic pre-filter. Runs between normalization and evaluation.
 * Every posting it drops is a Claude call not made — the cheapest cost
 * control in the system.
 *
 * Returns { passed, filtered } so the caller can report
 * ScanRun.jobsFiltered accurately.
 */

export interface FilterParams {
  /** Matched against the job TITLE only. The user's `targetRoles`. */
  roleTitles: string[];
  /** Matched against title + description. The user's `keywords`. */
  keywords: string[];
  excludeKeywords: string[];
  excludedCompanies: string[];
  remoteOnly: boolean;
  minSalary: number | null;
  salaryCurrency: string | null;
  freshnessWindowDays: number;
  seniority?: string | null;
  employmentTypes?: string[];
}

export interface FilterResult {
  passed: NormalizedJob[];
  filtered: number;
}

const DEFAULT_FRESHNESS_DAYS = 30;

/**
 * Build filter params from Preferences with sensible defaults.
 */
export function buildFilterParams(prefs: {
  targetRoles?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
  excludedCompanies?: string[];
  remoteOnly?: boolean;
  minSalary?: number | null;
  salaryCurrency?: string | null;
  seniority?: string | null;
  employmentTypes?: string[];
}): FilterParams {
  return {
    roleTitles: prefs.targetRoles ?? [],
    keywords: prefs.keywords ?? [],
    excludeKeywords: prefs.excludeKeywords ?? [],
    excludedCompanies: prefs.excludedCompanies ?? [],
    remoteOnly: prefs.remoteOnly ?? false,
    minSalary: prefs.minSalary ?? null,
    salaryCurrency: prefs.salaryCurrency ?? null,
    freshnessWindowDays: DEFAULT_FRESHNESS_DAYS,
    seniority: prefs.seniority ?? null,
    employmentTypes: prefs.employmentTypes ?? [],
  };
}

/**
 * Check if any keyword from the list matches the text (case-insensitive).
 */
function matchesAny(text: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const lower = text.toLowerCase();
  const normalizedText = lower.replace(/[-_\s.]+/g, "");

  return terms.some((term) => {
    const t = term.trim().toLowerCase();
    if (!t) return false;
    if (lower.includes(t)) return true;

    // Check normalized punctuation/spacing variation (e.g., "full-stack", "full stack", "fullstack", "node.js", "nodejs")
    const normalizedTerm = t.replace(/[-_\s.]+/g, "");
    if (normalizedTerm.length > 2 && normalizedText.includes(normalizedTerm)) {
      return true;
    }
    return false;
  });
}

/**
 * Check exclude-keyword match against title + description.
 */
function matchesExcludeKeyword(job: NormalizedJob, excludeKeywords: string[]): boolean {
  const searchable = `${job.title} ${job.descriptionText}`;
  return matchesAny(searchable, excludeKeywords);
}

/**
 * Check excluded-company match against company name.
 */
function matchesExcludedCompany(job: NormalizedJob, excludedCompanies: string[]): boolean {
  return matchesAny(job.company, excludedCompanies);
}

/**
 * Check keyword match: at least one keyword must appear in
 * title + description. Only applies when keywords are set.
 */
function matchesKeyword(job: NormalizedJob, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) return true; // no keywords = pass all
  const searchable = `${job.title} ${job.descriptionText}`;
  return matchesAny(searchable, keywords);
}

/**
 * Generic role nouns and modifiers that carry no distinguishing signal on
 * their own — "engineer", "senior", a trailing "II". Stripped before the
 * token check so "Full stack engineer" still matches "Senior Full-Stack
 * Developer" but not "Backend Engineer".
 */
const GENERIC_ROLE_WORDS = new Set([
  "engineer", "engineering", "developer", "dev", "programmer",
  "senior", "sr", "junior", "jr", "staff", "principal", "lead",
  "mid", "intern", "internship", "i", "ii", "iii", "iv",
  "the", "a", "an", "of", "and", "or", "for", "with", "to",
  "specialist", "consultant", "associate", "member", "technical",
]);

/**
 * Does the job TITLE match one of the user's target roles?
 *
 * The ATS board adapters (Greenhouse / Lever / Ashby — the default and
 * highest-volume sources) have no server-side search: they return every
 * posting on a company's board. Matching `targetRoles` against the title
 * here is the only thing that keeps the feed to roles the user actually
 * asked for, rather than every posting whose description happens to name a
 * technology.
 *
 * A role matches when the title contains the whole phrase, or contains
 * every distinctive (non-generic) word from it.
 */
export function matchesRoleTitle(title: string, roleTitles?: string[]): boolean {
  if (!roleTitles || roleTitles.length === 0) return true;
  const lower = title.toLowerCase();
  const collapsed = lower.replace(/[-_\s.]+/g, "");

  return roleTitles.some((role) => {
    const r = role.trim().toLowerCase();
    if (!r) return false;
    if (lower.includes(r)) return true;
    if (collapsed.includes(r.replace(/[-_\s.]+/g, ""))) return true;

    const distinctive = r
      .split(/[-_\s./]+/)
      .filter((w) => w.length > 1 && !GENERIC_ROLE_WORDS.has(w));
    if (distinctive.length === 0) return false;
    return distinctive.every((w) => collapsed.includes(w));
  });
}

/**
 * Check freshness: posting must be within the window.
 * Jobs with no postedAt pass (we don't know, so don't drop).
 */
function withinFreshnessWindow(job: NormalizedJob, windowDays: number): boolean {
  if (!job.postedAt) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  return job.postedAt >= cutoff;
}

/**
 * Check remote filter: when remoteOnly is set, drop non-remote postings.
 */
function passesRemoteFilter(job: NormalizedJob, remoteOnly: boolean): boolean {
  if (!remoteOnly) return true;
  return job.isRemote;
}

/**
 * Check salary floor: drop below minSalary ONLY when both the floor
 * and the posting's salary are known. Never drop for an unknown salary.
 */
function passesSalaryFloor(
  job: NormalizedJob,
  minSalary: number | null,
  salaryCurrency: string | null,
): boolean {
  // No floor set — pass
  if (minSalary == null) return true;
  // Posting salary unknown — pass (never drop for unknown)
  if (job.salaryMax == null && job.salaryMin == null) return true;
  // Currency mismatch — pass (can't compare different currencies)
  if (salaryCurrency && job.salaryCurrency && job.salaryCurrency !== salaryCurrency) return true;
  // Compare: the posting's max (or min as fallback) against the floor
  const postingSalary = job.salaryMax ?? job.salaryMin ?? 0;
  return postingSalary >= minSalary;
}

const SENIOR_INDICATORS = [
  "senior",
  "sr.",
  "sr ",
  "staff",
  "principal",
  "lead",
  "director",
  "head of",
  "vp ",
  "vice president",
  "manager",
];

const INTERN_INDICATORS = [
  "intern",
  "internship",
  "co-op",
  "coop",
  "apprentice",
  "apprenticeship",
  "fellow",
  "fellowship",
  "trainee",
  "student",
  "graduate",
];

function passesSeniorityFilter(job: NormalizedJob, seniority: string | null | undefined): boolean {
  if (!seniority) return true;
  const target = seniority.toUpperCase();
  const lowerTitle = job.title.toLowerCase();

  const isInternJob =
    job.seniority === "INTERN" ||
    (job.employmentType || "").toLowerCase().includes("intern") ||
    INTERN_INDICATORS.some((w) => lowerTitle.includes(w));

  const isSeniorJob =
    ["SENIOR", "STAFF", "LEAD", "PRINCIPAL"].includes(job.seniority || "") ||
    SENIOR_INDICATORS.some((w) => lowerTitle.includes(w));

  // The pre-filter only drops postings that confidently point the *opposite*
  // way from the target. Deciding whether a plain "Software Engineer" is too
  // senior for an intern is exactly the judgement the match evaluation makes
  // (experienceDepth / logistics dimensions and their score caps) — doing it
  // here with a title-keyword guess would drop almost every real posting
  // before the model ever sees it. See context/job-sources.md: seniority is
  // not one of the five pre-filter rules.
  if (target === "INTERN") {
    return !(isSeniorJob && !isInternJob);
  }

  if (target === "JUNIOR") {
    const clearlySenior =
      ["STAFF", "LEAD", "PRINCIPAL"].includes(job.seniority || "") ||
      ["staff", "principal", "director", "head of", "vice president"].some((w) =>
        lowerTitle.includes(w),
      );
    return !(clearlySenior && !lowerTitle.includes("junior") && !lowerTitle.includes("associate"));
  }

  if (["SENIOR", "STAFF", "LEAD", "PRINCIPAL"].includes(target)) {
    return !isInternJob;
  }

  return true;
}

function passesEmploymentTypeFilter(
  job: NormalizedJob,
  employmentTypes?: string[],
): boolean {
  if (!employmentTypes || employmentTypes.length === 0) return true;

  // Tolerate both the UI's "Full-time" / "Internship" and snake_case forms.
  const norm = employmentTypes.map((t) => t.toLowerCase().replace(/[-\s]+/g, "_"));
  const has = (...vals: string[]) => vals.some((v) => norm.includes(v));

  const wantsInternshipOnly =
    has("internship", "intern") &&
    !has("full_time", "fulltime", "part_time", "contract", "temporary");

  if (wantsInternshipOnly) {
    const lowerTitle = job.title.toLowerCase();
    const lowerDesc = job.descriptionText.toLowerCase();
    const lowerType = (job.employmentType || "").toLowerCase();

    const isInternJob =
      job.seniority === "INTERN" ||
      lowerType.includes("intern") ||
      INTERN_INDICATORS.some((w) => lowerTitle.includes(w)) ||
      lowerDesc.includes("internship") ||
      lowerDesc.includes("intern ");

    return isInternJob;
  }

  return true;
}

/**
 * Run all filter rules against a batch of normalized jobs.
 * Pure function — no side effects, no API calls.
 */
export function preFilter(jobs: NormalizedJob[], params: FilterParams): FilterResult {
  const passed: NormalizedJob[] = [];
  let filtered = 0;

  for (const job of jobs) {
    // Drop excludeKeywords matches
    if (matchesExcludeKeyword(job, params.excludeKeywords)) {
      filtered++;
      continue;
    }

    // Drop excludedCompanies matches
    if (matchesExcludedCompany(job, params.excludedCompanies)) {
      filtered++;
      continue;
    }

    // Drop postings whose title matches none of the target roles
    if (!matchesRoleTitle(job.title, params.roleTitles)) {
      filtered++;
      continue;
    }

    // Drop postings matching no keyword when keywords are set
    if (!matchesKeyword(job, params.keywords)) {
      filtered++;
      continue;
    }

    // Drop postings older than freshness window
    if (!withinFreshnessWindow(job, params.freshnessWindowDays)) {
      filtered++;
      continue;
    }

    // Drop non-remote when remoteOnly is set
    if (!passesRemoteFilter(job, params.remoteOnly)) {
      filtered++;
      continue;
    }

    // Drop below minSalary when both are known
    if (!passesSalaryFloor(job, params.minSalary, params.salaryCurrency)) {
      filtered++;
      continue;
    }

    // Drop non-matching seniority levels
    if (!passesSeniorityFilter(job, params.seniority)) {
      filtered++;
      continue;
    }

    // Drop non-matching employment types (e.g. if internship only)
    if (!passesEmploymentTypeFilter(job, params.employmentTypes)) {
      filtered++;
      continue;
    }

    passed.push(job);
  }

  return { passed, filtered };
}
