import { NextResponse } from "next/server";

// The one response envelope. Every route handler uses ok() / fail() — no
// ad-hoc NextResponse.json. See context/code-standards.md.
//
//   { data: T }                                  // 2xx
//   { error: { code, message } }                 // 4xx / 5xx

// Machine-readable, stable error codes. Add here, never inline a string.
export const ERROR_CODES = [
  "UNAUTHORIZED",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "PDF_UNREADABLE",
  "NO_ACTIVE_RESUME",
  "QUOTA_EXCEEDED",
  "SCAN_IN_PROGRESS",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: ErrorCode; message: string } };

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

// message is shown to the user: say what happened and what to do, no
// apologies, no vagueness. See the copy rules in context/ui-context.md.
export function fail(
  code: ErrorCode,
  message: string,
  status: number,
): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}
