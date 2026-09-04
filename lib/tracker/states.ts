import { ApplicationStatus } from "@prisma/client";

export const STATUS_ORDER: readonly ApplicationStatus[] = [
  "EVALUATED",
  "APPLIED",
  "RESPONDED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "DISCARDED",
  "SKIP",
  "HIRED",
] as const;

export const TERMINAL: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>([
  "OFFER",
  "REJECTED",
  "DISCARDED",
  "SKIP",
  "HIRED",
]);

/**
 * Board tone per status, as token-backed utility classes.
 *
 * The palette is deliberately monochrome plus one accent, so a status is
 * read from its position and label, not from a hue. These map the nine
 * statuses onto the four tones the palette actually has: neutral (not
 * acted on), ink (in your hands), accent (theirs to answer), and error /
 * dormant (closed). No component picks a color of its own. (Invariant 8)
 */
export const STATUS_TONE: Record<ApplicationStatus, string> = {
  EVALUATED: "bg-text-muted",
  APPLIED: "bg-text-primary",
  RESPONDED: "bg-accent-muted",
  INTERVIEW: "bg-accent",
  OFFER: "bg-accent",
  HIRED: "bg-accent-muted",
  REJECTED: "bg-state-error",
  DISCARDED: "bg-border-strong",
  SKIP: "bg-border-strong",
};

/** Human label per status, sentence case, as the user thinks of it. */
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  EVALUATED: "Saved",
  APPLIED: "Applied",
  RESPONDED: "Responded",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  DISCARDED: "Discarded",
  SKIP: "Skipped",
  HIRED: "Hired",
};
