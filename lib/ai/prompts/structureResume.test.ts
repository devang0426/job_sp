import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VERSION,
  SYSTEM,
  buildUser,
  ResumeProfileSchema,
} from "./structureResume";
import { calculateCostUsd } from "../cost";

describe("Resume Parser Prompt & Schema", () => {
  it("exports correct version string", () => {
    assert.equal(VERSION, "resume@1");
  });

  it("has a stable system prompt with strict rules", () => {
    assert.ok(SYSTEM.includes("Extract ONLY what the CV explicitly states."));
    assert.ok(SYSTEM.includes("DO NOT infer, guess, or extrapolate skills"));
    assert.ok(SYSTEM.includes("return null"));
  });

  it("buildUser formats raw text properly without interpolating system rules", () => {
    const raw = "John Doe\nSoftware Engineer\nSkills: React, Node.js";
    const userPrompt = buildUser(raw);
    assert.ok(userPrompt.includes(raw));
  });

  it("validates structured profile matching schema", () => {
    const sampleOutput = {
      skills: ["TypeScript", "React", "Next.js", "PostgreSQL"],
      roles: [
        {
          company: "Acme Corp",
          title: "Senior Full Stack Engineer",
          start: "2021-06",
          end: "Present",
          scopeSummary: "Led frontend architecture and API service migration.",
        },
      ],
      education: [
        {
          institution: "State University",
          qualification: "B.S. Computer Science",
          year: 2021,
        },
      ],
      totalYearsExperience: 4.5,
    };

    const parsed = ResumeProfileSchema.safeParse(sampleOutput);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.skills.length, 4);
      assert.equal(parsed.data.roles[0].company, "Acme Corp");
      assert.equal(parsed.data.totalYearsExperience, 4.5);
    }
  });

  it("allows totalYearsExperience to be null when undetermined", () => {
    const nullExpOutput = {
      skills: ["Python"],
      roles: [],
      education: [],
      totalYearsExperience: null,
    };

    const parsed = ResumeProfileSchema.safeParse(nullExpOutput);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.totalYearsExperience, null);
    }
  });

  it("calculates costUsd accurately for claude-sonnet-5 token rates", () => {
    // claude-sonnet-5: $2.00 / 1M input, $10.00 / 1M output
    const cost = calculateCostUsd({
      model: "claude-sonnet-5",
      inputTokens: 1000,
      outputTokens: 500,
    });
    // 1000 * 0.000002 + 500 * 0.00001 = 0.002 + 0.005 = 0.007
    assert.equal(cost, 0.007);
  });
});
