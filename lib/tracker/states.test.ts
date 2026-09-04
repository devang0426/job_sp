import test from "node:test";
import assert from "node:assert/strict";
import { formatDaysInStatus } from "@/components/tracker/Card";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  TERMINAL,
} from "@/lib/tracker/states";

test("tracker: STATUS_ORDER contains 9 canonical statuses in correct sequence", () => {
  assert.equal(STATUS_ORDER.length, 9);
  assert.deepEqual(Array.from(STATUS_ORDER), [
    "EVALUATED",
    "APPLIED",
    "RESPONDED",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "DISCARDED",
    "SKIP",
    "HIRED",
  ]);
});

test("tracker: TERMINAL contains exactly 5 terminal statuses", () => {
  assert.equal(TERMINAL.size, 5);
  assert.ok(TERMINAL.has("OFFER"));
  assert.ok(TERMINAL.has("REJECTED"));
  assert.ok(TERMINAL.has("DISCARDED"));
  assert.ok(TERMINAL.has("SKIP"));
  assert.ok(TERMINAL.has("HIRED"));
  assert.ok(!TERMINAL.has("EVALUATED"));
  assert.ok(!TERMINAL.has("APPLIED"));
  assert.ok(!TERMINAL.has("RESPONDED"));
  assert.ok(!TERMINAL.has("INTERVIEW"));
});

test("tracker: days-in-status counts correctly from statusChangedAt", () => {
  const now = new Date();
  assert.equal(formatDaysInStatus(now), "0d");

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  assert.equal(formatDaysInStatus(twoDaysAgo), "2d");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  assert.equal(formatDaysInStatus(sevenDaysAgo), "7d");
});

test("tracker: every status has a tone and a label", () => {
  for (const status of STATUS_ORDER) {
    assert.ok(STATUS_TONE[status], `${status} has no tone`);
    assert.ok(STATUS_LABEL[status], `${status} has no label`);
  }
  assert.equal(Object.keys(STATUS_TONE).length, STATUS_ORDER.length);
  assert.equal(Object.keys(STATUS_LABEL).length, STATUS_ORDER.length);
});

// Invariant 8: no component reads a color except through a token. A raw
// Tailwind palette class here would put a hue on the board that the
// palette in globals.css never authorised.
test("tracker: status tones are token-backed utilities only", () => {
  const ALLOWED = new Set([
    "bg-text-primary",
    "bg-text-muted",
    "bg-accent",
    "bg-accent-muted",
    "bg-state-error",
    "bg-border-strong",
  ]);
  for (const [status, tone] of Object.entries(STATUS_TONE)) {
    assert.ok(ALLOWED.has(tone), `${status} uses a non-token color: ${tone}`);
  }
});
