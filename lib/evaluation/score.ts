/**
 * Scoring weights, caps, thresholds, and meter mapping for match evaluations.
 *
 * The model does NOT return the overall headline score. Claude returns 5 bounded
 * dimension scores and structured findings; the 0–100 headline score and
 * recommendation are computed deterministically here.
 *
 * See context/evaluation-spec.md and context/features/feature-15-match-evaluation.md.
 */

export const SCORE_THRESHOLDS = {
  APPLY: 75,
  CONSIDER: 50,
} as const;

export const DIMENSION_WEIGHTS = {
  roleFit: 0.30,
  skillsMatch: 0.30,
  experienceDepth: 0.20,
  domainContext: 0.10,
  logistics: 0.10,
} as const;

export interface ScoreDimensionsInput {
  roleFit: { score: number };
  skillsMatch: { score: number };
  experienceDepth: { score: number };
  domainContext: { score: number };
  logistics: { score: number };
}

export interface ScoreRequirementInput {
  importance: string;
  evidence: string;
}

export interface ScoreLegitimacyInput {
  tier: string;
}

export interface ScoreInput {
  dimensions: ScoreDimensionsInput;
  requirements: ScoreRequirementInput[];
  legitimacy: ScoreLegitimacyInput;
}

export interface ScoreResult {
  score: number;
  recommendation: "APPLY" | "CONSIDER" | "SKIP";
  scoreCapApplied: string | null;
  rawScore: number;
  criticalGaps: number;
}

/**
 * Pure scoring function that computes weighted headline score, enforces
 * deterministic caps (critical requirement gaps, logistics floor),
 * and decides the final recommendation.
 */
export function computeMatchScore({
  dimensions,
  requirements,
  legitimacy,
}: ScoreInput): ScoreResult {
  const rawScore = Math.round(
    dimensions.roleFit.score * DIMENSION_WEIGHTS.roleFit +
    dimensions.skillsMatch.score * DIMENSION_WEIGHTS.skillsMatch +
    dimensions.experienceDepth.score * DIMENSION_WEIGHTS.experienceDepth +
    dimensions.domainContext.score * DIMENSION_WEIGHTS.domainContext +
    dimensions.logistics.score * DIMENSION_WEIGHTS.logistics
  );

  let score = rawScore;
  let cap: string | null = null;

  const criticalGaps = requirements.filter(
    (r) =>
      r.importance === "critical" &&
      (r.evidence === "inferred" || r.evidence === "none")
  ).length;

  if (criticalGaps === 1) {
    score = Math.min(score, 59);
    cap = "critical_gap_x1";
  } else if (criticalGaps >= 2) {
    score = Math.min(score, 39);
    cap = "critical_gap_x2";
  }

  if (dimensions.logistics.score < 30) {
    if (score > 49 || !cap) {
      score = Math.min(score, 49);
      cap = "logistics";
    }
  }

  // Ensure bounded 0–100
  score = Math.max(0, Math.min(100, score));

  let recommendation: "APPLY" | "CONSIDER" | "SKIP" =
    score >= SCORE_THRESHOLDS.APPLY
      ? "APPLY"
      : score >= SCORE_THRESHOLDS.CONSIDER
      ? "CONSIDER"
      : "SKIP";

  // Legitimacy screen: career-ops never sends a human to a suspicious posting
  if (legitimacy.tier.toLowerCase() === "suspicious") {
    recommendation = "SKIP";
  }

  return {
    score,
    recommendation,
    scoreCapApplied: cap,
    rawScore,
    criticalGaps,
  };
}

/**
 * Segment mapping function for the score meter.
 *
 * Maps a 0–100 headline match score to 0–10 discrete segments.
 * Math.max(1, ...) ensures a low score (e.g. 4) shows 1 lit segment.
 * A score of 0 returns 0 (representing un-evaluated or zero score).
 */
export function filledSegments(score: number): number {
  return score === 0 ? 0 : Math.max(1, Math.round(score / 10));
}
