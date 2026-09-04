import { test } from "node:test";
import assert from "node:assert/strict";
import { filledSegments, computeMatchScore } from "./score";

test("score: filledSegments boundary test cases", () => {
  assert.equal(filledSegments(0), 0);
  assert.equal(filledSegments(1), 1);
  assert.equal(filledSegments(4), 1);
  assert.equal(filledSegments(5), 1);
  assert.equal(filledSegments(50), 5);
  assert.equal(filledSegments(51), 5);
  assert.equal(filledSegments(55), 6);
  assert.equal(filledSegments(88), 9);
  assert.equal(filledSegments(100), 10);
});

test("score: boundary 75 (APPLY) vs 74 (CONSIDER)", () => {
  // 75 across all dimensions gives exactly 75
  const applyResult = computeMatchScore({
    dimensions: {
      roleFit: { score: 75 },
      skillsMatch: { score: 75 },
      experienceDepth: { score: 75 },
      domainContext: { score: 75 },
      logistics: { score: 75 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
      { importance: "important", evidence: "stated" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(applyResult.score, 75);
  assert.equal(applyResult.recommendation, "APPLY");
  assert.equal(applyResult.scoreCapApplied, null);

  // 74 across all dimensions gives exactly 74
  const considerResult = computeMatchScore({
    dimensions: {
      roleFit: { score: 74 },
      skillsMatch: { score: 74 },
      experienceDepth: { score: 74 },
      domainContext: { score: 74 },
      logistics: { score: 74 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
      { importance: "important", evidence: "stated" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(considerResult.score, 74);
  assert.equal(considerResult.recommendation, "CONSIDER");
  assert.equal(considerResult.scoreCapApplied, null);
});

test("score: boundary 50 (CONSIDER) vs 49 (SKIP)", () => {
  // 50 across all dimensions gives exactly 50
  const considerResult = computeMatchScore({
    dimensions: {
      roleFit: { score: 50 },
      skillsMatch: { score: 50 },
      experienceDepth: { score: 50 },
      domainContext: { score: 50 },
      logistics: { score: 50 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "likely_legitimate" },
  });

  assert.equal(considerResult.score, 50);
  assert.equal(considerResult.recommendation, "CONSIDER");
  assert.equal(considerResult.scoreCapApplied, null);

  // 49 across all dimensions gives exactly 49
  const skipResult = computeMatchScore({
    dimensions: {
      roleFit: { score: 49 },
      skillsMatch: { score: 49 },
      experienceDepth: { score: 49 },
      domainContext: { score: 49 },
      logistics: { score: 49 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "likely_legitimate" },
  });

  assert.equal(skipResult.score, 49);
  assert.equal(skipResult.recommendation, "SKIP");
  assert.equal(skipResult.scoreCapApplied, null);
});

test("score: one critical gap caps score at 59 (critical_gap_x1)", () => {
  // Raw score is 90
  const result = computeMatchScore({
    dimensions: {
      roleFit: { score: 90 },
      skillsMatch: { score: 90 },
      experienceDepth: { score: 90 },
      domainContext: { score: 90 },
      logistics: { score: 90 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
      { importance: "critical", evidence: "inferred" }, // 1 critical gap!
      { importance: "important", evidence: "none" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(result.rawScore, 90);
  assert.equal(result.criticalGaps, 1);
  assert.equal(result.score, 59);
  assert.equal(result.scoreCapApplied, "critical_gap_x1");
  assert.equal(result.recommendation, "CONSIDER");
});

test("score: two critical gaps cap score at 39 (critical_gap_x2)", () => {
  // Raw score is 90
  const result = computeMatchScore({
    dimensions: {
      roleFit: { score: 90 },
      skillsMatch: { score: 90 },
      experienceDepth: { score: 90 },
      domainContext: { score: 90 },
      logistics: { score: 90 },
    },
    requirements: [
      { importance: "critical", evidence: "none" },     // 1st critical gap
      { importance: "critical", evidence: "inferred" }, // 2nd critical gap
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(result.rawScore, 90);
  assert.equal(result.criticalGaps, 2);
  assert.equal(result.score, 39);
  assert.equal(result.scoreCapApplied, "critical_gap_x2");
  assert.equal(result.recommendation, "SKIP");
});

test("score: logistics at 30 vs 29 boundary", () => {
  // Logistics at 30: floor is NOT triggered (condition is score < 30)
  // roleFit 90 (27), skillsMatch 90 (27), experienceDepth 90 (18), domainContext 90 (9), logistics 30 (3) = 84
  const resultAt30 = computeMatchScore({
    dimensions: {
      roleFit: { score: 90 },
      skillsMatch: { score: 90 },
      experienceDepth: { score: 90 },
      domainContext: { score: 90 },
      logistics: { score: 30 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(resultAt30.score, 84);
  assert.equal(resultAt30.scoreCapApplied, null);
  assert.equal(resultAt30.recommendation, "APPLY");

  // Logistics at 29: floor IS triggered (< 30), score is capped at 49
  // Raw score is 90*0.9 + 29*0.1 = 81 + 2.9 = 83.9 -> 84
  const resultAt29 = computeMatchScore({
    dimensions: {
      roleFit: { score: 90 },
      skillsMatch: { score: 90 },
      experienceDepth: { score: 90 },
      domainContext: { score: 90 },
      logistics: { score: 29 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(resultAt29.rawScore, 84);
  assert.equal(resultAt29.score, 49);
  assert.equal(resultAt29.scoreCapApplied, "logistics");
  assert.equal(resultAt29.recommendation, "SKIP");
});

test("score: suspicious legitimacy overrides a score of 90", () => {
  const result = computeMatchScore({
    dimensions: {
      roleFit: { score: 90 },
      skillsMatch: { score: 90 },
      experienceDepth: { score: 90 },
      domainContext: { score: 90 },
      logistics: { score: 90 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
    ],
    legitimacy: { tier: "suspicious" },
  });

  assert.equal(result.score, 90);
  assert.equal(result.scoreCapApplied, null);
  // Must be SKIP regardless of score
  assert.equal(result.recommendation, "SKIP");
});

test("score: stated and structural evidence satisfy critical requirements", () => {
  const result = computeMatchScore({
    dimensions: {
      roleFit: { score: 85 },
      skillsMatch: { score: 85 },
      experienceDepth: { score: 85 },
      domainContext: { score: 85 },
      logistics: { score: 85 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
      { importance: "critical", evidence: "structural" },
    ],
    legitimacy: { tier: "likely_legitimate" },
  });

  assert.equal(result.criticalGaps, 0);
  assert.equal(result.score, 85);
  assert.equal(result.scoreCapApplied, null);
  assert.equal(result.recommendation, "APPLY");
});

test("score: non-critical gaps do not trigger critical gap caps", () => {
  const result = computeMatchScore({
    dimensions: {
      roleFit: { score: 80 },
      skillsMatch: { score: 80 },
      experienceDepth: { score: 80 },
      domainContext: { score: 80 },
      logistics: { score: 80 },
    },
    requirements: [
      { importance: "critical", evidence: "stated" },
      { importance: "important", evidence: "none" },
      { importance: "nice_to_have", evidence: "none" },
      { importance: "important", evidence: "inferred" },
    ],
    legitimacy: { tier: "verified" },
  });

  assert.equal(result.criticalGaps, 0);
  assert.equal(result.score, 80);
  assert.equal(result.scoreCapApplied, null);
  assert.equal(result.recommendation, "APPLY");
});
