import React from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { AlertCircle } from "lucide-react";

export interface GapItem {
  title?: string;
  detail?: string;
  severity?: "blocking" | "significant" | "minor" | string;
}

export interface GapListProps {
  gaps?: (GapItem | string)[] | null;
}

export function GapList({ gaps }: GapListProps) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="p-4 bg-bg-surface border border-border-default text-text-muted text-data font-mono shadow-2xs">
        No significant qualification gaps identified.
      </div>
    );
  }

  const getSeverityChip = (severity?: string) => {
    const s = (severity || "minor").toLowerCase();
    switch (s) {
      case "blocking":
        return <StatusChip tone="error">BLOCKING</StatusChip>;
      case "significant":
        return <StatusChip tone="warning">SIGNIFICANT</StatusChip>;
      default:
        return <StatusChip tone="neutral">MINOR</StatusChip>;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Gaps & Severity
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Missing credentials, experiences, or seniority requirements to address or bridge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {gaps.map((item, idx) => {
          const title = typeof item === "string" ? item : item.title;
          const detail = typeof item === "string" ? null : item.detail;
          const severity = typeof item === "string" ? "minor" : item.severity;

          return (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-colors"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-semibold text-slate-900 leading-snug">
                    {title}
                  </span>
                  {detail && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {detail}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0">{getSeverityChip(severity)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

