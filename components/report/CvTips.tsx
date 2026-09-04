import React from "react";
import { Sparkles, ArrowRight, Wand2 } from "lucide-react";
import Link from "next/link";

export interface CvTipItem {
  targetSection?: string;
  change?: string;
  reason?: string;
}

export interface CvTipsProps {
  cvTips?: (CvTipItem | string)[] | null;
  matchId?: string;
  jobId?: string;
}

export function CvTips({ cvTips, matchId, jobId }: CvTipsProps) {
  const tailorUrl = matchId
    ? `/matches/${matchId}/tailor`
    : jobId
    ? `/feed/${jobId}/tailor`
    : null;

  if (!cvTips || cvTips.length === 0) {
    return (
      <div className="p-4 bg-bg-surface border border-border-default text-text-muted text-data font-mono flex flex-col gap-3 shadow-2xs">
        <span>No specific CV modifications suggested for this posting.</span>
        {tailorUrl && (
          <div>
            <Link
              href={tailorUrl}
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-text-primary underline hover:text-accent-muted transition-colors font-semibold"
            >
              <Wand2 className="w-3.5 h-3.5" /> Launch CV Tailoring Studio
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            CV Improvement Tips
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Actionable modifications to foreground relevant experience for this specific role.
          </p>
        </div>

        {tailorUrl && (
          <Link
            href={tailorUrl}
            className="inline-flex items-center gap-2 min-h-[38px] px-3.5 bg-blue-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-blue-700 active:scale-[0.99] transition-all shadow-xs"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Tailor CV for this role</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {cvTips.map((tip, idx) => {
          if (typeof tip === "string") {
            return (
              <div
                key={idx}
                className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 flex items-start gap-3 shadow-xs"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span>{tip}</span>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-xs transition-all flex flex-col gap-2.5"
            >
              {/* Target Section */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SECTION:</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {tip.targetSection || "General Experience"}
                </span>
              </div>

              {/* Concrete Change */}
              <div className="flex items-start gap-2.5 text-xs text-slate-900">
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <span className="leading-relaxed font-semibold">{tip.change}</span>
              </div>

              {/* Reason / Requirement Addressed */}
              {tip.reason && (
                <p className="text-xs text-slate-500 pl-6 leading-relaxed">
                  <span className="font-semibold text-slate-700">Why: </span>
                  {tip.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

