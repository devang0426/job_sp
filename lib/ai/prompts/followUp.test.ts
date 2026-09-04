import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VERSION,
  SYSTEM,
  buildUser,
  FollowUpInput,
  FollowUpOutputSchema,
} from "./followUp";
import { calculateCostUsd } from "../cost";

describe("Follow-up Email Prompt & Schema", () => {
  it("exports required VERSION, SYSTEM, and buildUser", () => {
    assert.equal(typeof VERSION, "string");
    assert.ok(VERSION.startsWith("followup@"));
    assert.equal(typeof SYSTEM, "string");
    assert.equal(typeof buildUser, "function");
  });

  it("SYSTEM prompt enforces non-negotiable constraints", () => {
    // Under 150 words rule
    assert.ok(SYSTEM.includes("150 words"));
    // Reference specific role/company details, not generic
    assert.ok(SYSTEM.includes("specific"));
    // No apologies rule
    assert.ok(SYSTEM.includes("apolog"));
    // Plain text rule (no markdown, no emoji)
    assert.ok(SYSTEM.includes("markdown"));
    assert.ok(SYSTEM.includes("emoji"));
    // One clear ask rule
    assert.ok(SYSTEM.includes("ask"));
  });

  it("buildUser serializes volatile application context accurately", () => {
    const input: FollowUpInput = {
      company: "Stripe",
      role: "Staff Backend Engineer",
      appliedAt: "2026-08-20T10:00:00.000Z",
      daysSinceApplied: 13,
      currentStatus: "APPLIED",
      matchSummary: "Strong distributed systems background and PostgreSQL indexing expertise match core requirements.",
      tone: "direct",
      userContextNote: "Spoke briefly with Sarah at tech meetup last month.",
    };

    const userPrompt = buildUser(input);
    assert.ok(userPrompt.includes("Stripe"));
    assert.ok(userPrompt.includes("Staff Backend Engineer"));
    assert.ok(userPrompt.includes("13 days"));
    assert.ok(userPrompt.toLowerCase().includes("direct"));
    assert.ok(userPrompt.includes("Sarah at tech meetup"));
    assert.ok(userPrompt.includes("PostgreSQL indexing"));
  });

  it("validates valid follow-up output against FollowUpOutputSchema", () => {
    const validDraft = {
      subject: "Following up on Staff Backend Engineer application",
      body: "Hi Jane,\n\nI applied for the Staff Backend Engineer role at Stripe two weeks ago. Given the team's focus on high-throughput ledger pipelines and my recent work architecting low-latency payment rails, I remain very excited about contributing.\n\nCould you share if there are any updates regarding next steps in the interview process?\n\nBest regards,\nAlex",
    };

    const parsed = FollowUpOutputSchema.safeParse(validDraft);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.subject, validDraft.subject);
      assert.equal(parsed.data.body, validDraft.body);
    }
  });

  it("rejects output missing subject or body", () => {
    const invalidDraft = {
      subject: "Just a subject",
    };

    const parsed = FollowUpOutputSchema.safeParse(invalidDraft);
    assert.equal(parsed.success, false);
  });

  it("calculates cost accurately for follow-up model calls", () => {
    const cost = calculateCostUsd({
      model: "claude-sonnet-5",
      inputTokens: 1200,
      outputTokens: 250,
    });
    // 1200 * 2.0 / 1M = 0.0024
    // 250 * 10.0 / 1M = 0.0025
    // total = 0.0049
    assert.equal(cost, 0.0049);
  });
});
