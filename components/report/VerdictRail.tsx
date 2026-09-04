"use client";

import React, { useState } from "react";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { StatusChip } from "@/components/ui/StatusChip";
import { DimensionBars } from "./DimensionBars";
import { ExternalLink, Bookmark, Check, RefreshCw, AlertCircle, Wand2 } from "lucide-react";
import Link from "next/link";
import type { Job } from "@prisma/client";
import type {
  MatchReportApplication,
  MatchReportMatch,
} from "@/lib/db/matches";

export interface VerdictRailProps {
  match: MatchReportMatch & { application?: MatchReportApplication | null };
  job: Job;
  isStaleCv?: boolean;
  onReevaluate?: () => void;
  isReevaluating?: boolean;
}

export function VerdictRail({
  match,
  job,
  isStaleCv = false,
  onReevaluate,
  isReevaluating = false,
}: VerdictRailProps) {
  const [isSaved, setIsSaved] = useState(Boolean(match.application));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const score: number = typeof match.score === "number" ? match.score : 0;
  const recommendation = match.recommendation || (score >= 75 ? "APPLY" : score >= 50 ? "CONSIDER" : "SKIP");
  const legitimacyTier = match.legitimacyTier || "UNVERIFIED";

  const handleSaveToTracker = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (res.ok) {
        setIsSaved(true);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveError(errJson?.error?.message || "Failed to save to tracker.");
      }
    } catch {
      setSaveError("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const getLegitimacyTone = (tier: string): "success" | "consider" | "neutral" | "error" => {
    const t = tier.toLowerCase();
    if (t === "verified") return "success";
    if (t === "likely_legitimate") return "neutral";
    if (t === "unverified") return "consider";
    return "error";
  };

  const getVerdictTone = (rec: string): "apply" | "consider" | "skip" => {
    const r = rec.toLowerCase();
    if (r === "apply") return "apply";
    if (r === "consider") return "consider";
    return "skip";
  };

  return (
    <aside className="w-full lg:w-[340px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 flex flex-col gap-6 lg:sticky lg:top-[49px] lg:h-[calc(100vh-49px)] lg:overflow-y-auto">
      {/* Header Info */}
      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-5">
        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{job.company}</span>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">
          {job.title}
        </h2>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
          <span>{job.location || (job.isRemote ? "Remote" : "Location unspecified")}</span>
          {job.isRemote && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
              Remote
            </span>
          )}
        </div>
      </div>

      {/* Primary Score & Signature Meter */}
      <div className="flex flex-col gap-4 bg-slate-50/80 p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Match Verdict</span>
          <StatusChip tone={getVerdictTone(recommendation)}>
            {recommendation}
          </StatusChip>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {score}
            <span className="text-xs text-slate-400 font-normal ml-1">/ 100</span>
          </div>
          <ScoreMeter
            score={score}
            recommendation={recommendation}
            scale="lg"
            matchId={match.id}
          />
        </div>

        {/* Legitimacy Chip */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Legitimacy:</span>
          <StatusChip tone={getLegitimacyTone(legitimacyTier)}>
            {legitimacyTier.replace("_", " ")}
          </StatusChip>
        </div>
      </div>

      {/* Stale CV Warning & Re-evaluate Action */}
      {isStaleCv && (
        <div className="flex flex-col gap-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 text-amber-800 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Evaluated against an older CV</span>
          </div>
          {onReevaluate && (
            <button
              type="button"
              onClick={onReevaluate}
              disabled={isReevaluating}
              className="inline-flex items-center justify-center gap-1.5 min-h-[34px] px-3 text-xs font-semibold rounded-md border border-amber-300 hover:bg-amber-100 bg-white text-amber-900 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isReevaluating ? "animate-spin" : ""}`} />
              <span>{isReevaluating ? "Re-evaluating..." : "Re-evaluate with active CV"}</span>
            </button>
          )}
        </div>
      )}

      {/* Five Dimension Bars */}
      <div className="flex flex-col gap-4 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dimensions</span>
          <span className="text-[10.5px] font-mono text-slate-400">WEIGHTS</span>
        </div>

        <DimensionBars match={match} />
      </div>

      {/* CTAs / Actions */}
      <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-5 mt-auto">
        {/* Outbound Apply Link */}
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 text-xs font-bold uppercase tracking-wider rounded-lg bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99] transition-all shadow-sm cursor-pointer"
        >
          <span>Apply to role</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* Tailor CV Studio Link */}
        <Link
          href={`/matches/${match.id}/tailor`}
          className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 text-xs font-bold uppercase tracking-wider rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-2xs"
        >
          <Wand2 className="h-3.5 w-3.5 text-blue-600" />
          <span>Tailor CV for role</span>
        </Link>

        {/* Save to Tracker Action */}
        <button
          type="button"
          onClick={handleSaveToTracker}
          disabled={isSaved || isSaving}
          className={`inline-flex items-center justify-center gap-2 min-h-[40px] px-4 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-all cursor-pointer shadow-2xs ${
            isSaved
              ? "bg-slate-50 border-slate-200 text-slate-600 cursor-default"
              : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 active:bg-slate-100"
          }`}
        >
          {isSaved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Saved to tracker</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5 text-slate-500" />
              <span>{isSaving ? "Saving..." : "Save to tracker"}</span>
            </>
          )}
        </button>

        {saveError && (
          <p className="text-xs text-rose-600 font-medium">{saveError}</p>
        )}

        {/* Re-evaluate Button when not stale */}
        {!isStaleCv && onReevaluate && (
          <button
            type="button"
            onClick={onReevaluate}
            disabled={isReevaluating}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 text-xs text-slate-500 hover:text-slate-800 uppercase font-semibold tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isReevaluating ? "animate-spin" : ""}`} />
            <span>{isReevaluating ? "Evaluating..." : "Re-evaluate"}</span>
          </button>
        )}
      </div>
    </aside>
  );
}

