import { z } from "zod";

export const seniorityEnum = z.enum([
  "INTERN",
  "JUNIOR",
  "MID",
  "SENIOR",
  "STAFF",
  "LEAD",
  "PRINCIPAL",
]);

export const jobSourceEnum = z.enum([
  "ADZUNA",
  "JSEARCH",
  "GREENHOUSE",
  "ASHBY",
  "LEVER",
  "SCRAPED",
  "FIRECRAWL",
  "MANUAL",
]);

const stringArraySchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  return val;
}, z.array(z.string().trim().min(1)).default([]));

export const preferencesSchema = z.object({
  targetRoles: stringArraySchema,
  locations: stringArraySchema,
  remoteOnly: z.boolean().default(false),
  employmentTypes: stringArraySchema,
  seniority: seniorityEnum.nullable().optional(),
  minSalary: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const parsed = Number(val);
    return isNaN(parsed) ? null : parsed;
  }, z.number().int().min(0).nullable().optional()),
  salaryCurrency: z.string().trim().default("INR"),
  keywords: stringArraySchema,
  excludeKeywords: stringArraySchema,
  excludedCompanies: stringArraySchema,
  sources: z
    .array(jobSourceEnum)
    .default(["GREENHOUSE", "LEVER", "ASHBY", "SCRAPED", "FIRECRAWL"]),
  maxJobsPerScan: z
    .preprocess((val) => {
      if (val === "" || val === null || val === undefined) return 40;
      const parsed = Number(val);
      return isNaN(parsed) ? 40 : parsed;
    }, z.number().int().min(1).default(40))
    .transform((val) => Math.min(val, 60)),
  autoEvaluate: z.boolean().default(true),

  // Scheduled scans. When enabled, the `auto-scan-sweep` background task
  // starts a scan for this user every `autoScanIntervalMinutes`.
  autoScanEnabled: z.boolean().default(false),
  autoScanIntervalMinutes: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 60;
      const parsed = Number(val);
      return isNaN(parsed) ? 60 : parsed;
    },
    // Discrete choices, not a free number — a 1-minute interval would hammer
    // every source. The sweep runs every 5 minutes, so 15 is the floor.
    z.union([
      z.literal(15),
      z.literal(30),
      z.literal(60),
      z.literal(120),
      z.literal(240),
      z.literal(480),
      z.literal(1440),
    ]).default(60),
  ),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

/** Interval options surfaced in the dashboard, minutes → label. */
export const AUTO_SCAN_INTERVALS: { minutes: number; label: string }[] = [
  { minutes: 15, label: "Every 15 minutes" },
  { minutes: 30, label: "Every 30 minutes" },
  { minutes: 60, label: "Every hour" },
  { minutes: 120, label: "Every 2 hours" },
  { minutes: 240, label: "Every 4 hours" },
  { minutes: 480, label: "Every 8 hours" },
  { minutes: 1440, label: "Once a day" },
];
