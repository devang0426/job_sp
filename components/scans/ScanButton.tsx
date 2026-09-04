"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ScanRunView } from "@/lib/db/scanRuns";

const POLL_MS = 1500;
const TERMINAL = new Set(["SUCCEEDED", "PARTIAL", "FAILED"]);

interface ScanButtonProps {
  /** An already-running scan to resume tracking on mount. */
  activeRunId?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function ScanButton({
  activeRunId = null,
  className,
  size = "sm",
}: ScanButtonProps) {
  const router = useRouter();
  const [runId, setRunId] = useState<string | null>(activeRunId);
  const [run, setRun] = useState<ScanRunView | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const lastProgressRef = useRef<{ jobs: number; evals: number; evalsCompleted: number }>({
    jobs: 0,
    evals: 0,
    evalsCompleted: 0,
  });

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/scan-runs/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json.error) return;
        const next = json.data as ScanRunView;
        setRun(next);

        // If new jobs or evaluations arrived in this tick, refresh feed immediately
        if (
          next.jobsFound !== lastProgressRef.current.jobs ||
          next.evaluationsQueued !== lastProgressRef.current.evals ||
          (next.evaluationsCompleted ?? 0) !== lastProgressRef.current.evalsCompleted
        ) {
          lastProgressRef.current = {
            jobs: next.jobsFound,
            evals: next.evaluationsQueued,
            evalsCompleted: next.evaluationsCompleted ?? 0,
          };
          router.refresh();
        }

        const scanDone = TERMINAL.has(next.status);
        const evalsDone = !next.evaluationsPending || next.evaluationsPending === 0;

        if (scanDone && evalsDone) {
          stopPolling();
          setRunId(null);
          router.refresh();
        }
      } catch {
        // transient — keep polling
      }
    },
    [router, stopPolling],
  );

  useEffect(() => {
    if (!runId) return;
    const id = runId;
    const kickoff = setTimeout(() => void poll(id), 0);
    pollRef.current = setInterval(() => void poll(id), POLL_MS);
    return () => {
      clearTimeout(kickoff);
      stopPolling();
    };
  }, [runId, poll, stopPolling]);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    setRun(null);
    try {
      const res = await fetch("/api/scans", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error?.message ?? "Couldn't start the scan.");
        return;
      }
      setRunId(json.data.id as string);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setStarting(false);
    }
  }, []);

  const busy = starting || Boolean(runId);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {busy && (
        <div className="flex items-center gap-2 border border-border-default bg-bg-surface px-2.5 py-1 text-data font-mono shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
          <span className="text-text-primary text-xs font-medium">
            {starting
              ? "Starting scan..."
              : run
                ? scanProgressLine(run)
                : "Queued..."}
          </span>
        </div>
      )}

      <Button
        variant={busy ? "subtle" : "accent"}
        size={size}
        onClick={start}
        disabled={busy}
        aria-label="Run a scan"
        className="gap-2"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-primary" />
        ) : (
          <Radar className="h-3.5 w-3.5 text-text-primary" strokeWidth={2} />
        )}
        <span>{busy ? "Scanning" : "Run scan"}</span>
      </Button>

      {error && (
        <p className="flex items-center gap-1.5 font-mono text-xs text-state-error">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function scanProgressLine(run: ScanRunView): string {
  if (run.status === "QUEUED") return "Queued in runner...";
  if (run.status === "RUNNING") {
    const found = run.jobsFound;
    if (found === 0) return "Pulling sources...";
    return `Found ${found} postings...`;
  }
  if (TERMINAL.has(run.status)) {
    if (run.evaluationsPending && run.evaluationsPending > 0) {
      const total =
        run.evaluationsQueued ||
        (run.evaluationsCompleted ?? 0) + run.evaluationsPending;
      return `AI evaluating (${run.evaluationsCompleted ?? 0}/${total})...`;
    }
    return `${run.jobsFound} scanned · ${run.evaluationsQueued} evaluated`;
  }
  return run.status.toLowerCase();
}

