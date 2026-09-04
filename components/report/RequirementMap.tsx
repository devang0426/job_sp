import React from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { AlertTriangle } from "lucide-react";

export interface RequirementMapItem {
  requirement?: string;
  text?: string;
  importance: "critical" | "important" | "nice_to_have" | "CRITICAL" | "HIGH" | "MEDIUM" | string;
  evidence?: "stated" | "structural" | "inferred" | "none" | string;
  met?: boolean;
  note?: string;
}

export interface RequirementMapProps {
  requirements?: RequirementMapItem[] | null;
}

export function RequirementMap({ requirements }: RequirementMapProps) {
  if (!requirements || requirements.length === 0) {
    return (
      <div className="p-4 bg-bg-surface border border-border-default text-text-muted text-data font-mono">
        No structured requirements evaluated for this posting.
      </div>
    );
  }

  type ImportanceTier = "critical" | "important" | "nice_to_have";
  type EvidenceTier = "stated" | "structural" | "inferred" | "none";

  // Normalize requirements shape
  const items: Array<{
    requirement: string;
    importance: ImportanceTier;
    evidence: EvidenceTier;
    note: string;
    isCappedDanger: boolean;
  }> = requirements.map((r) => {
    const reqText = r.requirement || r.text || "Unspecified requirement";
    const rawImportance = (r.importance || "important").toLowerCase();
    const importance: ImportanceTier =
      rawImportance === "critical"
        ? "critical"
        : rawImportance === "nice_to_have"
        ? "nice_to_have"
        : "important";

    // Handle evidence tier or fallback from seed met flag
    let evidence: EvidenceTier = "none";
    if (r.evidence) {
      const lowerEv = r.evidence.toLowerCase();
      if (lowerEv === "stated" || lowerEv === "structural" || lowerEv === "inferred" || lowerEv === "none") {
        evidence = lowerEv as EvidenceTier;
      }
    } else if (typeof r.met === "boolean") {
      evidence = r.met ? "stated" : "none";
    }

    const note = r.note || (evidence === "none" ? "No evidence found on candidate CV." : "Candidate CV provides evidence.");

    return {
      requirement: reqText,
      importance,
      evidence,
      note,
      isCappedDanger: importance === "critical" && (evidence === "inferred" || evidence === "none"),
    };
  });

  // Sort critical first, then important, then nice_to_have
  const importanceRank: Record<ImportanceTier, number> = {
    critical: 0,
    important: 1,
    nice_to_have: 2,
  };
  items.sort((a, b) => importanceRank[a.importance] - importanceRank[b.importance]);

  const getImportanceChip = (imp: ImportanceTier) => {
    switch (imp) {
      case "critical":
        return <StatusChip tone="apply">CRITICAL</StatusChip>;
      case "important":
        return <StatusChip tone="consider">IMPORTANT</StatusChip>;
      case "nice_to_have":
        return <StatusChip tone="neutral">NICE TO HAVE</StatusChip>;
    }
  };

  const getEvidenceChip = (ev: EvidenceTier) => {
    switch (ev) {
      case "stated":
        return <StatusChip tone="success">STATED</StatusChip>;
      case "structural":
        return <StatusChip tone="neutral">STRUCTURAL</StatusChip>;
      case "inferred":
        return <StatusChip tone="warning">INFERRED</StatusChip>;
      case "none":
        return <StatusChip tone="error">NONE</StatusChip>;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Requirement → Evidence Map
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Evaluated against your active CV. Critical prerequisites sorted first.
          </p>
        </div>
      </div>

      {/* Responsive Horizontal Container with Own Scroll */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3 px-4 font-bold text-slate-700">REQUIREMENT</th>
              <th className="py-3 px-3 font-bold text-slate-700 w-[130px]">IMPORTANCE</th>
              <th className="py-3 px-3 font-bold text-slate-700 w-[130px]">EVIDENCE</th>
              <th className="py-3 px-4 font-bold text-slate-700 min-w-[240px]">EVIDENCE NOTE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr
                key={idx}
                className={`transition-colors ${
                  item.isCappedDanger
                    ? "bg-rose-50/50 hover:bg-rose-50 border-l-2 border-l-rose-500"
                    : "hover:bg-slate-50/70"
                }`}
              >
                {/* Requirement with wrapping text */}
                <td className="py-3.5 px-4 text-slate-900 align-top">
                  <div className="flex items-start gap-2">
                    {item.isCappedDanger && (
                      <span title="Critical requirement lacking evidence caps overall score.">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      </span>
                    )}
                    <span className="leading-snug font-medium">{item.requirement}</span>
                  </div>
                </td>

                {/* Importance Chip */}
                <td className="py-3.5 px-3 align-top whitespace-nowrap">
                  {getImportanceChip(item.importance)}
                </td>

                {/* Evidence Chip */}
                <td className="py-3.5 px-3 align-top whitespace-nowrap">
                  {getEvidenceChip(item.evidence)}
                </td>

                {/* Evidence Note */}
                <td className="py-3.5 px-4 text-xs text-slate-600 leading-relaxed align-top">
                  {item.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

