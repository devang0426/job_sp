"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type TriggerRunStatus =
  | "QUEUED"
  | "WAITING_FOR_DEPLOY"
  | "EXECUTING"
  | "RETRYING_AFTER_FAILURE"
  | "COMPLETED"
  | "FAILED"
  | "CRASHED"
  | "CANCELED"
  | "SYSTEM_FAILURE"
  | "TIMED_OUT"
  | "EXPIRED"
  | string;

export interface RunStatusResult {
  runId: string | null;
  status: TriggerRunStatus | null;
  isPending: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  attempts: number;
  output: unknown | null;
  error: unknown | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface UseRunStatusOptions {
  pollIntervalMs?: number;
  enabled?: boolean;
  onComplete?: (output: unknown) => void;
  onError?: (error: unknown) => void;
}

const FAILED_STATUSES = [
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "TIMED_OUT",
  "EXPIRED",
];

const TERMINAL_STATUSES: Set<TriggerRunStatus> = new Set([
  "COMPLETED",
  "CANCELED",
  ...FAILED_STATUSES,
]);

interface RunData {
  status: TriggerRunStatus;
  output?: unknown;
  error?: unknown;
  attempts?: number;
}

/**
 * Follows one trigger.dev run to a terminal state.
 *
 * This is the third tier of the flow in `context/architecture.md`: the
 * route handler returned a run id immediately, the task is doing the
 * work, and this polls until it stops. Polling ends the moment the run
 * is terminal — a completed run costs nothing to keep on screen.
 */
export function useRunStatus(
  runId: string | null,
  options: UseRunStatusOptions = {},
): RunStatusResult {
  const { pollIntervalMs = 1000, enabled = true, onComplete, onError } = options;

  const [status, setStatus] = useState<TriggerRunStatus | null>(null);
  const [output, setOutput] = useState<unknown | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // A new run id means a new run: clear the last one's result during
  // render rather than in an effect, so nothing renders the old status
  // for a frame. This is React's documented "adjust state when a prop
  // changes" pattern.
  const [trackedRunId, setTrackedRunId] = useState<string | null>(runId);
  if (trackedRunId !== runId) {
    setTrackedRunId(runId);
    setStatus(null);
    setOutput(null);
    setError(null);
    setAttempts(0);
  }

  // Callbacks are captured in refs so a caller passing an inline arrow
  // does not restart polling on every render. Refs are written in an
  // effect, never during render.
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const isCompleted = status === "COMPLETED";
  const isFailed = status ? FAILED_STATUSES.includes(status) : false;
  const isPending = !!runId && !isCompleted && !isFailed;

  const applyRunData = useCallback((data: RunData) => {
    setStatus(data.status);
    setAttempts(data.attempts ?? 1);
    if (data.output !== undefined) setOutput(data.output);
    if (data.error !== undefined) setError(data.error);

    if (data.status === "COMPLETED") onCompleteRef.current?.(data.output);
    if (FAILED_STATUSES.includes(data.status)) onErrorRef.current?.(data.error);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!runId || !enabled) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) {
        // The dev noop sandbox reports through its own route.
        const fallback = await fetch(`/api/dev/noop?runId=${runId}`);
        if (!fallback.ok) {
          throw new Error(`Failed to fetch run status: ${res.statusText}`);
        }
        const fallbackJson = await fallback.json();
        if (fallbackJson.data) applyRunData(fallbackJson.data);
        return;
      }

      const json = await res.json();
      if (json.data) applyRunData(json.data);
    } catch (err) {
      console.error("Error checking run status:", err);
    } finally {
      setLoading(false);
    }
  }, [runId, enabled, applyRunData]);

  useEffect(() => {
    if (!runId || !enabled) return;
    if (status && TERMINAL_STATUSES.has(status)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Self-scheduling rather than setInterval: a slow response can never
    // stack a second request on top of the first.
    const poll = async () => {
      await fetchStatus();
      if (!cancelled) timer = setTimeout(poll, pollIntervalMs);
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId, enabled, status, pollIntervalMs, fetchStatus]);

  return {
    runId,
    status,
    isPending,
    isCompleted,
    isFailed,
    attempts,
    output,
    error,
    loading,
    refetch: fetchStatus,
  };
}
