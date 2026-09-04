"use client";

import { cn } from "@/lib/cn";
import { filledSegments } from "@/lib/evaluation/score";
import { useMeterStagger } from "./useMeterStagger";

export type VerdictRecommendation =
  | "apply"
  | "consider"
  | "skip"
  | "APPLY"
  | "CONSIDER"
  | "SKIP";

export type MeterScale = "sm" | "md" | "lg";

export interface ScoreMeterProps {
  /** Headline match score (0–100) */
  score: number;
  /** Recommendation verdict. If omitted, calculated from score thresholds (≥75 apply, 50–74 consider, <50 skip). */
  recommendation?: VerdictRecommendation;
  /** Meter scale size: sm (3px width), md (6px width), lg (12px width). Default is sm. */
  scale?: MeterScale;
  /** Unique match ID for stagger animation keying. */
  matchId?: string;
  /** Set true only when match result first arrives to trigger staggered fill animation. */
  isNewArrival?: boolean;
  /** Optional container class name. */
  className?: string;
}

const SCALE_STYLES: Record<
  MeterScale,
  { segmentWidth: string; segmentHeight: string; gap: string }
> = {
  sm: {
    segmentWidth: "w-[4px]",
    segmentHeight: "h-3.5",
    gap: "gap-[2px]",
  },
  md: {
    segmentWidth: "w-[7px]",
    segmentHeight: "h-5",
    gap: "gap-[2.5px]",
  },
  lg: {
    segmentWidth: "w-[12px]",
    segmentHeight: "h-7",
    gap: "gap-[3px]",
  },
};

const VERDICT_COLOR_MAP: Record<"apply" | "consider" | "skip", string> = {
  apply: "bg-emerald-600",
  consider: "bg-blue-600",
  skip: "bg-slate-400",
};

function normalizeRecommendation(
  rec?: VerdictRecommendation,
  score: number = 0
): "apply" | "consider" | "skip" {
  if (rec) {
    const lower = rec.toLowerCase();
    if (lower === "apply" || lower === "consider" || lower === "skip") {
      return lower;
    }
  }
  return score >= 75 ? "apply" : score >= 50 ? "consider" : "skip";
}

/**
 * ScoreMeter — signature segmented signal meter.
 * Renders 10 discrete segments filled to the match score, colored by recommendation verdict.
 */
export function ScoreMeter({
  score,
  recommendation,
  scale = "sm",
  matchId,
  isNewArrival = false,
  className,
}: ScoreMeterProps) {
  const normalizedVerdict = normalizeRecommendation(recommendation, score);
  const targetFilled = filledSegments(score);
  const visibleFilled = useMeterStagger({
    targetSegments: targetFilled,
    matchId,
    isNewArrival,
  });

  const { segmentWidth, segmentHeight, gap } = SCALE_STYLES[scale];
  const verdictColorClass = VERDICT_COLOR_MAP[normalizedVerdict];

  const ariaLabel = `Match score ${score} out of 100, ${normalizedVerdict}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center select-none shrink-0", gap, className)}
    >
      {Array.from({ length: 10 }).map((_, index) => {
        const isFilled = index < visibleFilled;
        return (
          <div
            key={index}
            className={cn(
              segmentWidth,
              segmentHeight,
              "rounded-xs transition-colors duration-150",
              isFilled ? verdictColorClass : "bg-slate-200"
            )}
          />
        );
      })}
    </div>
  );
}


