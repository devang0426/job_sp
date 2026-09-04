import type { NormalizedJob } from "./types";

/**
 * Strip HTML to plain text, preserving paragraph and list breaks.
 * The structure carries meaning for requirement extraction downstream.
 */
export function stripHtml(html: string): string {
  let text = html;

  // Replace block-level elements with newlines to preserve structure
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|ul|ol|tr|blockquote|section|article|header|footer|main|aside|nav|hr)\b[^>]*\/?>/gi, (match) => {
    if (/^<\/(p|div|h[1-6]|li|ul|ol|tr|blockquote|section|article|header|footer|main|aside|nav)>/i.test(match)) {
      return "\n";
    }
    if (/^<br\b/i.test(match)) {
      return "\n";
    }
    if (/^<hr\b/i.test(match)) {
      return "\n---\n";
    }
    if (/^<li\b/i.test(match)) {
      return "\n• ";
    }
    return "";
  });

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-zA-Z]+;/g, " "); // remaining entities → space

  // Collapse excessive whitespace but preserve paragraph breaks
  text = text
    .replace(/[ \t]+/g, " ")         // horizontal whitespace
    .replace(/ *\n */g, "\n")        // trim around newlines
    .replace(/\n{3,}/g, "\n\n")      // max two consecutive newlines
    .trim();

  return text;
}

/**
 * Detect remote from title, location, or explicit flag.
 */
export function inferRemote(
  title: string,
  location: string | null,
  explicit?: boolean,
): boolean {
  if (explicit === true) return true;
  const combined = `${title} ${location ?? ""}`.toLowerCase();
  return /\bremote\b/.test(combined);
}

/**
 * Build a stable apply URL. Returns null only when no usable URL exists.
 */
export function buildApplyUrl(
  hostedUrl: string | null | undefined,
  absoluteUrl: string | null | undefined,
  fallback?: string,
): string | null {
  const url = hostedUrl || absoluteUrl || fallback;
  if (!url) return null;
  // Ensure absolute
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Parse a date string safely; returns null rather than Invalid Date.
 */
export function safeParseDate(raw: string | number | null | undefined): Date | null {
  if (raw == null) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Validate that a NormalizedJob has all required fields.
 * Drops jobs missing title, company, description, or applyUrl.
 */
export function isValidNormalizedJob(job: Partial<NormalizedJob>): job is NormalizedJob {
  return (
    typeof job.source === "string" &&
    typeof job.sourceId === "string" && job.sourceId.length > 0 &&
    typeof job.title === "string" && job.title.length > 0 &&
    typeof job.company === "string" && job.company.length > 0 &&
    typeof job.descriptionText === "string" && job.descriptionText.length > 0 &&
    typeof job.applyUrl === "string" && job.applyUrl.length > 0
  );
}
