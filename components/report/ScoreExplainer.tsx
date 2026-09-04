import React from "react";
import { DIMENSION_WEIGHTS } from "@/lib/evaluation/score";
import { AlertTriangle, Calculator } from "lucide-react";

export interface ScoreExplainerProps {
  score: number;
  dimRoleFit?: number | null;
  dimSkillsMatch?: number | null;
  dimExperienceDepth?: number | null;
  dimDomainContext?: number | null;
  dimLogistics?: number | null;
  scoreCapApplied?: string | null;
  criticalGapsCount?: number;
}

export function ScoreExplainer({
  score,
  dimRoleFit,
  dimSkillsMatch,
  dimExperienceDepth,
  dimDomainContext,
  dimLogistics,
  scoreCapApplied,
  criticalGapsCount,
}: ScoreExplainerProps) {
  const rf = dimRoleFit ?? 0;
  const sm = dimSkillsMatch ?? 0;
  const ed = dimExperienceDepth ?? 0;
  const dc = dimDomainContext ?? 0;
  const log = dimLogistics ?? 0;

  const contribRf = rf * DIMENSION_WEIGHTS.roleFit;
  const contribSm = sm * DIMENSION_WEIGHTS.skillsMatch;
  const contribEd = ed * DIMENSION_WEIGHTS.experienceDepth;
  const contribDc = dc * DIMENSION_WEIGHTS.domainContext;
  const contribLog = log * DIMENSION_WEIGHTS.logistics;

  const rawSum = Math.round(contribRf + contribSm + contribEd + contribDc + contribLog);

  const getCapDescription = (cap: string) => {
    if (cap.includes("critical_gap_x2") || cap.toLowerCase().includes("2") || (criticalGapsCount && criticalGapsCount >= 2)) {
      return "Score capped at 39: Two or more critical requirements lack stated evidence on your CV.";
    }
    if (cap.includes("critical_gap_x1") || cap.toLowerCase().includes("1") || cap.toLowerCase().includes("critical")) {
      return "Score capped at 59: One critical prerequisite lacks stated evidence on your CV.";
    }
    if (cap.includes("logistics")) {
      return "Score capped at 49: Logistics score is below the 30-point threshold (location or authorization mismatch).";
    }
    return `Score cap applied: ${cap}`;
  };

  return (
    <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Calculator className="h-4 w-4 text-blue-600" />
        <h4 className="text-xs font-bold tracking-wider uppercase text-slate-900">
          Deterministic Score Computation
        </h4>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        The headline score is never asserted arbitrarily by the AI model. It is computed
        in verified TypeScript code as a weighted mean of the five audited dimensions,
        subject to strict qualification cap constraints.
      </p>

      {/* Breakdown Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 select-none font-bold">
              <th className="py-2.5 px-3">DIMENSION</th>
              <th className="py-2.5 px-3 text-right">SCORE</th>
              <th className="py-2.5 px-3 text-right">WEIGHT</th>
              <th className="py-2.5 px-3 text-right">CONTRIBUTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr>
              <td className="py-2.5 px-3 text-slate-900 font-medium">Role fit</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">{rf}</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono">30%</td>
              <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-slate-900">{contribRf.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-slate-900 font-medium">Skills match</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">{sm}</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono">30%</td>
              <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-slate-900">{contribSm.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-slate-900 font-medium">Experience depth</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">{ed}</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono">20%</td>
              <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-slate-900">{contribEd.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-slate-900 font-medium">Domain context</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">{dc}</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono">10%</td>
              <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-slate-900">{contribDc.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-slate-900 font-medium">Logistics</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">{log}</td>
              <td className="py-2.5 px-3 text-right text-slate-400 font-mono">10%</td>
              <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-slate-900">{contribLog.toFixed(1)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
              <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-xs">Weighted sum</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sm text-blue-600">{rawSum} / 100</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Cap notification if applied */}
      {scoreCapApplied ? (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 shadow-2xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold uppercase tracking-wider text-rose-900">Score cap enforced</span>
            <p className="leading-relaxed text-slate-700">
              {getCapDescription(scoreCapApplied)}
            </p>
            <div className="mt-1 font-mono text-[11px] text-slate-500">
              Computed weighted sum was <span className="line-through">{rawSum}</span> → Final Score: <span className="font-bold text-slate-900">{score}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <span>Cap status:</span>
          <span className="text-emerald-700 font-semibold">No cap applied (all critical criteria satisfied)</span>
        </div>
      )}
    </div>
  );
}

