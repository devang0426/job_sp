/**
 * End-to-end verification harness.
 *
 * Exercises every shipped feature against the real running system — Neon DB,
 * live source APIs, the real AI provider, real trigger.dev tasks — and prints
 * a pass/fail line per feature. "Marked done" must mean "passes here".
 *
 *   npx tsx --env-file=.env.local scripts/verify-e2e.mjs
 *   npx tsx --env-file=.env.local scripts/verify-e2e.mjs --with-ai   (also runs paid model calls)
 *   npx tsx --env-file=.env.local scripts/verify-e2e.mjs --with-trigger (also fires real trigger.dev runs)
 */
import { PrismaClient } from "@prisma/client";

const WITH_AI = process.argv.includes("--with-ai");
const WITH_TRIGGER = process.argv.includes("--with-trigger");
const prisma = new PrismaClient();

const results = [];
async function check(feature, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ feature, ok: true, detail: detail ?? "ok", ms: Date.now() - started });
    console.log(`  PASS  ${feature}  — ${detail ?? "ok"}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ feature, ok: false, detail: msg, ms: Date.now() - started });
    console.log(`  FAIL  ${feature}  — ${msg}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log(`\nE2E verification  (AI: ${WITH_AI ? "on" : "off"}, trigger: ${WITH_TRIGGER ? "on" : "off"})\n`);

// ── 01 foundation ────────────────────────────────────────────
await check("01 foundation — DB + health", async () => {
  const [{ one }] = await prisma.$queryRaw`SELECT 1 as one`;
  assert(Number(one) === 1, "SELECT 1 failed");
  const res = await fetch("http://localhost:3000/api/health").catch(() => null);
  assert(res && res.ok, "GET /api/health not 200 (is `npm run dev` up?)");
  const body = await res.json();
  return `health ${res.status}, dbLatency ${body.data?.dbLatencyMs}ms`;
});

// ── 04 schema + dedupe ───────────────────────────────────────
await check("04 schema — dedupe key", async () => {
  const { generateDedupeKey } = await import("../lib/sources/dedupe.ts");
  const a = generateDedupeKey({ company: "Acme", title: "SWE", location: "NY", isRemote: false });
  const b = generateDedupeKey({ company: "  acme ", title: "swe", location: "ny", isRemote: false });
  assert(a === b, "dedupe not normalizing");
  return `stable key ${a.slice(0, 12)}…`;
});

// ── 05 scoring ───────────────────────────────────────────────
await check("05 scoring — computeMatchScore", async () => {
  const { computeMatchScore } = await import("../lib/evaluation/score.ts");
  const r = computeMatchScore({
    dimensions: {
      roleFit: { score: 80, rationale: "x" }, skillsMatch: { score: 80, rationale: "x" },
      experienceDepth: { score: 80, rationale: "x" }, domainContext: { score: 80, rationale: "x" },
      logistics: { score: 80, rationale: "x" },
    },
    requirements: [], legitimacy: { tier: "likely_legitimate", signals: [] },
  });
  assert(r.score === 80, `expected 80, got ${r.score}`);
  assert(["APPLY", "CONSIDER", "SKIP"].includes(r.recommendation), "bad recommendation");
  return `80 → ${r.score}/${r.recommendation}`;
});

// ── 11 + 12 source adapters (free ATS only) ──────────────────
await check("11 ATS sources — greenhouse/lever/ashby", async () => {
  const { buildAllAdapters } = await import("../lib/sources/index.ts");
  const adapters = buildAllAdapters(["GREENHOUSE", "LEVER", "ASHBY"]);
  assert(adapters.length > 0, "no adapters built");
  const sample = adapters.slice(0, 3);
  let total = 0;
  for (const a of sample) {
    const r = await a.search({ keywords: [], targetRoles: [], locations: [], remoteOnly: false, seniority: null });
    total += r.jobs.length;
  }
  assert(total > 0, "ATS adapters returned zero jobs");
  return `${sample.length} boards → ${total} postings`;
});

// ── 14 scan orchestration ────────────────────────────────────
let scanUserId, scanResumeId;
await check("14 scan orchestration — runScan end to end", async () => {
  const { runScan } = await import("../lib/scan/runScan.ts");
  const { buildQuerySnapshot } = await import("../lib/sources/scanPlan.ts");
  const user = await prisma.user.findFirst({ where: { onboardedAt: { not: null } } });
  assert(user, "no onboarded user");
  scanUserId = user.id;
  scanResumeId = user.activeResumeId;
  const prefs = await prisma.preferences.findFirst({ where: { userId: user.id } });
  assert(prefs, "no preferences");
  // Verify the pipeline itself, not the user's (deliberately narrow) prefs:
  // broad roles, no seniority gate, not remote-only, no salary floor.
  const snap = buildQuerySnapshot(prefs);
  snap.sources = ["GREENHOUSE", "LEVER", "ASHBY"];
  snap.targetRoles = ["Software Engineer", "Full Stack Engineer", "Frontend Engineer", "Backend Engineer"];
  snap.keywords = [];
  snap.seniority = null;
  snap.remoteOnly = false;
  snap.minSalary = null;
  const sr = await prisma.scanRun.create({
    data: { userId: user.id, status: "QUEUED", trigger: "MANUAL", querySnapshot: snap, sourcesUsed: snap.sources },
  });
  let queued = 0;
  const r = await runScan({
    scanRunId: sr.id,
    dispatchEvaluations: async (reqs) => { queued = reqs.length; },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
  await prisma.scanRun.delete({ where: { id: sr.id } }).catch(() => {});
  assert(r.status !== "FAILED", `scan FAILED: ${r.status}`);
  assert(r.jobsFound > 0, "scan ingested zero jobs");
  assert(r.jobsFiltered < r.jobsFound, "pre-filter dropped 100% of postings");
  assert(queued > 0, "scan queued zero evaluations for a broad role search");
  return `${r.status}, found ${r.jobsFound}, ${r.jobsFound - r.jobsFiltered} passed filter, queued ${queued}`;
});

// ── 06 feed ──────────────────────────────────────────────────
await check("06 feed — getFeedJobs", async () => {
  const { getFeedJobs } = await import("../lib/db/jobs.ts");
  const { jobsQuerySchema } = await import("../lib/validation/jobs.ts");
  const params = jobsQuerySchema.parse({});
  const res = await getFeedJobs({ userId: scanUserId, params });
  assert(res.rows.length > 0, "feed returned zero rows");
  const scored = res.rows.filter((r) => r.match?.status === "COMPLETE");
  return `${res.totalCount} rows, ${scored.length} scored on page`;
});

// ── 15 evaluation ────────────────────────────────────────────
await check("15 match evaluation — evaluateJob (real AI)", async () => {
  if (!WITH_AI) return "skipped (pass --with-ai)";
  const { evaluateJob } = await import("../lib/ai/evaluate.ts");
  const job = await prisma.job.findFirst({
    where: { firstSeenInScanRunId: { not: null }, descriptionText: { not: "" }, title: { contains: "Engineer" } },
    orderBy: { lastSeenAt: "desc" },
  });
  assert(job, "no job to evaluate");
  const r = await evaluateJob({ userId: scanUserId, jobId: job.id, resumeId: scanResumeId });
  assert(r.success, `evaluate failed: ${r.error}`);
  const m = r.match;
  assert(m.status === "COMPLETE", `status ${m.status}`);
  assert(m.score > 0 && m.score <= 100, `score ${m.score} out of range`);
  assert(m.dimRoleFit != null && m.dimLogistics != null, "dimensions missing");
  assert(["APPLY", "CONSIDER", "SKIP"].includes(m.recommendation), "no recommendation");
  return `${job.company} → ${m.score}/${m.recommendation} (${m.model})`;
});

// ── 16 match report ──────────────────────────────────────────
await check("16 match report — getMatchByJobId", async () => {
  const { getMatchByJobId } = await import("../lib/db/matches.ts");
  const anyMatch = await prisma.match.findFirst({ where: { userId: scanUserId, status: "COMPLETE" } });
  assert(anyMatch, "no complete match to report on");
  const rep = await getMatchByJobId(anyMatch.jobId, scanUserId);
  assert(rep && rep.match && rep.job, "report shape incomplete");
  assert(rep.job.applyUrl.startsWith("http"), "no apply url");
  assert(!/example\.com|jsearch\.api|adzuna\.in\/details/.test(rep.job.applyUrl), "apply url looks fake");
  return `report for ${rep.job.company}, applyUrl ok`;
});

// ── 17 tracker ───────────────────────────────────────────────
await check("17 tracker — transition writes event (Invariant 5)", async () => {
  const { transition } = await import("../lib/tracker/transition.ts");
  const job = await prisma.job.findFirst({ where: { firstSeenInScanRunId: { not: null } } });
  const app = await prisma.application.upsert({
    where: { userId_jobId: { userId: scanUserId, jobId: job.id } },
    create: { userId: scanUserId, jobId: job.id, status: "EVALUATED" },
    update: {},
  });
  const before = await prisma.applicationEvent.count({ where: { applicationId: app.id } });
  await transition(app.id, scanUserId, "APPLIED", "verify-e2e");
  const after = await prisma.applicationEvent.count({ where: { applicationId: app.id } });
  const fresh = await prisma.application.findUnique({ where: { id: app.id } });
  assert(fresh.status === "APPLIED", "status not updated");
  assert(fresh.statusChangedAt, "statusChangedAt not set");
  assert(after === before + 1, `event not written (${before}→${after})`);
  // cleanup
  await prisma.applicationEvent.deleteMany({ where: { applicationId: app.id } });
  await prisma.application.delete({ where: { id: app.id } });
  return `status→APPLIED, +1 event, statusChangedAt set`;
});

// ── 18 + 19 studio (real AI) ─────────────────────────────────
await check("18 follow-up email — generateFollowUpDraft (real AI)", async () => {
  if (!WITH_AI) return "skipped (pass --with-ai)";
  const { generateFollowUpDraft } = await import("../lib/ai/followUp.ts");
  const m = await prisma.match.findFirst({ where: { userId: scanUserId, status: "COMPLETE" } });
  const app = await prisma.application.upsert({
    where: { userId_jobId: { userId: scanUserId, jobId: m.jobId } },
    create: { userId: scanUserId, jobId: m.jobId, matchId: m.id, status: "APPLIED", appliedAt: new Date(Date.now() - 7 * 864e5) },
    update: { status: "APPLIED", appliedAt: new Date(Date.now() - 7 * 864e5) },
  });
  try {
    const r = await generateFollowUpDraft({ userId: scanUserId, applicationId: app.id });
    assert(r.success, `failed: ${r.error}`);
    assert(r.artifact && r.artifact.kind === "FOLLOW_UP_EMAIL", "no FOLLOW_UP_EMAIL artifact");
    const words = String(r.artifact.content ?? "").split(/\s+/).filter(Boolean).length;
    assert(words > 0 && words <= 170, `word count ${words}`);
    return `artifact ${r.artifact.id.slice(0, 10)}, ${words} words, $${r.artifact.costUsd}`;
  } finally {
    await prisma.artifact.deleteMany({ where: { applicationId: app.id } }).catch(() => {});
  }
});

await check("19 CV tailoring — generateTailoredCv (real AI)", async () => {
  if (!WITH_AI) return "skipped (pass --with-ai)";
  const { generateTailoredCv } = await import("../lib/ai/tailorCv.ts");
  const m = await prisma.match.findFirst({ where: { userId: scanUserId, status: "COMPLETE" } });
  const r = await generateTailoredCv({ userId: scanUserId, matchId: m.id });
  assert(r.success, `failed: ${r.error}`);
  assert(r.artifact && r.artifact.kind === "CV_VARIANT", "no CV_VARIANT artifact");
  assert(Array.isArray(r.suggestions) && r.suggestions.length > 0, "no rewrite suggestions");
  await prisma.artifact.delete({ where: { id: r.artifact.id } }).catch(() => {});
  return `${r.suggestions.length} rewrites, ${r.unaddressableRequirements?.length ?? 0} unaddressable`;
});

// ── 20 counters ──────────────────────────────────────────────
await check("20 polish — status counters", async () => {
  const { getStatusCounters } = await import("../lib/tracker/counters.ts");
  const c = await getStatusCounters(scanUserId);
  assert(typeof c === "object" && c !== null, "counters not an object");
  return JSON.stringify(c);
});

// ── auto-scan sweep ──────────────────────────────────────────
await check("auto-scan — per-user schedule create/delete on toggle", async () => {
  const { syncAutoScanSchedule } = await import("../lib/scan/autoScanSchedule.ts");
  const prefs = await prisma.preferences.findFirst({ where: { userId: scanUserId } });
  const saved = { on: prefs.autoScanEnabled, every: prefs.autoScanIntervalMinutes, id: prefs.autoScanScheduleId };
  if (!WITH_TRIGGER) return "skipped (pass --with-trigger — hits the schedules API)";
  const { schedules } = await import("@trigger.dev/sdk/v3");
  const hasSchedule = async (id) => { if (!id) return false; try { await schedules.retrieve(id); return true; } catch { return false; } };
  try {
    // enable → schedule exists
    const on = await syncAutoScanSchedule(scanUserId, { enabled: true, intervalMinutes: 60, existingScheduleId: saved.id });
    assert(on.scheduleId, "enable did not return a schedule id");
    assert(await hasSchedule(on.scheduleId), "schedule not found after enable");
    // disable → schedule gone
    const off = await syncAutoScanSchedule(scanUserId, { enabled: false, intervalMinutes: 60, existingScheduleId: on.scheduleId });
    assert(off.scheduleId === null, "disable did not clear the id");
    assert(!(await hasSchedule(on.scheduleId)), "schedule still exists after disable");
    return `created ${on.scheduleId.slice(0, 12)}… then deleted`;
  } finally {
    await syncAutoScanSchedule(scanUserId, { enabled: saved.on, intervalMinutes: saved.every, existingScheduleId: null }).catch(() => {});
    await prisma.preferences.update({ where: { userId: scanUserId }, data: { autoScanEnabled: saved.on, autoScanIntervalMinutes: saved.every, autoScanScheduleId: saved.id } }).catch(() => {});
  }
});

// ── 07 + 14/15 wiring — the trigger.dev worker is actually processing ──
// A standalone script's tasks.trigger() lands as PENDING_VERSION in dev
// (no deployed version, and the dev-session handshake belongs to the CLI /
// the Next app). So instead of triggering noop, confirm the worker is live
// by checking that recent runs it owns actually completed.
await check("07/14/15 trigger.dev — worker is processing runs", async () => {
  if (!WITH_TRIGGER) return "skipped (pass --with-trigger)";
  const { runs } = await import("@trigger.dev/sdk/v3");
  const seen = { total: 0, completed: 0, byTask: {} };
  const cutoff = Date.now() - 6 * 60 * 60 * 1000; // last 6h
  for await (const r of runs.list({ limit: 50 })) {
    if (r.createdAt.getTime() < cutoff) break;
    seen.total++;
    seen.byTask[r.taskIdentifier] ??= { ok: 0, bad: 0 };
    if (r.status === "COMPLETED") { seen.completed++; seen.byTask[r.taskIdentifier].ok++; }
    else if (["FAILED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT"].includes(r.status)) seen.byTask[r.taskIdentifier].bad++;
  }
  assert(seen.completed > 0, "no trigger.dev run completed in the last 6h — worker not processing");
  const tasks = Object.entries(seen.byTask).map(([t, c]) => `${t}:${c.ok}✓${c.bad ? "/" + c.bad + "✗" : ""}`).join("  ");
  return tasks;
});

// ── summary ──────────────────────────────────────────────────
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail) {
  console.log("FAILURES:");
  for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.feature}: ${r.detail}`);
}
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
