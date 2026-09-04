import { z } from "zod";

export const VERSION = "resume@1";

export const SYSTEM = `You are a strict, precise CV parser. Your job is to extract structured profile information from raw curriculum vitae (CV) text into a clean JSON structure.

CRITICAL EXTRACTION RULES:
1. Extract ONLY what the CV explicitly states.
2. DO NOT infer, guess, or extrapolate skills, technologies, job roles, or degrees that are not directly mentioned in the CV text.
3. DO NOT fill in gaps or round dates generously.
4. Extract skills as a flat, deduplicated array of canonical names (e.g. "TypeScript", "React", "PostgreSQL", "Docker").
5. Extract work experience roles: company name, job title, start date (e.g. "2020-01" or "2020"), end date ("Present", "2022-05", or null if ongoing/unspecified), and a concise one-line scope summary of responsibilities and impact.
6. Extract education items: institution name, qualification/degree name, and completion year as a number (or null if unspecified).
7. Calculate total years of relevant experience ONLY if it is explicitly stated or can be determined with certainty from clear role start and end dates. If it cannot be determined honestly, return null.

Remember: An inaccurate or over-eager extraction that invents skills or experience will corrupt downstream job match evaluations.`;

export function buildUser(rawText: string): string {
  return `Below is the raw text extracted from a resume/CV. Parse and extract the structured profile according to the system instructions.

--- RAW RESUME TEXT ---
${rawText}
--- END RAW RESUME TEXT ---`;
}

export const ResumeRoleSchema = z.object({
  company: z.string().describe("Company or organization name"),
  title: z.string().describe("Job title or position held"),
  start: z.string().describe("Start date e.g. 2021-03 or 2021"),
  end: z.string().nullable().describe("End date e.g. Present or 2023-08, or null if unspecified"),
  scopeSummary: z.string().describe("One-line scope summary of responsibilities and achievements"),
});

export const ResumeEducationSchema = z.object({
  institution: z.string().describe("University, college, or educational institution"),
  qualification: z.string().describe("Degree, diploma, or certification name"),
  year: z.number().nullable().describe("Completion year as a number, or null if unspecified"),
});

export const ResumeProfileSchema = z.object({
  skills: z.array(z.string()).describe("Flat deduplicated array of explicit canonical skill names"),
  roles: z.array(ResumeRoleSchema).describe("List of professional work roles"),
  education: z.array(ResumeEducationSchema).describe("List of educational qualifications"),
  totalYearsExperience: z.number().nullable().describe("Total years of relevant experience as a number, or null if undetermined"),
});

export type ResumeRole = z.infer<typeof ResumeRoleSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
