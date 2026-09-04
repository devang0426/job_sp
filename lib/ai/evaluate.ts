import { prisma } from "@/lib/db";
import { calculateCostUsd } from "./cost";
import { generate } from "./generate";
import {
  VERSION,
  SYSTEM,
  buildUser,
  EvaluateJobInput,
} from "./prompts/evaluate";
import { EvaluationSchema, Evaluation } from "@/lib/evaluation/schema";
import { computeMatchScore, ScoreResult } from "@/lib/evaluation/score";
import { Match, MatchStatus, Recommendation, LegitimacyTier, Prisma } from "@prisma/client";


export interface EvaluateJobParams {
  userId: string;
  jobId: string;
  resumeId: string;
  triggerRunId?: string | null;
}

export interface EvaluateJobResult {
  success: boolean;
  match?: Match;
  error?: string;
}

const RECOMMENDATION_MAP: Record<string, Recommendation> = {
  apply: Recommendation.APPLY,
  consider: Recommendation.CONSIDER,
  skip: Recommendation.SKIP,
};

const LEGITIMACY_MAP: Record<string, LegitimacyTier> = {
  verified: LegitimacyTier.VERIFIED,
  likely_legitimate: LegitimacyTier.LIKELY_LEGITIMATE,
  unverified: LegitimacyTier.UNVERIFIED,
  suspicious: LegitimacyTier.SUSPICIOUS,
};

/** Widen a validated, JSON-safe value to Prisma's Json input type. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Truncate over-long arrays server-side rather than discarding a usable $0.02 evaluation.
 * Bounds advisory counts: 4-10 requirements, at most 5 strengths, gaps, cv tips.
 */
function normalizeEvaluation(evalData: Evaluation): Evaluation {
  return {
    ...evalData,
    dimensions: {
      roleFit: {
        score: Math.max(0, Math.min(100, Math.round(evalData.dimensions.roleFit.score))),
        rationale: evalData.dimensions.roleFit.rationale,
      },
      skillsMatch: {
        score: Math.max(0, Math.min(100, Math.round(evalData.dimensions.skillsMatch.score))),
        rationale: evalData.dimensions.skillsMatch.rationale,
      },
      experienceDepth: {
        score: Math.max(0, Math.min(100, Math.round(evalData.dimensions.experienceDepth.score))),
        rationale: evalData.dimensions.experienceDepth.rationale,
      },
      domainContext: {
        score: Math.max(0, Math.min(100, Math.round(evalData.dimensions.domainContext.score))),
        rationale: evalData.dimensions.domainContext.rationale,
      },
      logistics: {
        score: Math.max(0, Math.min(100, Math.round(evalData.dimensions.logistics.score))),
        rationale: evalData.dimensions.logistics.rationale,
      },
    },
    requirements: evalData.requirements.slice(0, 10),
    strengths: evalData.strengths.slice(0, 5),
    gaps: evalData.gaps.slice(0, 5),
    cvTips: evalData.cvTips.slice(0, 5),
  };
}

/**
 * Evaluates a candidate CV against a specific Job posting using Claude with prompt caching.
 *
 * Enforces Invariant 4 (Match is never written without Zod validation) and computes
 * headline score deterministically via lib/evaluation/score.ts.
 */
export async function evaluateJob({
  userId,
  jobId,
  resumeId,
  triggerRunId,
}: EvaluateJobParams): Promise<EvaluateJobResult> {
  const [job, resume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.resume.findUnique({ where: { id: resumeId } }),
  ]);

  if (!job) {
    return { success: false, error: `Job ${jobId} not found.` };
  }

  if (!resume) {
    return { success: false, error: `Resume ${resumeId} not found.` };
  }

  if (!resume.rawText || !resume.rawText.trim()) {
    const errorMsg = "CV raw text is empty. Upload a readable CV before evaluating.";
    await prisma.match.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: {
        userId,
        jobId,
        resumeId,
        status: MatchStatus.FAILED,
        failureReason: errorMsg,
        triggerRunId,
      },
      update: {
        status: MatchStatus.FAILED,
        failureReason: errorMsg,
        triggerRunId,
      },
    });
    return { success: false, error: errorMsg };
  }

  // Update Match state to RUNNING while API call proceeds
  await prisma.match.upsert({
    where: { userId_jobId: { userId, jobId } },
    create: {
      userId,
      jobId,
      resumeId,
      status: MatchStatus.RUNNING,
      triggerRunId,
      failureReason: null,
    },
    update: {
      resumeId,
      status: MatchStatus.RUNNING,
      triggerRunId,
      failureReason: null,
    },
  });

  const jobInput: EvaluateJobInput = {
    title: job.title,
    company: job.company,
    location: job.location,
    isRemote: job.isRemote,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    applyUrl: job.applyUrl,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt,
    description: job.descriptionText,
  };

  const startTime = Date.now();

  try {
    // The schema is enforced by the provider, then re-validated on the way
    // back. The CV is the cacheable prefix; the job description is volatile.
    const { data: rawEvaluation, usage, model: usedModel } = await generate({
      system: SYSTEM,
      cacheableContext: `# CANDIDATE CV

${resume.rawText.trim()}`,
      user: buildUser(jobInput),
      schema: EvaluationSchema,
    });

    const inputTokens = usage.inputTokens;
    const outputTokens = usage.outputTokens;
    const cachedTokens = usage.cachedTokens;
    const cacheCreationTokens = usage.cacheCreationTokens;

    const latencyMs = Date.now() - startTime;

    // Invariant 4: never persist without a successful schema validation.
    // `generate` already validated once; re-validate here so this rule is
    // enforced at the persistence boundary itself, not only in transport.
    const safeValidation = EvaluationSchema.safeParse(rawEvaluation);
    if (!safeValidation.success) {
      throw new Error(
        `Evaluation schema validation failed: ${safeValidation.error.message}`,
      );
    }

    // Normalize and bound arrays
    const evaluation = normalizeEvaluation(safeValidation.data);

    // Compute headline score, caps, and recommendation deterministically in code
    const scoreResult: ScoreResult = computeMatchScore({
      dimensions: evaluation.dimensions,
      requirements: evaluation.requirements,
      legitimacy: evaluation.legitimacy,
    });

    const costUsd = calculateCostUsd({
      model: usedModel,
      inputTokens,
      outputTokens,
      cachedTokens,
      cacheCreationTokens,
    });

    const modelRecommendation =
      RECOMMENDATION_MAP[evaluation.modelRecommendation.toLowerCase()] ||
      Recommendation.CONSIDER;

    const legitimacyTier =
      LEGITIMACY_MAP[evaluation.legitimacy.tier.toLowerCase()] ||
      LegitimacyTier.UNVERIFIED;

    const updatedMatch = await prisma.match.update({
      where: { userId_jobId: { userId, jobId } },
      data: {
        resumeId,
        status: MatchStatus.COMPLETE,
        failureReason: null,
        triggerRunId,
        score: scoreResult.score,
        recommendation: scoreResult.recommendation as Recommendation,
        modelRecommendation,
        dimRoleFit: evaluation.dimensions.roleFit.score,
        dimSkillsMatch: evaluation.dimensions.skillsMatch.score,
        dimExperienceDepth: evaluation.dimensions.experienceDepth.score,
        dimDomainContext: evaluation.dimensions.domainContext.score,
        dimLogistics: evaluation.dimensions.logistics.score,
        summary: evaluation.summary,
        strengths: toJson(evaluation.strengths),
        gaps: toJson(evaluation.gaps),
        cvTips: toJson(evaluation.cvTips),
        requirements: toJson(evaluation.requirements),
        legitimacyTier,
        legitimacySignals: toJson(evaluation.legitimacy.signals),
        scoreCapApplied: scoreResult.scoreCapApplied,
        raw: toJson(evaluation),
        model: usedModel,
        promptVersion: VERSION,
        inputTokens,
        outputTokens,
        cachedTokens,
        costUsd: new Prisma.Decimal(costUsd),
        latencyMs,
        evaluatedAt: new Date(),
      },
    });

    return {
      success: true,
      match: updatedMatch,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to evaluate job match.";
    console.error(`Evaluation failed for user ${userId} on job ${jobId}:`, err);

    await prisma.match.update({
      where: { userId_jobId: { userId, jobId } },
      data: {
        status: MatchStatus.FAILED,
        failureReason: errorMsg,
        triggerRunId,
      },
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}
