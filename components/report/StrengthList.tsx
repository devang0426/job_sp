import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface StrengthItem {
  title?: string;
  detail?: string;
}

export interface StrengthListProps {
  strengths?: (StrengthItem | string)[] | null;
}

export function StrengthList({ strengths }: StrengthListProps) {
  if (!strengths || strengths.length === 0) {
    return (
      <div className="p-4 bg-bg-surface border border-border-default text-text-muted text-data font-mono shadow-2xs">
        No candidate strengths listed for this job.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Strengths
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Qualifications and achievements from your CV that directly satisfy role requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {strengths.map((item, idx) => {
          const title = typeof item === "string" ? item : item.title;
          const detail = typeof item === "string" ? null : item.detail;

          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-xs transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
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
          );
        })}
      </div>
    </div>
  );
}

