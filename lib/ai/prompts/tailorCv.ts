import { z } from "zod";

export const VERSION = "tailor@1";

export const SYSTEM = `You are an expert curriculum vitae (CV) tailoring advisor.

Your role is to produce specific, section-by-section rewriting guidance for a candidate's CV targeted at a particular job posting, reusing the match's identified gaps and evaluation tips.

CRITICAL NON-NEGOTIABLE HONESTY RULES:
1. REWRITE WHAT IS THERE. NEVER INVENT EXPERIENCE:
   - Never add skills, achievements, responsibilities, or tools that the CV does not actually claim.
   - Keyword optimization means surfacing and highlighting genuine experience that the candidate actually has but buried, phrased vaguely, or described with outdated terminology.
   - It NEVER means inventing experience. If the candidate never worked with Kubernetes, NEVER claim they did.

2. PRESERVE EVERY FACTUAL CLAIM:
   - Keep dates, job titles, employer names, and quantitative metrics (e.g. percentages, team sizes, dollars) intact and factual.
   - Do not inflate or alter seniority or dates of employment.

3. EXPLICIT REQUIREMENT GROUNDING:
   - For every rewrite suggestion, explicitly cite the exact job requirement or evaluation gap it directly answers.

4. FLAG UNADDRESSABLE REQUIREMENTS HONESTLY:
   - If a job requirement is genuinely missing from the CV and cannot honestly be addressed by rewriting existing experience, YOU MUST FLAG IT in "unaddressableRequirements" with a one-line reason.
   - Telling the candidate the truth about an unavoidable gap is far more valuable than lying. Papering over real gaps leads to failure in technical interviews. If everything is marked addressable, you are failing your objective.

OUTPUT FORMAT:
You must output a structured JSON object matching this shape:
- "suggestions": array of suggestions, each containing:
  - "targetSection": specific section from the candidate's CV (e.g., "Experience > Senior Engineer at Acme Corp", "Summary", or "Skills").
  - "currentText": the existing text or bullet point from the CV being revised.
  - "proposedRewrite": the polished, tailored replacement text highlighting relevant keywords and impact.
  - "requirementAddressed": the specific job requirement or gap this change answers.
- "unaddressableRequirements": array of requirements that cannot be met honestly by rewriting, each containing:
  - "requirement": the name/text of the requirement.
  - "reason": concise explanation why the candidate's background lacks this and rewriting cannot bridge it.
- "summaryAdvice": optional 1-2 sentence high-level positioning tip.`;

export const TailorSuggestionSchema = z.object({
  targetSection: z
    .string()
    .describe("Specific section in the candidate's CV being targeted (e.g., 'Experience > Acme Corp', 'Skills')"),
  currentText: z
    .string()
    .describe("The existing text or bullet point from the candidate's CV"),
  proposedRewrite: z
    .string()
    .describe("The proposed rewritten text highlighting relevant experience without fabricating anything"),
  requirementAddressed: z
    .string()
    .describe("The specific job requirement or evaluation gap addressed by this change"),
});

export const UnaddressableRequirementSchema = z.object({
  requirement: z
    .string()
    .describe("The job requirement that cannot be honestly met through rewriting"),
  reason: z
    .string()
    .describe("One-line explanation of why this is a genuine gap that cannot be papered over"),
});

export const TailorCvOutputSchema = z.object({
  suggestions: z
    .array(TailorSuggestionSchema)
    .min(1)
    .describe("Section-by-section rewrite suggestions"),
  unaddressableRequirements: z
    .array(UnaddressableRequirementSchema)
    .describe("Requirements that cannot honestly be addressed by rewriting"),
  summaryAdvice: z
    .string()
    .optional()
    .describe("High-level positioning advice for the candidate"),
});

export type TailorSuggestion = z.infer<typeof TailorSuggestionSchema>;
export type UnaddressableRequirement = z.infer<typeof UnaddressableRequirementSchema>;
export type TailorCvOutput = z.infer<typeof TailorCvOutputSchema>;

export interface TailorCvInput {
  jobTitle: string;
  company: string;
  jobDescription: string;
  cvText: string;
  /**
   * Findings copied from the Match row. They arrive as Prisma JSON, so they
   * are narrowed here rather than trusted as a declared shape.
   */
  gaps?: unknown[] | null;
  cvTips?: unknown[] | null;
  requirements?: unknown[] | null;
}

/** Read a string field off an unknown JSON object without asserting a shape. */
function field(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.trim() ? raw : null;
}

export function buildUser(input: TailorCvInput): string {
  const truncatedJd =
    input.jobDescription && input.jobDescription.length > 12000
      ? input.jobDescription.slice(0, 12000) + "\n\n[... Job description truncated at 12,000 characters ...]"
      : input.jobDescription || "No job description provided.";

  const gapsFormatted =
    input.gaps && input.gaps.length > 0
      ? input.gaps
          .map((g) => {
            if (typeof g === "string") return `- ${g}`;
            const severity = field(g, "severity") ?? "significant";
            const text =
              field(g, "title") ?? field(g, "detail") ?? field(g, "gap") ?? JSON.stringify(g);
            return `- [${severity}] ${text}`;
          })
          .join("\n")
      : "No critical gaps recorded in match evaluation.";

  const tipsFormatted =
    input.cvTips && input.cvTips.length > 0
      ? input.cvTips
          .map((t) => {
            if (typeof t === "string") return `- ${t}`;
            const section = field(t, "targetSection") ?? "General";
            const change = field(t, "change") ?? "";
            const reason = field(t, "reason") ?? "";
            return `- [${section}] ${change} (${reason})`;
          })
          .join("\n")
      : "No specific tips recorded in match evaluation.";

  const reqsFormatted =
    input.requirements && input.requirements.length > 0
      ? input.requirements
          .map((r) => {
            if (typeof r === "string") return `- ${r}`;
            const importance = field(r, "importance") ?? "important";
            const name = field(r, "requirement") ?? field(r, "name") ?? "Unnamed requirement";
            const evidence = field(r, "evidence") ?? "none";
            return `- [${importance}] ${name} (Evidence: ${evidence})`;
          })
          .join("\n")
      : "Requirements derived from job description.";

  return `# TARGET JOB POSTING
**Role:** ${input.jobTitle}
**Company:** ${input.company}

## JOB DESCRIPTION
${truncatedJd}

---

# EXISTING MATCH EVALUATION FINDINGS
(Reuse these findings — do not re-derive them)

## Identified Gaps:
${gapsFormatted}

## Evaluation CV Tips:
${tipsFormatted}

## Extracted Requirements:
${reqsFormatted}

---

# CANDIDATE'S CURRENT CV TEXT
${input.cvText}

---

# INSTRUCTION
Analyze the CV text against the job requirements and match findings above.
Produce actionable rewrite suggestions that ground the candidate's existing experience in the language of the posting.
Preserve all factual claims (dates, numbers, employers).
If any requirement cannot be honestly met, flag it in "unaddressableRequirements".
Output valid JSON adhering to the specified schema.`;
}
