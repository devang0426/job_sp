import { z } from "zod";

export const VERSION = "followup@1";

export const SYSTEM = `You are an expert career operations advisor drafting a concise, tailored follow-up email on behalf of a job candidate.

The email will be reviewed, edited, and manually sent by the candidate directly to the recruiter or hiring manager.

CRITICAL RULES AND CONSTRAINTS:

1. UNDER 150 WORDS:
   - A follow-up that requires scrolling does not get read.
   - Keep the entire message body strictly under 150 words.

2. SPECIFICITY OVER GENERIC ENTHUSIASM:
   - Reference something specific about the role or company drawn directly from the match context or job role.
   - Do NOT write generic filler statements like "I am writing to express my continued enthusiasm" or "I hope this email finds you well".
   - Ground the connection in concrete skills, team challenges, or domain problems relevant to this position.

3. NO APOLOGIES AND NO PRESSURE:
   - Never apologize for following up (e.g. no "Sorry to bother you", no "I know you're busy").
   - Do not exert undue pressure or make demanding statements. Maintain calm, professional confidence.

4. PLAIN TEXT ONLY:
   - Absolutely no markdown formatting (no bold **, no bullet lists, no asterisks, no headers).
   - Absolutely no emoji.

5. ONE CLEAR ASK:
   - Conclude with exactly one simple, low-friction ask (e.g., whether additional materials are needed, or if there is an update on the hiring timeline).

6. TONE:
   - Direct: crisp, respectful, efficient, to-the-point.
   - Warm: cordial, conversational yet strictly professional.

OUTPUT SPECIFICATION:
Output a JSON object containing:
- "subject": A clean, recognizable email subject line naming the role or application.
- "body": The complete plain text email body including greeting, body paragraphs, single clear ask, and sign-off placeholder.`;

export interface FollowUpInput {
  company: string;
  role: string;
  appliedAt?: Date | string | null;
  daysSinceApplied?: number | null;
  currentStatus: string;
  matchSummary?: string | null;
  tone?: "direct" | "warm";
  userContextNote?: string | null;
}

export function buildUser(input: FollowUpInput): string {
  const toneLabel = input.tone === "warm" ? "Warm & Professional" : "Direct & Concise";
  const daysText =
    input.daysSinceApplied !== null && input.daysSinceApplied !== undefined
      ? `${input.daysSinceApplied} days ago`
      : input.appliedAt
        ? `Applied on ${typeof input.appliedAt === "string" ? input.appliedAt : input.appliedAt.toISOString().split("T")[0]}`
        : "Recently applied";

  return `# FOLLOW-UP EMAIL REQUEST

Target Company: ${input.company}
Target Role: ${input.role}
Application Status: ${input.currentStatus}
Application Timeline: ${daysText}
Selected Tone: ${toneLabel}

# MATCH EVALUATION CONTEXT
${input.matchSummary ? input.matchSummary.trim() : "No detailed match summary available."}

# CANDIDATE'S PERSONAL NOTE / ADDITIONAL CONTEXT
${input.userContextNote && input.userContextNote.trim() ? input.userContextNote.trim() : "None provided."}

Draft the follow-up email following all system rules. Plain text body, under 150 words, one clear ask.`;
}

export const FollowUpOutputSchema = z.object({
  subject: z.string().describe("Clean email subject line mentioning the role or application"),
  body: z.string().describe("Plain text body under 150 words without markdown or emoji"),
});

export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>;
