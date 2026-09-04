import React from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import { ShieldCheck, ShieldAlert, HelpCircle } from "lucide-react";

export interface SignalItem {
  signal: string;
  verdict: "pass" | "unclear" | "fail" | string;
}

export interface LegitimacyPanelProps {
  legitimacyTier?: string | null;
  signals?: SignalItem[] | Record<string, unknown> | null;
}

const DEFAULT_SIGNALS = [
  "Named hiring company",
  "Salary band disclosed",
  "Apply URL on company domain / known ATS",
  "No pay-to-work or upfront costs",
  "Requirement list is realistic",
  "Posting age is identifiable",
];

export function LegitimacyPanel({
  legitimacyTier,
  signals,
}: LegitimacyPanelProps) {
  const tier = legitimacyTier || "UNVERIFIED";

  // Normalize signals to list of { signal, verdict }
  let signalList: SignalItem[] = [];

  if (Array.isArray(signals)) {
    signalList = signals;
  } else if (signals && typeof signals === "object") {
    signalList = Object.entries(signals).map(([key, val]) => ({
      signal: key.replace(/([A-Z])/g, " $1").toLowerCase(),
      verdict: val === true ? "pass" : val === false ? "fail" : "unclear",
    }));
  }

  // Ensure all 6 canonical signals are present or fallback to defaults
  if (signalList.length === 0) {
    signalList = DEFAULT_SIGNALS.map((name) => ({
      signal: name,
      verdict: tier === "VERIFIED" ? "pass" : tier === "SUSPICIOUS" ? "fail" : "unclear",
    }));
  }

  const getVerdictChip = (verdict: string) => {
    const v = verdict.toLowerCase();
    switch (v) {
      case "pass":
        return (
          <StatusChip tone="success" className="gap-1 font-semibold">
            <ShieldCheck className="h-3 w-3" /> PASS
          </StatusChip>
        );
      case "fail":
        return (
          <StatusChip tone="error" className="gap-1 font-semibold">
            <ShieldAlert className="h-3 w-3" /> FAIL
          </StatusChip>
        );
      default:
        return (
          <StatusChip tone="neutral" className="gap-1 font-medium">
            <HelpCircle className="h-3 w-3" /> UNCLEAR
          </StatusChip>
        );
    }
  };

  const getTierTone = (t: string): "success" | "neutral" | "consider" | "error" => {
    const lower = t.toLowerCase();
    if (lower === "verified") return "success";
    if (lower === "likely_legitimate") return "neutral";
    if (lower === "unverified") return "consider";
    return "error";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Legitimacy Screen
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Automated verification screening against ghost jobs, phishing, and scam postings.
          </p>
        </div>
        <StatusChip tone={getTierTone(tier)}>
          {tier.replace("_", " ")}
        </StatusChip>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {signalList.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
          >
            <span className="text-xs text-slate-800 capitalize font-medium">
              {item.signal}
            </span>
            <div className="shrink-0">{getVerdictChip(item.verdict)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

