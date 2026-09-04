"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { StructuredResumePayload } from "@/lib/ai/structureResume";
import { errorMessage } from "@/lib/artifacts";
import {
  Sparkles,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Award,
  AlertTriangle,
  Coins,
} from "lucide-react";

interface ResumeProfileProps {
  resumeId: string;
  structured?: StructuredResumePayload | null;
  parseStatus?: "PARSED" | "EMPTY" | "FAILED";
  parseError?: string | null;
  onRefresh?: () => void;
}

export function ResumeProfile({
  resumeId,
  structured,
  parseStatus = "PARSED",
  parseError,
  onRefresh,
}: ResumeProfileProps) {
  const [reparsing, setReparsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReparse = async () => {
    setReparsing(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/structure`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error?.message || "Failed to re-parse CV.");
      } else {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Error re-parsing resume:", err);
      setError(
        errorMessage(err, "Couldn't re-read that CV. Try again in a moment."),
      );
    } finally {
      setReparsing(false);
    }
  };

  const isFailed = parseStatus === "FAILED" || !!parseError;
  const profile = structured;

  return (
    <div className="space-y-6 border border-[var(--color-border-default)] p-6 bg-black/20">
      {/* Header with Title and Re-parse Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-default)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Structured CV Profile
            </h3>
            {profile?.meta?.promptVersion && (
              <StatusChip tone="neutral">
                {profile.meta.promptVersion}
              </StatusChip>
            )}
          </div>
          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
            Extracted skills, work roles, education, and verified experience depth.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={reparsing}
          onClick={handleReparse}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${reparsing ? "animate-spin" : ""}`} />
          {reparsing ? "Structuring..." : "Re-parse CV"}
        </Button>
      </div>

      {/* Failure Banner */}
      {isFailed && (
        <div className="p-4 bg-state-error/10 border border-state-error/40 text-state-error text-xs font-mono flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold uppercase tracking-wider">
              CV Structuring Failed or Degraded
            </p>
            <p className="mt-1 text-[var(--color-text-muted)] font-sans text-sm">
              {parseError || error || "Structuring returned an error or unparseable schema format. Job matching will continue using raw text."}
            </p>
          </div>
        </div>
      )}

      {/* Local Error Alert */}
      {error && !isFailed && (
        <div className="p-3 bg-state-error/10 border border-state-error/40 text-state-error text-xs font-mono">
          {error}
        </div>
      )}

      {!profile && !isFailed ? (
        <div className="py-8 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[var(--color-text-muted)] animate-spin mx-auto" />
          <p className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
            AI Structuring in progress...
          </p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Top Summary Badge (Total Experience) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-accent)]/5 border border-[var(--color-border-default)] p-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                Relevant Experience:
              </span>
              <span className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                {profile.totalYearsExperience !== null && profile.totalYearsExperience !== undefined
                  ? `${profile.totalYearsExperience} ${profile.totalYearsExperience === 1 ? "year" : "years"}`
                  : "Not Specified (null)"}
              </span>
            </div>

            {profile.meta && (
              <div className="flex items-center gap-3 text-xs font-mono text-[var(--color-text-muted)] tabular-nums">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-accent-muted" />
                  Cost: ${profile.meta.costUsd.toFixed(4)}
                </span>
                <span>•</span>
                <span>{profile.meta.inputTokens + profile.meta.outputTokens} tokens</span>
              </div>
            )}
          </div>

          {/* Skills Chips */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
              Explicit Skills ({profile.skills?.length || 0})
            </h4>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill, idx) => (
                  <StatusChip key={idx} tone="neutral">
                    {skill}
                  </StatusChip>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-[var(--color-text-muted)] italic">
                No explicit skills extracted.
              </p>
            )}
          </div>

          {/* Work Roles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-1.5">
              <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                Work Experience ({profile.roles?.length || 0})
              </h4>
            </div>

            {profile.roles && profile.roles.length > 0 ? (
              <div className="space-y-3">
                {profile.roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-[var(--color-border-default)] bg-black/40 space-y-1"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                        {role.title} <span className="text-[var(--color-text-muted)] font-normal">at {role.company}</span>
                      </div>
                      <span className="text-xs font-mono text-[var(--color-text-muted)] tabular-nums">
                        {role.start} — {role.end || "Present"}
                      </span>
                    </div>
                    {role.scopeSummary && (
                      <p className="text-xs text-[var(--color-text-muted)] font-sans">
                        {role.scopeSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-[var(--color-text-muted)] italic">
                No work roles extracted.
              </p>
            )}
          </div>

          {/* Education */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-1.5">
              <GraduationCap className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                Education & Credentials ({profile.education?.length || 0})
              </h4>
            </div>

            {profile.education && profile.education.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-[var(--color-border-default)] bg-black/40 space-y-1"
                  >
                    <div className="font-medium text-xs text-[var(--color-text-primary)]">
                      {edu.qualification}
                    </div>
                    <div className="text-xs font-mono text-[var(--color-text-muted)] flex justify-between">
                      <span>{edu.institution}</span>
                      {edu.year && <span className="tabular-nums">{edu.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-[var(--color-text-muted)] italic">
                No educational qualifications extracted.
              </p>
            )}
          </div>

          {/* Prompt Metadata Footer */}
          {profile.meta && (
            <div className="pt-2 border-t border-[var(--color-border-default)] flex flex-wrap justify-between items-center text-[10px] font-mono text-[var(--color-text-muted)]">
              <span>Model: {profile.meta.model}</span>
              <span>Prompt Version: {profile.meta.promptVersion}</span>
              <span>
                Tokens: {profile.meta.inputTokens} in / {profile.meta.outputTokens} out / {profile.meta.cachedTokens} cached
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
