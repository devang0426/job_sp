import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResumeText, PdfUnreadableError } from "./parse";

test("normalizeResumeText cleans up formatting and strips artifacts", () => {
  const input = "John Doe\r\nSoftware Engineer\r\n\r\n\r\nPage 1 of 2\r\nExperience  with   many    spaces.\n\n\n\nPage 2\nEnd of resume";
  const normalized = normalizeResumeText(input);

  assert.doesNotMatch(normalized, /\r/);
  assert.doesNotMatch(normalized, /Page 1 of 2/);
  assert.doesNotMatch(normalized, /Page 2/);
  assert.match(normalized, /Experience with many spaces\./);
  assert.doesNotMatch(normalized, /\n{3,}/);
});

test("PdfUnreadableError has correct error code and exact copy", () => {
  const err = new PdfUnreadableError();
  assert.equal(err.code, "PDF_UNREADABLE");
  assert.equal(
    err.message,
    "Couldn't read that PDF. Try a text-based PDF, or paste your CV instead."
  );
});
