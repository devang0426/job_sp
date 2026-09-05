"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
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
  CheckCircle2,
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

  const isFailed = parseStatus === "FAILED" || !!parseError;
  const profile = structured;

  // Auto-poll if structuring is currently in progress
  useEffect(() => {
    if (!profile && !isFailed && onRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [profile, isFailed, onRefresh]);

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


  return (
    <div className="space-y-6 rounded-xl border border-border-default bg-bg-surface p-6 shadow-xs">
      {/* Header with Title and Re-parse Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-text-primary">
              Structured CV Profile
            </h3>
            {profile?.meta?.promptVersion && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {profile.meta.promptVersion}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Extracted skills, work roles, education, and verified experience depth used for job evaluation matching.
          </p>
        </div>

        <Button
          variant="secondary"
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold uppercase tracking-wider text-rose-900">
              CV Structuring Failed or Degraded
            </p>
            <p className="mt-1 text-rose-700 font-sans text-xs">
              {parseError || error || "Structuring returned an error. Job matching will continue using raw text."}
            </p>
          </div>
        </div>
      )}

      {/* Local Error Alert */}
      {error && !isFailed && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
          {error}
        </div>
      )}

      {!profile && !isFailed ? (
        <div className="py-10 text-center space-y-3 bg-bg-base rounded-xl border border-dashed border-border-default">
          <RefreshCw className="w-7 h-7 text-accent animate-spin mx-auto" />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              AI Structuring in progress...
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Extracting technical skills, career timeline, and domain experience.
            </p>
          </div>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Top Summary Badge (Total Experience) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-blue-50/60 border border-blue-200/70 rounded-lg p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  Verified Experience
                </span>
                <span className="text-sm font-mono font-bold text-text-primary">
                  {profile.totalYearsExperience !== null && profile.totalYearsExperience !== undefined
                    ? `${profile.totalYearsExperience} ${profile.totalYearsExperience === 1 ? "year" : "years"} professional depth`
                    : "Experience specified in role history"}
                </span>
              </div>
            </div>

            {profile.meta && (
              <div className="flex items-center gap-3 text-xs font-mono text-text-secondary tabular-nums">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-blue-100 shadow-xs">
                  <Coins className="w-3.5 h-3.5 text-accent" />
                  Cost: ${profile.meta.costUsd.toFixed(4)}
                </span>
                <span className="px-2 py-1 rounded bg-white border border-blue-100 shadow-xs">
                  {profile.meta.inputTokens + profile.meta.outputTokens} tokens
                </span>
              </div>
            )}
          </div>

          {/* Skills Chips */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Technical & Core Skills ({profile.skills?.length || 0})
              </h4>
            </div>
            {profile.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-3.5 rounded-lg bg-bg-base border border-border-default">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-white text-text-primary border border-border-strong shadow-2xs hover:border-accent transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-text-muted italic">
                No explicit skills extracted.
              </p>
            )}
          </div>

          {/* Work Roles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border-default pb-2">
              <Briefcase className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Work Experience Timeline ({profile.roles?.length || 0})
              </h4>
            </div>

            {profile.roles && profile.roles.length > 0 ? (
              <div className="space-y-3">
                {profile.roles.map((role, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border-default rounded-lg bg-bg-base hover:border-border-strong transition-all space-y-1.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-bold text-sm text-text-primary">
                        {role.title}{" "}
                        <span className="text-accent font-semibold">
                          @ {role.company}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium text-text-secondary bg-white px-2 py-0.5 rounded border border-border-default tabular-nums self-start sm:self-auto">
                        {role.start} — {role.end || "Present"}
                      </span>
                    </div>
                    {role.scopeSummary && (
                      <p className="text-xs text-text-secondary leading-relaxed pt-0.5">
                        {role.scopeSummary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-text-muted italic">
                No work roles extracted.
              </p>
            )}
          </div>

          {/* Education */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border-default pb-2">
              <GraduationCap className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Education & Credentials ({profile.education?.length || 0})
              </h4>
            </div>

            {profile.education && profile.education.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.education.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-border-default rounded-lg bg-bg-base space-y-1"
                  >
                    <div className="font-semibold text-xs text-text-primary">
                      {edu.qualification}
                    </div>
                    <div className="text-xs font-medium text-text-secondary flex justify-between">
                      <span>{edu.institution}</span>
                      {edu.year && (
                        <span className="font-mono text-text-muted tabular-nums">
                          {edu.year}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-text-muted italic">
                No educational qualifications extracted.
              </p>
            )}
          </div>

          {/* Prompt Metadata Footer */}
          {profile.meta && (
            <div className="pt-3 border-t border-border-subtle flex flex-wrap justify-between items-center text-[11px] font-mono text-text-muted gap-2">
              <span>AI Engine: <strong className="text-text-secondary">{profile.meta.model}</strong></span>
              <span>Prompt: <strong className="text-text-secondary">{profile.meta.promptVersion}</strong></span>
              <span>
                Tokens: {profile.meta.inputTokens} in / {profile.meta.outputTokens} out
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
