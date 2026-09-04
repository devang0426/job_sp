import { cn } from "@/lib/cn";

// Loading placeholder. The pulse is disabled under prefers-reduced-motion
// by the global rule in globals.css.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-sm bg-bg-raised", className)}
    />
  );
}
