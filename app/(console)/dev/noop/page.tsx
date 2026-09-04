"use client";

import React, { useState } from "react";
import { useRunStatus } from "@/hooks/useRunStatus";
import { ProgressState } from "@/components/ui/ProgressState";
import { Button } from "@/components/ui/Button";
import { Play, AlertOctagon, Repeat, Database } from "lucide-react";

export default function DevNoopPage() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [triggerCount, setTriggerCount] = useState<number>(0);
  const [triggerLog, setTriggerLog] = useState<string[]>([]);
  const [lastPayload, setLastPayload] = useState<{ recordId?: string; shouldFail?: boolean }>({});

  const {
    status,
    isPending,
    isCompleted,
    isFailed,
    attempts,
    output,
    error,
  } = useRunStatus(activeRunId, {
    pollIntervalMs: 1000,
  });

  const logMessage = (msg: string) => {
    setTriggerLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const triggerNoop = async (options: {
    shouldFail?: boolean;
    useIdempotency?: boolean;
    useDbRecord?: boolean;
  }) => {
    const key = options.useIdempotency ? idempotencyKey || "demo-idempotency-key" : undefined;
    const recordId = options.useDbRecord ? "dev-record-123" : undefined;
    setLastPayload({ recordId, shouldFail: options.shouldFail });

    logMessage(
      `Triggering POST /api/dev/noop (shouldFail=${!!options.shouldFail}, idempotencyKey=${key || "none"})`
    );

    try {
      const res = await fetch("/api/dev/noop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shouldFail: options.shouldFail,
          idempotencyKey: key,
          recordId,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        logMessage(`Trigger failed: ${json.error?.message || "Unknown error"}`);
        return;
      }

      const runId = json.data.runId;
      setActiveRunId(runId);
      setTriggerCount((c) => c + 1);
      logMessage(`Run triggered successfully! Run ID: ${runId}`);
    } catch (err) {
      logMessage(`Request error: ${String(err)}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="eyebrow">Developer Sandbox</span>
        <h1 className="heading text-xl text-[var(--text-primary)]">
          Feature 07 — Background Jobs (trigger.dev)
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Prove the three-tier background pipeline with a non-expensive NOOP task, mono progress state, retry controls, and DB access.
        </p>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="default"
          onClick={() => triggerNoop({ shouldFail: false })}
          disabled={isPending}
          className="w-full justify-center"
        >
          <Play className="h-4 w-4 mr-2" />
          Standard Run (3s)
        </Button>

        <Button
          variant="danger"
          onClick={() => triggerNoop({ shouldFail: true })}
          disabled={isPending}
          className="w-full justify-center"
        >
          <AlertOctagon className="h-4 w-4 mr-2" />
          Failure Run (Retry)
        </Button>

        <Button
          variant="ghost"
          onClick={() => triggerNoop({ shouldFail: false, useIdempotency: true })}
          disabled={isPending}
          className="w-full justify-center border border-[var(--border-default)]"
        >
          <Repeat className="h-4 w-4 mr-2" />
          Idempotent Trigger
        </Button>

        <Button
          variant="ghost"
          onClick={() => triggerNoop({ shouldFail: false, useDbRecord: true })}
          disabled={isPending}
          className="w-full justify-center border border-[var(--border-default)]"
        >
          <Database className="h-4 w-4 mr-2" />
          DB Connectivity Run
        </Button>
      </div>

      {/* Idempotency key input */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded space-y-2">
        <label className="eyebrow block">Idempotency Key (Optional)</label>
        <input
          type="text"
          value={idempotencyKey}
          onChange={(e) => setIdempotencyKey(e.target.value)}
          placeholder="demo-idempotency-key"
          className="w-full px-3 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-sm font-mono text-data text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--text-primary)]"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Triggering twice with the exact same idempotency key returns the existing run ID rather than spawning a duplicate run.
        </p>
      </div>

      {/* Live Run Status & UI States */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-condensed font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">
            Live Run Status Component
          </h2>
          <span className="font-mono text-data text-xs text-[var(--text-muted)]">
            Total Triggers: {triggerCount}
          </span>
        </div>

        {activeRunId ? (
          <ProgressState
            status={status}
            isPending={isPending}
            isCompleted={isCompleted}
            isFailed={isFailed}
            attempts={attempts}
            errorMessage={
              typeof error === "object" && error !== null && "message" in error
                ? String((error as { message?: string }).message)
                : "Simulated background run failure."
            }
            onRetry={() => triggerNoop({ shouldFail: false, ...lastPayload })}
            label="Sleeping 3 seconds in trigger.dev environment..."
          />
        ) : (
          <div className="p-4 rounded border border-dashed border-[var(--border-default)] text-center text-xs text-[var(--text-muted)] font-mono">
            No active run. Click one of the buttons above to test execution.
          </div>
        )}

        {/* Output & Debug Details */}
        {(output !== undefined || error !== undefined) && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-2 font-mono text-xs">
            <span className="eyebrow block">Task Output / Result</span>
            <pre className="p-3 bg-[var(--bg-base)] border border-[var(--border-default)] rounded overflow-x-auto text-[var(--text-primary)]">
              {JSON.stringify(output || error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded space-y-2">
        <h2 className="font-condensed font-semibold text-xs tracking-wider uppercase text-[var(--text-secondary)]">
          Activity Log
        </h2>
        <div className="p-3 bg-[var(--bg-base)] border border-[var(--border-default)] rounded max-h-48 overflow-y-auto font-mono text-data text-xs space-y-1">
          {triggerLog.length === 0 ? (
            <span className="text-[var(--text-muted)]">No activity logged yet.</span>
          ) : (
            triggerLog.map((log, idx) => (
              <div key={idx} className="text-[var(--text-secondary)]">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
