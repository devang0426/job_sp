import { Skeleton } from "@/components/ui/Skeleton";

export default function ConsoleLoading() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-bg-base p-6 space-y-4">
      <div className="flex justify-between items-center pb-4 border-b border-border-default">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
