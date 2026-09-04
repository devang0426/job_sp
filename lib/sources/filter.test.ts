import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preFilter, matchesRoleTitle, type FilterParams } from "./filter";
import type { NormalizedJob } from "./types";

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "GREENHOUSE",
    sourceId: "test-1",
    title: "Software Engineer",
    company: "TestCorp",
    companyDomain: null,
    location: "Bengaluru, India",
    countryCode: "IN",
    isRemote: false,
    employmentType: "Full-time",
    seniority: null,
    descriptionText: "We are looking for a skilled software engineer with React and TypeScript experience.",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/jobs/1",
    postedAt: new Date(),
    raw: {},
    ...overrides,
  };
}

function makeParams(overrides: Partial<FilterParams> = {}): FilterParams {
  return {
    roleTitles: [],
    keywords: [],
    excludeKeywords: [],
    excludedCompanies: [],
    remoteOnly: false,
    minSalary: null,
    salaryCurrency: null,
    freshnessWindowDays: 30,
    ...overrides,
  };
}

describe("preFilter", () => {
  it("passes all jobs when no filters are set", () => {
    const jobs = [makeJob(), makeJob({ sourceId: "test-2" })];
    const result = preFilter(jobs, makeParams());
    assert.equal(result.passed.length, 2);
    assert.equal(result.filtered, 0);
  });

  it("drops jobs matching excludeKeywords in title", () => {
    const jobs = [
      makeJob({ title: "Senior Intern Manager" }),
      makeJob({ sourceId: "test-2", title: "Software Engineer" }),
    ];
    const result = preFilter(jobs, makeParams({ excludeKeywords: ["intern"] }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].sourceId, "test-2");
  });

  it("drops jobs matching excludeKeywords in description", () => {
    const jobs = [
      makeJob({ descriptionText: "This is a PHP developer role for WordPress." }),
      makeJob({ sourceId: "test-2", descriptionText: "TypeScript and React position." }),
    ];
    const result = preFilter(jobs, makeParams({ excludeKeywords: ["wordpress"] }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
  });

  it("drops jobs matching excludedCompanies", () => {
    const jobs = [
      makeJob({ company: "BadCorp" }),
      makeJob({ sourceId: "test-2", company: "GoodCorp" }),
    ];
    const result = preFilter(jobs, makeParams({ excludedCompanies: ["badcorp"] }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].company, "GoodCorp");
  });

  it("drops jobs whose title matches no target role", () => {
    const jobs = [
      makeJob({ sourceId: "a", title: "Full Stack Engineer" }),
      makeJob({ sourceId: "b", title: "Senior Full-Stack Developer" }),
      makeJob({ sourceId: "c", title: "Backend Engineer", descriptionText: "We use React on the frontend team" }),
      makeJob({ sourceId: "d", title: "Data Scientist" }),
    ];
    const result = preFilter(jobs, makeParams({ roleTitles: ["Full stack engineer"] }));
    assert.deepEqual(result.passed.map((j) => j.sourceId).sort(), ["a", "b"]);
    assert.equal(result.filtered, 2);
  });

  it("matchesRoleTitle handles phrase, punctuation and token variants", () => {
    assert.equal(matchesRoleTitle("Fullstack Developer", ["Full stack engineer"]), true);
    assert.equal(matchesRoleTitle("Senior Frontend Engineer", ["Frontend Engineer"]), true);
    assert.equal(matchesRoleTitle("Staff Backend Engineer", ["Frontend engineer"]), false);
    assert.equal(matchesRoleTitle("Product Manager", ["Full stack engineer"]), false);
    assert.equal(matchesRoleTitle("anything", []), true);
  });

  it("drops jobs matching no keyword when keywords are set", () => {
    const jobs = [
      makeJob({ title: "Frontend Developer", descriptionText: "React and CSS work" }),
      makeJob({ sourceId: "test-2", title: "Backend Developer", descriptionText: "Python and Django" }),
    ];
    const result = preFilter(jobs, makeParams({ keywords: ["react"] }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].sourceId, "test-1");
  });

  it("passes all jobs when no keywords are set", () => {
    const jobs = [makeJob(), makeJob({ sourceId: "test-2" })];
    const result = preFilter(jobs, makeParams({ keywords: [] }));
    assert.equal(result.passed.length, 2);
    assert.equal(result.filtered, 0);
  });

  it("drops postings older than freshness window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 45);
    const fresh = new Date();
    fresh.setDate(fresh.getDate() - 5);

    const jobs = [
      makeJob({ postedAt: old }),
      makeJob({ sourceId: "test-2", postedAt: fresh }),
    ];
    const result = preFilter(jobs, makeParams({ freshnessWindowDays: 30 }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].sourceId, "test-2");
  });

  it("passes jobs with null postedAt (unknown freshness)", () => {
    const jobs = [makeJob({ postedAt: null })];
    const result = preFilter(jobs, makeParams({ freshnessWindowDays: 30 }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 0);
  });

  it("drops non-remote jobs when remoteOnly is set", () => {
    const jobs = [
      makeJob({ isRemote: false }),
      makeJob({ sourceId: "test-2", isRemote: true }),
    ];
    const result = preFilter(jobs, makeParams({ remoteOnly: true }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].sourceId, "test-2");
  });

  it("drops below minSalary when both floor and posting salary are known", () => {
    const jobs = [
      makeJob({ salaryMax: 500000, salaryCurrency: "INR" }),
      makeJob({ sourceId: "test-2", salaryMax: 1500000, salaryCurrency: "INR" }),
    ];
    const result = preFilter(jobs, makeParams({
      minSalary: 1000000,
      salaryCurrency: "INR",
    }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 1);
    assert.equal(result.passed[0].sourceId, "test-2");
  });

  it("NEVER drops for unknown salary — the critical case", () => {
    const jobs = [
      makeJob({ salaryMin: null, salaryMax: null, salaryCurrency: null }),
    ];
    const result = preFilter(jobs, makeParams({
      minSalary: 1000000,
      salaryCurrency: "INR",
    }));
    assert.equal(result.passed.length, 1, "Jobs with unknown salary must never be dropped");
    assert.equal(result.filtered, 0);
  });

  it("passes when salary currency does not match (can't compare)", () => {
    const jobs = [
      makeJob({ salaryMax: 5000, salaryCurrency: "USD" }),
    ];
    const result = preFilter(jobs, makeParams({
      minSalary: 1000000,
      salaryCurrency: "INR",
    }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.filtered, 0);
  });

  it("applies multiple filters together", () => {
    const jobs = [
      makeJob({ sourceId: "a", title: "Intern", isRemote: true }),                    // exclude keyword
      makeJob({ sourceId: "b", company: "BadCorp", isRemote: true }),                  // excluded company
      makeJob({ sourceId: "c", isRemote: false }),                                     // not remote
      makeJob({ sourceId: "d", isRemote: true, descriptionText: "Python and Django" }), // no keyword match
      makeJob({ sourceId: "e", isRemote: true, descriptionText: "React developer" }),  // passes all
    ];
    const result = preFilter(jobs, makeParams({
      keywords: ["react"],
      excludeKeywords: ["intern"],
      excludedCompanies: ["badcorp"],
      remoteOnly: true,
    }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.passed[0].sourceId, "e");
    assert.equal(result.filtered, 4);
  });

  it("counts filtered correctly", () => {
    const jobs = Array.from({ length: 10 }, (_, i) =>
      makeJob({ sourceId: `test-${i}`, company: i < 6 ? "DropMe" : "KeepMe" }),
    );
    const result = preFilter(jobs, makeParams({ excludedCompanies: ["dropme"] }));
    assert.equal(result.passed.length, 4);
    assert.equal(result.filtered, 6);
  });

  it("drops only confidently-senior roles when seniority is INTERN", () => {
    // The pre-filter removes postings that point the opposite way (explicit
    // senior/staff titles). A plain "Frontend Developer" is left for the
    // match evaluation to judge — a title-keyword guess here would drop
    // nearly every real posting before the model ever sees it.
    const jobs = [
      makeJob({ sourceId: "1", title: "Senior Full Stack Engineer", descriptionText: "Lead our backend architecture" }),
      makeJob({ sourceId: "2", title: "Staff Software Engineer", descriptionText: "Mentor engineers" }),
      makeJob({ sourceId: "3", title: "Software Engineering Intern", descriptionText: "Summer internship program for students" }),
      makeJob({ sourceId: "4", title: "Frontend Developer", descriptionText: "Regular full time position" }),
    ];
    const result = preFilter(jobs, makeParams({ seniority: "INTERN" }));
    assert.deepEqual(result.passed.map((j) => j.sourceId).sort(), ["3", "4"]);
    assert.equal(result.filtered, 2);
  });

  it("filters out intern roles when seniority is SENIOR", () => {
    const jobs = [
      makeJob({ sourceId: "1", title: "Senior Full Stack Engineer", descriptionText: "Lead engineering" }),
      makeJob({ sourceId: "2", title: "Software Engineering Intern", descriptionText: "Summer internship" }),
    ];
    const result = preFilter(jobs, makeParams({ seniority: "SENIOR" }));
    assert.equal(result.passed.length, 1);
    assert.equal(result.passed[0].sourceId, "1");
    assert.equal(result.filtered, 1);
  });
});

