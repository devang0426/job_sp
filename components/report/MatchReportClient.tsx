"use client";

import React, { useState } from "react";
import { VerdictRail } from "@/components/report/VerdictRail";
import { RequirementMap } from "@/components/report/RequirementMap";
import { StrengthList } from "@/components/report/StrengthList";
import { GapList } from "@/components/report/GapList";
import { CvTips } from "@/components/report/CvTips";
import { LegitimacyPanel } from "@/components/report/LegitimacyPanel";
import { ScoreExplainer } from "@/components/report/ScoreExplainer";
import { ProgressState } from "@/components/ui/ProgressState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import {
  asReportList,
  asReportObject,
  type MatchReportResult,
} from "@/lib/db/matches";

export interface MatchReportClientProps {
  initialData: MatchReportResult;
}

export function MatchReportClient({ initialData }: MatchReportClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const { match, job, isStaleCv } = data;

  const handleReevaluate = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setEvalError(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}/evaluate?force=1&wait=1`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setEvalError(errJson?.error?.message || "Failed to trigger evaluation.");
        setIsEvaluating(false);
        return;
      }

      const json = await res.json();
      // If server evaluated directly and returned the completed match
      if (json.data && (json.data.status === "COMPLETE" || json.data.score !== undefined)) {
        setIsEvaluating(false);
        // Refresh full match report view
        const reportRes = await fetch(`/api/matches/${json.data.id || "latest"}?jobId=${job.id}`);
        if (reportRes.ok) {
          const reportJson = await reportRes.json();
          if (reportJson.data) {
            setData(reportJson.data);
          }
        }
        router.refresh();
        return;
      }

      // Fallback: poll if queued asynchronously in background worker
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        try {
          const fetchRes = await fetch(`/api/matches/${match?.id || "latest"}?jobId=${job.id}`);
          if (fetchRes.ok) {
            const pollJson = await fetchRes.json();
            if (pollJson.data?.match?.status === "COMPLETE" || pollJson.data?.match?.status === "FAILED") {
              clearInterval(interval);
              setIsEvaluating(false);
              setData(pollJson.data);
              router.refresh();
            }
          }
        } catch {
          // Keep polling until max attempts
        }

        if (attempts > 30) {
          clearInterval(interval);
          setIsEvaluating(false);
          router.refresh();
        }
      }, 2000);
    } catch {
      setEvalError("Network error triggering evaluation.");
      setIsEvaluating(false);
    }
  };

  const isPending = match?.status === "PENDING" || match?.status === "RUNNING" || isEvaluating;
  const isFailed = match?.status === "FAILED";
  const isComplete = match?.status === "COMPLETE";

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header / Back breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white select-none shadow-xs">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Feed
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">MATCH REPORT</span>
          <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {job.source} #{job.sourceId}
          </span>
        </div>
      </div>

      {/* Main Split Layout: Sticky Verdict Rail on Left, Scrolling Blocks on Right */}
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1600px] mx-auto">
        {/* Left: Sticky Verdict Rail */}
        {match ? (
          <VerdictRail
            match={match}
            job={job}
            isStaleCv={isStaleCv}
            onReevaluate={handleReevaluate}
            isReevaluating={isEvaluating}
          />
        ) : (
          <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COMPANY</span>
              <h2 className="text-lg font-bold text-slate-900">{job.company}</h2>
              <p className="text-sm text-slate-600 font-medium">{job.title}</p>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div>LOCATION: <span className="text-slate-900 font-semibold">{job.location || (job.isRemote ? "Remote" : "N/A")}</span></div>
              <div>SOURCE: <span className="text-slate-900 font-semibold">{job.source}</span></div>
              {job.salaryMin && (
                <div>
                  SALARY: <span className="text-slate-900 font-semibold">{job.salaryCurrency} {job.salaryMin.toLocaleString()} - {job.salaryMax?.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="accent"
                size="md"
                onClick={handleReevaluate}
                disabled={isEvaluating}
                className="w-full gap-2 justify-center"
              >
                <RefreshCw className={`h-4 w-4 ${isEvaluating ? "animate-spin" : ""}`} />
                <span>{isEvaluating ? "Evaluating..." : "Evaluate with AI"}</span>
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Open application page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </aside>
        )}

        {/* Right: Scrolling Pane */}
        <main className="flex-1 p-6 lg:p-10 flex flex-col gap-10 min-w-0 max-w-4xl">
          {/* STATE 0: NOT EVALUATED YET */}
          {!match && !isPending && !isFailed && (
            <div className="flex flex-col gap-6">
              <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">UN-EVALUATED POSTING</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">READY TO SCORE</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This job has not been evaluated against your active CV yet. Click below to run AI scoring across role fit, skills match, experience depth, domain context, and legitimacy.
                </p>
                <div>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={handleReevaluate}
                    disabled={isEvaluating}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isEvaluating ? "animate-spin" : ""}`} />
                    <span>{isEvaluating ? "Evaluating with AI..." : "Run AI Match Evaluation"}</span>
                  </Button>
                </div>
              </div>

              {/* Job Description */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">JOB DESCRIPTION</span>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    View Original <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  {job.descriptionText || "No job description text available."}
                </div>
              </section>
            </div>
          )}

          {/* STATE 1: PENDING / RUNNING */}
          {isPending && (
            <div className="flex flex-col gap-4 p-8 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EVALUATION IN PROGRESS</span>
                <span className="text-xs font-bold text-blue-600 animate-pulse">RUNNING</span>
              </div>
              <ProgressState
                status="RUNNING"
                isPending={true}
                isFailed={false}
                isCompleted={false}
                label="Analyzing candidate CV against role requirements using AI evaluation engine..."
              />
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                Evaluating role fit, skills match, experience depth, domain context,
                and legitimacy signals. Blocks will appear once scoring is complete.
              </p>
            </div>
          )}

          {/* STATE 2: FAILED */}
          {isFailed && (
            <div className="flex flex-col gap-4 p-6 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-rose-900">
                  Evaluation Failed
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {match.failureReason || evalError || "An unexpected error occurred during match evaluation."}
              </p>
              <div className="pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReevaluate}
                  disabled={isEvaluating}
                  className="gap-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
                  <span>{isEvaluating ? "Retrying..." : "Retry evaluation"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* STATE 3: COMPLETE — The 7 Report Blocks */}
          {isComplete && (
            <>
              {/* Block 1: Role Summary */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. ROLE SUMMARY</span>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    View posting <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {match.summary || job.descriptionText.slice(0, 400) + "..."}
                  </p>
                </div>
              </section>

              {/* Block 2: Requirement → Evidence Map (The heart of the report) */}
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. REQUIREMENT → EVIDENCE MAP</span>
                </div>
                <RequirementMap requirements={asReportList(match.requirements)} />
              </section>

              {/* Block 3: Strengths */}
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. STRENGTHS</span>
                </div>
                <StrengthList strengths={asReportList(match.strengths)} />
              </section>

              {/* Block 4: Gaps */}
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">4. GAPS</span>
                </div>
                <GapList gaps={asReportList(match.gaps)} />
              </section>

              {/* Block 5: CV Improvement Tips */}
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">5. CV IMPROVEMENT TIPS</span>
                </div>
                <CvTips
                  cvTips={asReportList(match.cvTips)}
                  matchId={match.id}
                  jobId={job.id}
                />
              </section>

              {/* Block 6: Legitimacy Screen */}
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">6. LEGITIMACY SCREEN</span>
                </div>
                <LegitimacyPanel
                  legitimacyTier={match.legitimacyTier}
                  signals={asReportList(match.legitimacySignals) ?? asReportObject(match.legitimacySignals)}
                />
              </section>

              {/* Block 7: Verdict & Score Explainer */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">7. VERDICT & SCORE EXPLAINER</span>
                </div>

                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">REASONING & RECOMMENDATION</span>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    Based on the 5 evaluated dimensions and qualification requirements,
                    the candidate profile aligns at <span className="font-bold font-mono text-blue-600">{match.score}/100</span> with
                    verdict <span className="font-bold font-mono text-slate-900">[{match.recommendation}]</span>.
                  </p>
                </div>

                {/* The Score Explainer: proves how number was computed */}
                <ScoreExplainer
                  score={match.score ?? 0}
                  dimRoleFit={match.dimRoleFit}
                  dimSkillsMatch={match.dimSkillsMatch}
                  dimExperienceDepth={match.dimExperienceDepth}
                  dimDomainContext={match.dimDomainContext}
                  dimLogistics={match.dimLogistics}
                  scoreCapApplied={match.scoreCapApplied}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
