import test from "node:test";
import assert from "node:assert/strict";
import { preferencesSchema } from "./preferences";

test("preferencesSchema applies default values", () => {
  const result = preferencesSchema.parse({});
  assert.deepEqual(result.targetRoles, []);
  assert.deepEqual(result.locations, []);
  assert.equal(result.remoteOnly, false);
  assert.deepEqual(result.sources, [
    "GREENHOUSE",
    "LEVER",
    "ASHBY",
    "SCRAPED",
    "FIRECRAWL",
  ]);
  assert.equal(result.maxJobsPerScan, 40);
  assert.equal(result.autoEvaluate, true);
  assert.equal(result.salaryCurrency, "INR");
  assert.equal(result.autoScanEnabled, false);
  assert.equal(result.autoScanIntervalMinutes, 60);
});

test("preferencesSchema rejects an unsupported auto-scan interval", () => {
  assert.throws(() => preferencesSchema.parse({ autoScanIntervalMinutes: 7 }));
  assert.equal(
    preferencesSchema.parse({ autoScanIntervalMinutes: "15" }).autoScanIntervalMinutes,
    15,
  );
});

test("preferencesSchema clamps maxJobsPerScan to max 60 server-side", () => {
  const resultOver = preferencesSchema.parse({ maxJobsPerScan: 500 });
  assert.equal(resultOver.maxJobsPerScan, 60);

  const resultWayOver = preferencesSchema.parse({ maxJobsPerScan: 100 });
  assert.equal(resultWayOver.maxJobsPerScan, 60);

  const resultExact = preferencesSchema.parse({ maxJobsPerScan: 60 });
  assert.equal(resultExact.maxJobsPerScan, 60);

  const resultUnder = preferencesSchema.parse({ maxJobsPerScan: 25 });
  assert.equal(resultUnder.maxJobsPerScan, 25);
});

test("preferencesSchema parses comma-separated string arrays", () => {
  const result = preferencesSchema.parse({
    targetRoles: "Frontend Engineer, Fullstack Developer",
    locations: "Bengaluru, Remote",
    keywords: "React, TypeScript",
  });
  assert.deepEqual(result.targetRoles, ["Frontend Engineer", "Fullstack Developer"]);
  assert.deepEqual(result.locations, ["Bengaluru", "Remote"]);
  assert.deepEqual(result.keywords, ["React", "TypeScript"]);
});

test("preferencesSchema handles numeric salary preprocessing", () => {
  const result = preferencesSchema.parse({ minSalary: "1500000" });
  assert.equal(result.minSalary, 1500000);

  const emptyResult = preferencesSchema.parse({ minSalary: "" });
  assert.equal(emptyResult.minSalary, null);
});
