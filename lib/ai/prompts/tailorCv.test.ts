import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VERSION,
  SYSTEM,
  buildUser,
  TailorCvInput,
  TailorCvOutputSchema,
} from "./tailorCv";
import { calculateCostUsd } from "../cost";

describe("CV Tailoring Prompt & Output Schema", () => {
  it("exports required VERSION, SYSTEM, and buildUser", () => {
    assert.equal(typeof VERSION, "string");
    assert.ok(VERSION.startsWith("tailor@"));
    assert.equal(typeof SYSTEM, "string");
    assert.equal(typeof buildUser, "function");
  });

  it("SYSTEM prompt enforces the four non-negotiable honesty rules", () => {
    // Rule 1: Rewrite what is there, never invent experience
    assert.ok(SYSTEM.toLowerCase().includes("never invent experience"));
    assert.ok(SYSTEM.toLowerCase().includes("rewrite what is there"));

    // Rule 2: Preserve factual claims
    assert.ok(SYSTEM.toLowerCase().includes("preserve every factual claim"));
    assert.ok(SYSTEM.toLowerCase().includes("dates"));
    assert.ok(SYSTEM.toLowerCase().includes("employer"));

    // Rule 3: Explicit requirement grounding
    assert.ok(SYSTEM.toLowerCase().includes("requirement"));

    // Rule 4: Flag unaddressable requirements
    assert.ok(SYSTEM.toLowerCase().includes("unaddressablerequirements"));
    assert.ok(SYSTEM.toLowerCase().includes("flag"));
  });

  it("buildUser serializes context and findings accurately", () => {
    const input: TailorCvInput = {
      jobTitle: "Lead Infrastructure Engineer",
      company: "Cloudflare",
      jobDescription: "Looking for an engineer experienced with Terraform and multi-region network edge routing.",
      cvText: "Alex Doe\nSenior DevOps Engineer with 6 years experience in AWS, Terraform, and Docker at Stripe.",
      gaps: [
        { severity: "significant", gap: "No explicit multi-region BGP or Anycast routing experience noted." },
      ],
      cvTips: [
        { targetSection: "Experience > Senior DevOps Engineer", change: "Detail Terraform enterprise module architecture", reason: "Demonstrates infrastructure-as-code mastery" },
      ],
      requirements: [
        { requirement: "Terraform automation", importance: "critical", evidence: "stated" },
        { requirement: "BGP / Anycast routing", importance: "critical", evidence: "none" },
      ],
    };

    const promptText = buildUser(input);
    assert.ok(promptText.includes("Lead Infrastructure Engineer"));
    assert.ok(promptText.includes("Cloudflare"));
    assert.ok(promptText.includes("multi-region network edge routing"));
    assert.ok(promptText.includes("Alex Doe"));
    assert.ok(promptText.includes("Terraform enterprise module architecture"));
    assert.ok(promptText.includes("No explicit multi-region BGP"));
    assert.ok(promptText.includes("BGP / Anycast routing"));
  });

  it("validates compliant output with suggestions and unaddressable requirements", () => {
    const validOutput = {
      suggestions: [
        {
          targetSection: "Experience > Stripe",
          currentText: "Managed AWS infrastructure with Terraform across teams.",
          proposedRewrite: "Architected modular Terraform configurations provisioning scalable multi-tier AWS environments across 12 engineering teams.",
          requirementAddressed: "Terraform automation for enterprise scale",
        },
        {
          targetSection: "Skills",
          currentText: "AWS, Docker, Linux, CI/CD",
          proposedRewrite: "Infrastructure as Code (Terraform), Cloud Architecture (AWS), Containerization (Docker), CI/CD Automation",
          requirementAddressed: "Surface buried cloud automation skills",
        },
      ],
      unaddressableRequirements: [
        {
          requirement: "Anycast BGP network protocol engineering",
          reason: "CV exclusively reflects application-layer cloud infrastructure on AWS; no telecom or BGP protocol experience is claimed.",
        },
      ],
      summaryAdvice: "Lead with your automated AWS infrastructure projects and emphasize modular Terraform code reuse.",
    };

    const parsed = TailorCvOutputSchema.safeParse(validOutput);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.suggestions.length, 2);
      assert.equal(parsed.data.unaddressableRequirements.length, 1);
      assert.equal(parsed.data.suggestions[0].targetSection, "Experience > Stripe");
    }
  });

  it("rejects output missing required fields", () => {
    const invalidOutput = {
      suggestions: [
        {
          targetSection: "Skills",
          // missing currentText and proposedRewrite
          requirementAddressed: "Some requirement",
        },
      ],
      unaddressableRequirements: [],
    };

    const parsed = TailorCvOutputSchema.safeParse(invalidOutput);
    assert.equal(parsed.success, false);
  });

  it("rejects output with empty suggestions array", () => {
    const emptyOutput = {
      suggestions: [],
      unaddressableRequirements: [],
    };

    const parsed = TailorCvOutputSchema.safeParse(emptyOutput);
    assert.equal(parsed.success, false);
  });

  it("calculates cost accurately for tailoring calls", () => {
    const costGemini = calculateCostUsd({
      model: "gemini-2.5-flash",
      inputTokens: 3500,
      outputTokens: 800,
    });
    // Rates live in lib/ai/client.ts. Gemini 2.5 Flash: $0.30 / $2.50.
    // input:  3500 * 0.30 / 1M = 0.00105
    // output:  800 * 2.50 / 1M = 0.00200
    // total: 0.00305
    assert.equal(costGemini, 0.00305);

    const costClaude = calculateCostUsd({
      model: "claude-sonnet-5",
      inputTokens: 3500,
      outputTokens: 800,
    });
    // input: 3500 * 2.0 / 1M = 0.0070
    // output: 800 * 10.0 / 1M = 0.0080
    // total: 0.0150
    assert.equal(costClaude, 0.015);
  });
});
