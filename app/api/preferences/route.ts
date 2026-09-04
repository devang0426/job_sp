import { requireUser, UnauthorizedError } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getPreferences, upsertPreferences } from "@/lib/db/preferences";
import { preferencesSchema } from "@/lib/validation/preferences";

export async function GET() {
  try {
    const user = await requireUser();
    const prefs = await getPreferences(user.id);

    if (!prefs) {
      return ok({
        targetRoles: [],
        locations: [],
        remoteOnly: false,
        employmentTypes: [],
        seniority: null,
        minSalary: null,
        salaryCurrency: "INR",
        keywords: [],
        excludeKeywords: [],
        excludedCompanies: [],
        sources: ["GREENHOUSE", "LEVER", "ASHBY"],
        maxJobsPerScan: 40,
        autoEvaluate: true,
        autoScanEnabled: false,
        autoScanIntervalMinutes: 60,
      });
    }

    return ok(prefs);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Failed to fetch preferences.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parseResult = preferencesSchema.safeParse(body);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]?.message || "Invalid preferences data.";
      return fail("VALIDATION_FAILED", issue, 400);
    }

    const updated = await upsertPreferences(user.id, parseResult.data);
    return ok(updated);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail("UNAUTHORIZED", error.message, 401);
    }
    return fail("INTERNAL", "Failed to update preferences.", 500);
  }
}
