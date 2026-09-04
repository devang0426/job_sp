import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

/**
 * Development-only on-disk response cache.
 *
 * Keyed by SHA-256 of the request URL. Prevents burning metered API
 * quota while iterating on parsers. Rule 5 of quota defense:
 * "Cache responses in development. Iterating on a parser must cost nothing."
 *
 * In production the cache is a no-op — reads always miss and writes
 * are silently dropped.
 */

const CACHE_DIR = join(process.cwd(), ".cache", "source-responses");
const IS_DEV = process.env.NODE_ENV !== "production";

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKeyFor(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Read a cached response. Returns null on miss or in production.
 */
export function readCache<T>(url: string): T | null {
  if (!IS_DEV) return null;

  const key = cacheKeyFor(url);
  const path = cachePath(key);

  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf-8");
    const envelope = JSON.parse(raw) as { url: string; cachedAt: string; data: T };
    const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
    if (ageMs > 10 * 60 * 1000) {
      return null; // Expired cache entry
    }
    return envelope.data;
  } catch {
    // Corrupt cache file — treat as miss
    return null;
  }
}

/**
 * Write a response to the cache. No-op in production.
 */
export function writeCache<T>(url: string, data: T): void {
  if (!IS_DEV) return;

  try {
    ensureCacheDir();
    const key = cacheKeyFor(url);
    const envelope = {
      url,
      cachedAt: new Date().toISOString(),
      data,
    };
    writeFileSync(cachePath(key), JSON.stringify(envelope, null, 2), "utf-8");
  } catch {
    // Cache write failure is non-fatal — just means the next call
    // will hit the network again.
  }
}

/**
 * Fetch with development caching. In production, always fetches.
 * In development, returns cached response if available.
 */
export async function cachedFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T; fromCache: boolean }> {
  // Try cache first (dev only)
  const cached = readCache<T>(url);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Fetch from network with 10s ceiling
  const res = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new FetchError(res.status, `HTTP ${res.status}`);
  }

  const data = (await res.json()) as T;

  // Write to cache (dev only)
  writeCache(url, data);

  return { data, fromCache: false };
}

/**
 * Error type for non-ok HTTP responses from cachedFetch.
 */
export class FetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}
