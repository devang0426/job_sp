import { requireUser } from "@/lib/auth";
import {
  listScanRunRows,
  findActiveScanRun,
  toScanRunView,
} from "@/lib/db/scanRuns";
import { reconcileScanRuns } from "@/lib/runs/reconcile";
import { getPreferences } from "@/lib/db/preferences";
import { ScanButton } from "@/components/scans/ScanButton";
import { ScanRunList } from "@/components/scans/ScanRunList";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export const runtime = "nodejs";

export default async function ScansPage() {
  const user = await requireUser();

  const [{ rows }, prefs] = await Promise.all([
    listScanRunRows({ userId: user.id, limit: 25 }),
    getPreferences(user.id),
  ]);

  // A run whose background task died is settled here, so the board never
  // shows a scan queued forever and the Scan button is never locked out.
  const runs = (await reconcileScanRuns(rows)).map(toScanRunView);
  const activeRun = await findActiveScanRun(user.id);

  const canScan = Boolean(prefs && prefs.targetRoles.length > 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="heading text-title text-text-primary">Scan runs</h1>
          <p className="max-w-prose text-body text-text-secondary">
            One run pulls postings from every enabled source, collapses
            duplicates, filters against your preferences, and queues an
            evaluation for each surviving job.
          </p>
        </div>
        {canScan && <ScanButton activeRunId={activeRun?.id ?? null} />}
      </div>

      {canScan ? (
        <ScanRunList runs={runs} />
      ) : (
        <EmptyState
          label="Preferences needed"
          action={
            <Link
              href="/settings"
              className="eyebrow text-accent-muted underline underline-offset-4"
            >
              Set preferences
            </Link>
          }
        >
          Add your target roles and enabled sources in preferences before
          running a scan.
        </EmptyState>
      )}
    </div>
  );
}
