"use client";

import React from "react";
import type { FeedRow as FeedRowType } from "@/lib/db/jobs";
import { FeedRow } from "./FeedRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";

interface FeedTableProps {
  rows: FeedRowType[];
  nextCursor: string | null;
  totalCount: number;
  totalUnfilteredCount: number;
}

export function FeedTable({
  rows,
  nextCursor,
  totalCount,
  totalUnfilteredCount,
}: FeedTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // If any jobs are currently evaluating (PENDING or RUNNING), auto-refresh every 1.5s until complete
  const hasPendingEvaluations = React.useMemo(
    () =>
      rows.some(
        (r) =>
          r.match?.status === "PENDING" || r.match?.status === "RUNNING",
      ),
    [rows],
  );

  React.useEffect(() => {
    if (!hasPendingEvaluations) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 1500);
    return () => clearInterval(interval);
  }, [hasPendingEvaluations, router]);

  const handleClearFilters = () => {
    router.push(pathname);
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Case 1: Genuinely no jobs in system
  if (totalUnfilteredCount === 0) {
    return (
      <div className="p-8">
        <EmptyState
          label="NO POSTINGS IN CONSOLE"
          action={
            <Link href="/scans">
              <Button size="sm" variant="accent" className="gap-2">
                Run scanner <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        >
          Run a scan to pull real postings matching your profile. Each one is
          scored against your CV and lands here as it is evaluated.
        </EmptyState>
      </div>
    );
  }

  // Case 2: Filters yielded 0 matching jobs
  if (rows.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          label="NO MATCHING POSTINGS"
          action={
            <Button size="sm" variant="subtle" onClick={handleClearFilters} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Reset all filters
            </Button>
          }
        >
          No jobs match your active filters. Try broadening your criteria or
          resetting filters to see all postings.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="sticky top-[49px] z-10 grid grid-cols-[105px_minmax(110px,1.2fr)_minmax(160px,2fr)_minmax(85px,1fr)_55px_80px_85px_65px] items-center gap-2.5 border-b border-slate-200 bg-white/95 backdrop-blur px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none shadow-xs">
        <div className="flex items-center gap-1">
          <span className="text-slate-700 font-bold">MATCH</span>
          <span className="font-mono text-[10px] font-medium text-slate-400">
            ({totalCount})
          </span>
        </div>
        <div className="text-slate-700 font-bold">COMPANY</div>
        <div className="text-slate-700 font-bold">ROLE</div>
        <div className="text-slate-700 font-bold">LOCATION</div>
        <div className="text-right text-slate-700 font-bold">POSTED</div>
        <div className="text-center text-slate-700 font-bold">SOURCE</div>
        <div className="text-center text-slate-700 font-bold">VERDICT</div>
        <div className="text-right text-slate-700 font-bold">APPLY</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <FeedRow key={row.job.id} row={row} />
        ))}
      </div>

      {/* Load More Pagination */}
      {nextCursor && (
        <div className="flex justify-center p-4 border-t border-slate-200 bg-slate-50">
          <Button variant="secondary" size="sm" onClick={handleLoadMore}>
            Load more postings...
          </Button>
        </div>
      )}
    </div>
  );
}

