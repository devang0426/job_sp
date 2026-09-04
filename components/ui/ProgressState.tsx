"use client";

import React from "react";
import { Loader2, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { TriggerRunStatus } from "@/hooks/useRunStatus";

export interface ProgressStateProps {
  status: TriggerRunStatus | null;
  isPending: boolean;
  isFailed: boolean;
  isCompleted: boolean;
  attempts?: number;
  errorMessage?: string;
  onRetry?: () => void;
  label?: string;
  className?: string;
}

export function ProgressState({
  status,
  isPending,
  isFailed,
  isCompleted,
  attempts = 1,
  errorMessage,
  onRetry,
  label = "Processing background run...",
  className,
}: ProgressStateProps) {
  if (!status && !isPending && !isFailed && !isCompleted) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-none border font-mono text-data transition-colors",
        isPending && "bg-[var(--color-bg-surface)] border-[var(--color-border-default)] text-[var(--color-text-primary)]",
        isCompleted && "bg-[var(--color-bg-surface)] border-[var(--color-border-default)] text-[var(--color-text-primary)]",
        isFailed && "bg-[var(--color-bg-surface)] border-[var(--color-state-error)] text-[var(--color-state-error)]",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-[var(--color-text-secondary)]" />
        )}

        {isCompleted && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-state-success)]" />
        )}

        {isFailed && (
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-state-error)]" />
        )}

        <div className="truncate">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-wider uppercase font-mono">
              {isPending && (status ?? "RUNNING")}
              {isCompleted && "COMPLETED"}
              {isFailed && (status ?? "FAILED")}
            </span>

            {attempts > 1 && (
              <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                (Attempt {attempts})
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5 font-sans">
            {isFailed
              ? errorMessage || "Run failed to complete."
              : isCompleted
              ? "Background execution finished successfully."
              : label}
          </p>
        </div>
      </div>

      {isFailed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-xs font-mono tracking-wider uppercase rounded-none border border-[var(--color-state-error)] text-[var(--color-state-error)] hover:bg-[var(--color-state-error)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-state-error)] focus:ring-offset-2 transition-colors shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry run</span>
        </button>
      )}
    </div>
  );
}
