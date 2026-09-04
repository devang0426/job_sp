import { requireUser } from "@/lib/auth";
import { getFeedJobs } from "@/lib/db/jobs";
import { findActiveScanRun } from "@/lib/db/scanRuns";
import { reconcileStalledMatches } from "@/lib/runs/reconcile";
import { jobsQuerySchema } from "@/lib/validation/jobs";
import { FeedTable } from "@/components/feed/FeedTable";
import { ScanButton } from "@/components/scans/ScanButton";

export const runtime = "nodejs";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const rawParams = await searchParams;

  const parseResult = jobsQuerySchema.safeParse(rawParams);
  const params = parseResult.success
    ? parseResult.data
    : jobsQuerySchema.parse({});

  // Parallelize all server operations for instant initial page rendering
  const [, { rows, nextCursor, totalCount, totalUnfilteredCount }, activeRun] =
    await Promise.all([
      reconcileStalledMatches(user.id),
      getFeedJobs({ userId: user.id, params }),
      findActiveScanRun(user.id),
    ]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-50 text-slate-900">
      {/* Top Feed Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900">Job Feed & Discovery</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified postings matching your profile, evaluated with AI
          </p>
        </div>
        <ScanButton activeRunId={activeRun?.id ?? null} size="sm" />
      </div>

      <FeedTable
        rows={rows}
        nextCursor={nextCursor}
        totalCount={totalCount}
        totalUnfilteredCount={totalUnfilteredCount}
      />
    </div>
  );
}
