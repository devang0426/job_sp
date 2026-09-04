"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { ScanRunView } from "@/lib/db/scanRuns";

const STATUS_TONE: Record<
  ScanRunView["status"],
  "neutral" | "success" | "consider" | "error"
> = {
  QUEUED: "neutral",
  RUNNING: "neutral",
  SUCCEEDED: "success",
  PARTIAL: "consider",
  FAILED: "error",
};

export function ScanRunList({ runs }: { runs: ScanRunView[] }) {
  if (runs.length === 0) {
    return (
      <EmptyState label="No scans yet">
        Run a scan to pull postings from every enabled source. Each run is
        recorded here with per-source statistics, so a partial failure is
        visible rather than silent.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => (
        <ScanRunRow key={run.id} run={run} />
      ))}
    </div>
  );
}

function ScanRunRow({ run }: { run: ScanRunView }) {
  const [open, setOpen] = useState(false);

  const sourceStatEntries = Object.entries(run.sourceStats ?? {});
  const failingSources = sourceStatEntries.filter(
    ([, s]) => s.errors.length > 0,
  );
  const hasDetail =
    failingSources.length > 0 || Boolean(run.error) || sourceStatEntries.length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          "flex w-full flex-col gap-3 p-4 text-left transition-colors duration-[120ms]",
          hasDetail && "hover:bg-slate-50/60 cursor-pointer",
          !hasDetail && "cursor-default",
        )}
        aria-expanded={hasDetail ? open : undefined}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusChip tone={STATUS_TONE[run.status]}>{run.status}</StatusChip>

          <span
            className="text-xs font-semibold text-slate-800 font-mono"
            title={new Date(run.createdAt).toLocaleString()}
          >
            {relativeTime(run.createdAt)}
          </span>

          <span className="font-mono text-xs text-slate-400">
            {formatDuration(run.durationMs)}
          </span>

          <span className="flex flex-wrap items-center gap-1.5">
            {run.sourcesUsed.map((s) => (
              <span key={s} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-600 uppercase">
                {s}
              </span>
            ))}
          </span>

          {hasDetail && (
            <span className="ml-auto text-slate-400">
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600 font-mono">
          <Stat label="found" value={run.jobsFound} />
          <Stat label="new" value={run.jobsNew} />
          <Stat label="updated" value={run.jobsUpdated} />
          <Stat label="filtered" value={run.jobsFiltered} />
          <Stat label="evals queued" value={run.evaluationsQueued} />
        </dl>
      </button>

      {open && hasDetail && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4">
          {run.error && (
            <p className="mb-3 whitespace-pre-line text-xs font-mono text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {run.error}
            </p>
          )}

          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 text-[11px] uppercase">
                <th className="py-2 pr-4 font-bold">Source</th>
                <th className="py-2 pr-4 font-bold">Requests</th>
                <th className="py-2 pr-4 font-bold">Returned</th>
                <th className="py-2 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sourceStatEntries.map(([source, stat]) => (
                <tr
                  key={source}
                  className="align-top text-slate-600 [&>td]:border-t [&>td]:border-slate-100 [&>td]:py-2"
                >
                  <td className="pr-4 font-bold text-slate-900">{source}</td>
                  <td className="pr-4">{stat.requests}</td>
                  <td className="pr-4">{stat.returned}</td>
                  <td>
                    {stat.errors.length === 0 ? (
                      <span className="text-emerald-600 font-semibold">ok</span>
                    ) : (
                      <ul className="space-y-1">
                        {stat.errors.map((e, i) => (
                          <li key={i} className="text-rose-600 font-semibold">
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-primary tabular-nums">{value}</dd>
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
