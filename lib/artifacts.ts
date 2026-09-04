import type { Artifact, Prisma } from "@prisma/client";

/**
 * An `Artifact` as an editor sees it. A server component hands over the
 * Prisma row directly, while a fetch hands over the same row after JSON,
 * where `Decimal` became a string and `Date` became an ISO string. The
 * editors only display these two, so the view type accepts both forms.
 */
export type ArtifactView = Omit<Artifact, "costUsd" | "createdAt" | "editedAt"> & {
  costUsd: Prisma.Decimal | string | number | null;
  createdAt: string | Date;
  editedAt: string | Date | null;
};

/**
 * What a generated artifact was asked for, as recorded on `inputs`.
 * Every field is optional: an artifact from an older prompt version may
 * not carry it, and the editor falls back to its default.
 */
export interface ArtifactInputs {
  tone?: "direct" | "warm";
  userContextNote?: string;
  company?: string;
  jobTitle?: string;
  suggestionsCount?: number;
}

export function artifactInputs(artifact: { inputs?: unknown } | null | undefined): ArtifactInputs {
  const inputs = artifact?.inputs;
  return inputs && typeof inputs === "object" && !Array.isArray(inputs)
    ? (inputs as ArtifactInputs)
    : {};
}

/** Message from an unknown throw or a task's error payload, never `[object Object]`. */
export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
