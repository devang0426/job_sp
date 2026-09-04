import { z } from "zod";

export const IMPORTANCE = ["critical", "important", "nice_to_have"] as const;
export const EVIDENCE = ["stated", "structural", "inferred", "none"] as const;

export const DimensionSchema = z.object({
  score: z.number().int().min(0).max(100).describe("Dimension score between 0 and 100"),
  rationale: z.string().describe("One or two sentence justification for this dimension score"),
});

export const RequirementFindingSchema = z.object({
  requirement: z.string().describe("Extracted requirement from the job description"),
  importance: z.enum(IMPORTANCE).describe("Importance band of this requirement"),
  evidence: z.enum(EVIDENCE).describe("Evidence tier found in candidate CV"),
  note: z.string().describe("Concise note citing specific CV evidence with quotes <=125 chars or explaining gap"),
});

export const StrengthSchema = z.object({
  title: z.string().describe("Concise strength title"),
  detail: z.string().describe("Specific evidence from CV matching the job"),
});

export const GapSchema = z.object({
  title: z.string().describe("Concise gap title"),
  detail: z.string().describe("Explanation of missing qualification or experience"),
  severity: z.enum(["blocking", "significant", "minor"]).describe("Severity tier of the gap"),
});

export const CvTipSchema = z.object({
  targetSection: z.string().describe("Target CV section, e.g. 'Experience > Acme Corp' or 'Skills'"),
  change: z.string().describe("Concrete edit or enhancement to make"),
  reason: z.string().describe("Which requirement this edit answers"),
});

export const LegitimacySignalSchema = z.object({
  signal: z.string().describe("Signal evaluated e.g. Named hiring company, Salary band, ATS URL, etc."),
  verdict: z.enum(["pass", "unclear", "fail"]).describe("Signal evaluation result"),
});

export const LegitimacySchema = z.object({
  tier: z.enum(["verified", "likely_legitimate", "unverified", "suspicious"]).describe("Overall legitimacy tier"),
  signals: z.array(LegitimacySignalSchema).describe("Screening results for the six legitimacy signals"),
});

export const EvaluationSchema = z.object({
  summary: z.string().describe("Concise 2-3 sentence overview of how candidate fits the role"),

  dimensions: z.object({
    roleFit: DimensionSchema,
    skillsMatch: DimensionSchema,
    experienceDepth: DimensionSchema,
    domainContext: DimensionSchema,
    logistics: DimensionSchema,
  }),

  requirements: z.array(RequirementFindingSchema).describe("4 to 10 requirements extracted from the JD"),

  strengths: z.array(StrengthSchema).describe("Genuine strengths backed by CV evidence"),

  gaps: z.array(GapSchema).describe("Missing qualifications or gaps"),

  cvTips: z.array(CvTipSchema).describe("Concrete actionable CV edits answering requirements"),

  legitimacy: LegitimacySchema,

  modelRecommendation: z.enum(["apply", "consider", "skip"]).describe("Model's initial assessment for calibration"),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
export type Dimension = z.infer<typeof DimensionSchema>;
export type RequirementFinding = z.infer<typeof RequirementFindingSchema>;
export type Strength = z.infer<typeof StrengthSchema>;
export type Gap = z.infer<typeof GapSchema>;
export type CvTip = z.infer<typeof CvTipSchema>;
export type Legitimacy = z.infer<typeof LegitimacySchema>;
export type LegitimacySignal = z.infer<typeof LegitimacySignalSchema>;
