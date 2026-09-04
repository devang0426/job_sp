"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { asReportObject, type MatchReportMatch } from "@/lib/db/matches";

export interface DimensionBarsProps {
  match: MatchReportMatch;
}

type DimensionKey =
  | "roleFit"
  | "skillsMatch"
  | "experienceDepth"
  | "domainContext"
  | "logistics";

/** The Match columns holding each dimension's persisted score. */
type DimensionScoreKey =
  | "dimRoleFit"
  | "dimSkillsMatch"
  | "dimExperienceDepth"
  | "dimDomainContext"
  | "dimLogistics";

interface DimensionMeta {
  key: DimensionKey;
  label: string;
  weightLabel: string;
  scoreKey: DimensionScoreKey;
}

/** One dimension as the model returned it, inside `Match.raw`. */
interface RawDimension {
  score?: number;
  rationale?: string;
}

const DIMENSIONS: DimensionMeta[] = [
  { key: "roleFit", label: "Role fit", weightLabel: "30%", scoreKey: "dimRoleFit" },
  { key: "skillsMatch", label: "Skills match", weightLabel: "30%", scoreKey: "dimSkillsMatch" },
  { key: "experienceDepth", label: "Experience depth", weightLabel: "20%", scoreKey: "dimExperienceDepth" },
  { key: "domainContext", label: "Domain context", weightLabel: "10%", scoreKey: "dimDomainContext" },
  { key: "logistics", label: "Logistics", weightLabel: "10%", scoreKey: "dimLogistics" },
];

export function DimensionBars({ match }: DimensionBarsProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  // The model's own rationale per dimension, kept on `Match.raw`. Older
  // rows may not carry it; the bars render without rationales then.
  const rawDims = (asReportObject(asReportObject(match.raw)?.dimensions) ??
    {}) as Record<DimensionKey, RawDimension | undefined>;

  const toggleExpand = (dimKey: string) => {
    setExpandedDim((prev) => (prev === dimKey ? null : dimKey));
  };

  return (
    <div className="flex flex-col gap-3.5">
      {DIMENSIONS.map(({ key, label, weightLabel, scoreKey }) => {
        const score = match[scoreKey] ?? rawDims[key]?.score ?? 0;
        const rationale = rawDims[key]?.rationale ?? null;
        const isExpanded = expandedDim === key;

        return (
          <div key={key} className="flex flex-col gap-1.5 text-xs">
            {/* Label & Score header */}
            <button
              type="button"
              onClick={() => toggleExpand(key)}
              className="flex items-center justify-between text-left group hover:text-blue-600 cursor-pointer select-none"
              title={rationale ? "Click to view rationale" : undefined}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-800 font-semibold group-hover:text-blue-600 transition-colors">{label}</span>
                <span className="text-[10px] text-slate-400 font-mono">({weightLabel})</span>
                {rationale && (
                  <span className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-xs tabular-nums text-slate-900">
                {score}
              </span>
            </button>

            {/* Segment Track Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>

            {/* Expanded Rationale */}
            {isExpanded && rationale && (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-1 leading-relaxed shadow-2xs">
                {rationale}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

