import type { JobSource } from "@prisma/client";

/**
 * Monthly request counter per source.
 *
 * Quota defense rule 4: "A monthly request counter per source. When
 * exhausted, skip that source and mark the run PARTIAL — do not throw,
 * do not fail the run."
 *
 * Uses an in-memory counter keyed by `source:YYYY-MM`. In a single-
 * process dev server this is sufficient. For production with multiple
 * replicas, the counter would need to be backed by a database row or
 * a KV store — but on a free tier with 200–250 calls/month, a single
 * serverless instance or trigger.dev task is the realistic deployment.
 */

interface MonthlyCount {
  month: string; // "YYYY-MM"
  requests: number;
}

const counters = new Map<JobSource, MonthlyCount>();

/**
 * Monthly request ceilings per source.
 * Only metered sources need entries here.
 */
const MONTHLY_LIMITS: Partial<Record<JobSource, number>> = {
  ADZUNA: 250,
  JSEARCH: 200,
  // Conservative placeholder — Firecrawl's free-tier credit grant has
  // changed shape before and is worth confirming against the current
  // plan on firecrawl.dev/pricing rather than trusting this number.
  // One scrape+extract call is metered as more than one plain scrape.
  FIRECRAWL: 100,
};

function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getOrReset(source: JobSource): MonthlyCount {
  const month = currentMonth();
  const existing = counters.get(source);

  if (existing && existing.month === month) {
    return existing;
  }

  // New month — reset
  const fresh: MonthlyCount = { month, requests: 0 };
  counters.set(source, fresh);
  return fresh;
}

/**
 * Check whether this source has remaining quota for the current month.
 * Sources without a configured limit always have quota.
 */
export function hasQuota(source: JobSource): boolean {
  const limit = MONTHLY_LIMITS[source];
  if (limit == null) return true; // unmetered source

  const count = getOrReset(source);
  return count.requests < limit;
}

/**
 * Record that a request was made against a source.
 * Call this after every real network request (not cache hits).
 */
export function recordRequest(source: JobSource, count = 1): void {
  const entry = getOrReset(source);
  entry.requests += count;
}

/**
 * Get the remaining quota for a source in the current month.
 * Returns Infinity for unmetered sources.
 */
export function remainingQuota(source: JobSource): number {
  const limit = MONTHLY_LIMITS[source];
  if (limit == null) return Infinity;

  const entry = getOrReset(source);
  return Math.max(0, limit - entry.requests);
}

/**
 * Get current month's usage for a source.
 */
export function currentUsage(source: JobSource): { requests: number; limit: number | null } {
  const limit = MONTHLY_LIMITS[source] ?? null;
  const entry = getOrReset(source);
  return { requests: entry.requests, limit };
}
