/**
 * Normalizes raw resume text by cleaning up formatting, standardizing line endings,
 * stripping header/footer page artifacts, and consolidating excessive whitespace.
 * Pure string helper with zero external native dependencies.
 */
export function normalizeResumeText(text: string): string {
  if (!text) return "";

  return text
    // Normalize line endings
    .replace(/\r\n|\r/g, "\n")
    // Collapse horizontal whitespace (spaces, tabs) except line breaks
    .replace(/[ \t]+/g, " ")
    // Strip common page number header/footer artifacts
    .replace(/\bPage\s+\d+(\s+of\s+\d+)?\b/gi, "")
    // Collapse 3 or more consecutive newlines into double newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim leading/trailing lines
    .trim();
}
