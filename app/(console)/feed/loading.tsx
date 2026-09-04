import { Skeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-bg-base text-text-primary">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Filter bar placeholder */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-default px-4 py-2.5 bg-bg-surface">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[1020px]">
          {/* Table Header */}
          <div className="grid grid-cols-[140px_160px_1fr_150px_90px_110px_110px_90px] items-center gap-3 border-b border-border-default bg-bg-base px-4 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12 ml-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>

          {/* Skeleton rows */}
          <div className="divide-y divide-border-default/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[140px_160px_1fr_150px_90px_110px_110px_90px] items-center gap-3 px-4 py-3 bg-bg-surface/50"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-5 w-16 mx-auto" />
                <Skeleton className="h-5 w-16 mx-auto" />
                <Skeleton className="h-6 w-14 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
