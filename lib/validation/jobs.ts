import { z } from "zod";

export const jobsQuerySchema = z.object({
  recommendation: z.enum(["APPLY", "CONSIDER", "SKIP"]).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  source: z
    .enum([
      "ADZUNA",
      "JSEARCH",
      "GREENHOUSE",
      "ASHBY",
      "LEVER",
      "SCRAPED",
      "FIRECRAWL",
      "MANUAL",
    ])
    .optional(),
  remote: z
    .preprocess(
      (val) =>
        val === "true" || val === true
          ? true
          : val === "false" || val === false
            ? false
            : undefined,
      z.boolean().optional(),
    ),
  company: z.string().optional(),
  postedWithinDays: z.coerce.number().positive().optional(),
  evaluated: z
    .preprocess(
      (val) =>
        val === "true" || val === true
          ? true
          : val === "false" || val === false
            ? false
            : undefined,
      z.boolean().optional(),
    ),
  saved: z
    .preprocess(
      (val) =>
        val === "true" || val === true
          ? true
          : val === "false" || val === false
            ? false
            : undefined,
      z.boolean().optional(),
    ),
  sort: z.enum(["score", "postedAt"]).default("score"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type JobsQueryParams = z.infer<typeof jobsQuerySchema>;
