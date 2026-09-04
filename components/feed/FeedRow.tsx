"use client";

import React from "react";
import type { FeedRow as FeedRowType } from "@/lib/db/jobs";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { StatusChip } from "@/components/ui/StatusChip";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeedRowProps {
  row: FeedRowType;
}

function formatPostedAge(postedAt: string | null, firstSeenAt: string): string {
  const dateStr = postedAt || firstSeenAt;
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}m ago`;
}

export function FeedRow({ row }: FeedRowProps) {
  const router = useRouter();
  const { job, match } = row;

  // Determine row state
  const isEvaluated = match?.status === "COMPLETE" && typeof match.score === "number";
  const isPending = match?.status === "PENDING" || match?.status === "RUNNING";
  const isFailed = match?.status === "FAILED";
  const isNotEvaluated = !match || match.status === null;

  const handleRowClick = () => {
    router.push(`/feed/${job.id}`);
  };

  const initial = (job.company || "C").trim().charAt(0).toUpperCase();

  return (
    <div
      onClick={handleRowClick}
      className="group grid grid-cols-[105px_minmax(110px,1.2fr)_minmax(160px,2fr)_minmax(85px,1fr)_55px_80px_85px_65px] items-center gap-2.5 bg-white px-5 py-3.5 text-xs transition-all duration-150 hover:bg-blue-50/40 cursor-pointer border-l-2 border-l-transparent hover:border-l-blue-600"
    >
      {/* Column 1: Score Meter + Mono Score */}
      <div className="flex items-center gap-2 select-none min-w-0">
        <ScoreMeter
          score={isEvaluated ? (match.score ?? 0) : 0}
          recommendation={match?.recommendation ?? undefined}
          scale="sm"
        />
        <div className="font-mono tabular-nums text-xs font-bold shrink-0">
          {isEvaluated && (
            <span className="text-slate-900 font-semibold">{match.score}%</span>
          )}
          {isPending && (
            <span className="text-blue-600 text-[10px] font-semibold animate-pulse">
              RUNNING
            </span>
          )}
          {isFailed && (
            <span className="text-rose-600 text-[10px] font-semibold">ERR</span>
          )}
          {isNotEvaluated && (
            <span className="text-slate-400 text-xs">--</span>
          )}
        </div>
      </div>

      {/* Column 2: Company + Monogram */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10.5px] shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
          {initial}
        </div>
        <span className="font-semibold text-slate-900 truncate tracking-tight text-xs">
          {job.company}
        </span>
      </div>

      {/* Column 3: Role */}
      <div className="text-slate-900 truncate min-w-0 flex items-center gap-2 font-medium">
        <span className="truncate group-hover:text-blue-600 transition-colors text-xs font-semibold">
          {job.title}
        </span>
        {job.isRemote && (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[8.5px] font-bold text-emerald-700 uppercase tracking-wider">
            Remote
          </span>
        )}
      </div>

      {/* Column 4: Location */}
      <div className="text-slate-500 truncate min-w-0 text-xs">
        {job.location || (job.isRemote ? "Remote" : "Unspecified")}
      </div>

      {/* Column 5: Posted Age (Mono) */}
      <div className="text-right font-mono tabular-nums text-xs text-slate-500 shrink-0">
        {formatPostedAge(job.postedAt, job.firstSeenAt)}
      </div>

      {/* Column 6: Source */}
      <div className="text-center shrink-0">
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-slate-600 uppercase">
          {job.source}
        </span>
      </div>

      {/* Column 7: Verdict Chip */}
      <div className="flex justify-center shrink-0">
        {isEvaluated && match.recommendation && (
          <StatusChip
            tone={
              match.recommendation === "APPLY"
                ? "apply"
                : match.recommendation === "CONSIDER"
                  ? "consider"
                  : "skip"
            }
          >
            {match.recommendation}
          </StatusChip>
        )}

        {isPending && (
          <StatusChip tone="warning" className="animate-pulse">
            EVALUATING
          </StatusChip>
        )}

        {isFailed && (
          <StatusChip
            tone="error"
            title={match?.failureReason || "Evaluation failed"}
            className="flex items-center gap-1"
          >
            FAILED <RefreshCw className="h-2.5 w-2.5" />
          </StatusChip>
        )}

        {isNotEvaluated && (
          <StatusChip tone="neutral" className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
            EVALUATE <Sparkles className="h-2.5 w-2.5" />
          </StatusChip>
        )}
      </div>

      {/* Column 8: Apply Link */}
      <div className="flex justify-end shrink-0">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-semibold text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md px-2 py-1 transition-colors"
          aria-label={`Apply for ${job.title} at ${job.company}`}
        >
          <span>Apply</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

