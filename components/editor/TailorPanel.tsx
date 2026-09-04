"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, RotateCcw, AlertTriangle, ExternalLink, ShieldAlert, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressState } from "@/components/ui/ProgressState";
import { useRunStatus } from "@/hooks/useRunStatus";
import { StatusChip } from "@/components/ui/StatusChip";
import { errorMessage, type ArtifactView } from "@/lib/artifacts";

/** A gap as the evaluation recorded it. Older rows carry fewer fields. */
export interface MatchGap {
  title?: string;
  gap?: string;
  description?: string;
  detail?: string;
  severity?: string;
}

/** A CV tip as the evaluation recorded it. */
export interface MatchCvTip {
  targetSection?: string;
  change?: string;
  reason?: string;
}

export interface TailorPanelProps {
  matchId: string;
  initialArtifact?: ArtifactView | null;
  match: {
    id: string;
    score?: number | null;
    recommendation?: string | null;
    summary?: string | null;
    gaps?: MatchGap[] | null;
    cvTips?: MatchCvTip[] | null;
    requirements?: unknown[] | null;
    job: {
      id: string;
      title: string;
      company: string;
      location?: string | null;
      isRemote?: boolean;
      applyUrl?: string | null;
      descriptionText?: string | null;
    };
  };
  onArtifactChange?: (artifact: ArtifactView) => void;
}

interface SuggestionItem {
  id?: string;
  targetSection: string;
  currentText: string;
  proposedRewrite: string;
  requirementAddressed: string;
}

interface UnaddressableItem {
  requirement: string;
  reason: string;
}

export function TailorPanel({
  matchId,
  initialArtifact,
  match,
  onArtifactChange,
}: TailorPanelProps) {
  const [artifact, setArtifact] = useState<ArtifactView | null>(initialArtifact || null);

  // Parse structured data from content or editedContent
  const parseArtifactData = (art: ArtifactView | null | undefined) => {
    if (!art) {
      return {
        suggestions: [] as SuggestionItem[],
        unaddressable: [] as UnaddressableItem[],
        summaryAdvice: "",
      };
    }

    try {
      const sourceStr = art.editedContent || art.content;
      if (!sourceStr) return { suggestions: [], unaddressable: [], summaryAdvice: "" };
      const parsed = JSON.parse(sourceStr);
      return {
        suggestions: (parsed.suggestions || []) as SuggestionItem[],
        unaddressable: (parsed.unaddressableRequirements || []) as UnaddressableItem[],
        summaryAdvice: parsed.summaryAdvice || "",
      };
    } catch {
      return {
        suggestions: [],
        unaddressable: [],
        summaryAdvice: "",
      };
    }
  };

  const initialData = parseArtifactData(initialArtifact);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(initialData.suggestions);
  const [unaddressable, setUnaddressable] = useState<UnaddressableItem[]>(initialData.unaddressable);
  const [summaryAdvice, setSummaryAdvice] = useState<string>(initialData.summaryAdvice);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [copiedSectionIndex, setCopiedSectionIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  // Regenerated guidance arrives as a new `initialArtifact`. Adopt it
  // during render rather than in an effect, so the panel never shows the
  // previous set of rewrites for a frame.
  const [adoptedArtifact, setAdoptedArtifact] = useState(initialArtifact);
  if (initialArtifact && adoptedArtifact !== initialArtifact) {
    setAdoptedArtifact(initialArtifact);
    setArtifact(initialArtifact);
    const parsed = parseArtifactData(initialArtifact);
    setSuggestions(parsed.suggestions);
    setUnaddressable(parsed.unaddressable);
    setSummaryAdvice(parsed.summaryAdvice);
  }

  // Hook into Trigger.dev run status polling if async
  const { isPending } = useRunStatus(runId, {
    enabled: !!runId,
    onComplete: (data: unknown) => {
      setIsGenerating(false);
      setRunId(null);
      const generated = (data as { artifact?: ArtifactView } | null)?.artifact;
      if (generated) {
        setArtifact(generated);
        const parsed = parseArtifactData(generated);
        setSuggestions(parsed.suggestions);
        setUnaddressable(parsed.unaddressable);
        setSummaryAdvice(parsed.summaryAdvice);
        if (onArtifactChange) onArtifactChange(generated);
      }
    },
    onError: (err: unknown) => {
      setIsGenerating(false);
      setRunId(null);
      setGenerateError(
        errorMessage(
          err,
          "The tailoring task failed. Try generating the rewrites again.",
        ),
      );
    },
  });

  // Check if user made modifications compared to generated original
  const hasUserEdited = Boolean(
    artifact &&
      (artifact.editedContent !== null && artifact.editedContent !== undefined)
  );

  // Handle section text change
  const handleRewriteChange = (index: number, newRewrite: string) => {
    setSuggestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], proposedRewrite: newRewrite };
      return next;
    });
  };

  // Trigger CV tailoring generation
  const handleGenerateTailoring = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ async: true }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to generate CV tailoring");
      }

      if (json.data.isAsync && json.data.runId) {
        setRunId(json.data.runId);
      } else if (json.data.artifact) {
        const newArt = json.data.artifact;
        setArtifact(newArt);
        const parsed = parseArtifactData(newArt);
        setSuggestions(parsed.suggestions);
        setUnaddressable(parsed.unaddressable);
        setSummaryAdvice(parsed.summaryAdvice);
        setIsGenerating(false);
        if (onArtifactChange) onArtifactChange(newArt);
      }
    } catch (err) {
      setIsGenerating(false);
      setGenerateError(
        errorMessage(err, "Couldn't generate the rewrites. Try again in a moment."),
      );
    }
  };

  // Save current edits into artifact.editedContent
  const handleSaveEdits = async () => {
    if (!artifact) return;
    setIsSaving(true);
    try {
      const payload = {
        suggestions,
        unaddressableRequirements: unaddressable,
        summaryAdvice,
      };

      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedContent: JSON.stringify(payload, null, 2),
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setArtifact(json.data);
        if (onArtifactChange) onArtifactChange(json.data);
      }
    } catch (err) {
      console.error("Failed to save tailoring edits:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Revert back to original Claude / Gemini generation
  const handleRevert = async () => {
    if (!artifact) return;
    setIsReverting(true);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revert: true }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setArtifact(json.data);
        const parsed = parseArtifactData(json.data);
        setSuggestions(parsed.suggestions);
        setUnaddressable(parsed.unaddressable);
        setSummaryAdvice(parsed.summaryAdvice);
        if (onArtifactChange) onArtifactChange(json.data);
      }
    } catch (err) {
      console.error("Failed to revert tailoring:", err);
    } finally {
      setIsReverting(false);
    }
  };

  // Copy single section to clipboard
  const handleCopySection = async (index: number) => {
    const item = suggestions[index];
    if (!item) return;
    const textToCopy = `[${item.targetSection}]\n${item.proposedRewrite}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedSectionIndex(index);
      setTimeout(() => setCopiedSectionIndex(null), 2500);
    } catch (err) {
      console.error("Failed to copy section:", err);
    }
  };

  // Copy all sections formatted
  const handleCopyAll = async () => {
    const sectionsText = suggestions
      .map(
        (s) =>
          `=== SECTION: ${s.targetSection} ===\nTarget Requirement: ${s.requirementAddressed}\n\n${s.proposedRewrite}\n`
      )
      .join("\n\n");

    const fullText = `# CV TAILORING FOR ${match.job.title.toUpperCase()} AT ${match.job.company.toUpperCase()}\n\n${sectionsText}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);

      // Auto-save pending changes if artifact exists
      if (artifact) {
        handleSaveEdits();
      }
    } catch (err) {
      console.error("Failed to copy all sections:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Main Two-Pane Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-border-default">
        {/* Left Pane: Source Job & Match Context */}
        <div className="lg:col-span-5 p-6 flex flex-col gap-6 overflow-y-auto bg-bg-surface">
          <div>
            <span className="eyebrow block text-text-muted mb-1">
              Target Posting & Match Context
            </span>
            <h2 className="heading text-heading text-text-primary">
              {match.job.title}
            </h2>
            <p className="text-body text-text-secondary font-medium">
              {match.job.company}
            </p>
          </div>

          {/* Score & Verdict Card */}
          <div className="border border-border-default bg-bg-base p-4 space-y-3 font-mono text-data">
            <div className="flex justify-between items-center py-1 border-b border-border-default">
              <span className="text-text-muted">Match score</span>
              <div className="flex items-center gap-2">
                <span className="text-text-primary font-bold tabular-nums">
                  {typeof match.score === "number" ? match.score : "--"}/100
                </span>
                {match.recommendation && (
                  <StatusChip tone={(match.score ?? 0) >= 75 ? "apply" : (match.score ?? 0) >= 50 ? "consider" : "skip"}>
                    {match.recommendation}
                  </StatusChip>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-text-muted">Location</span>
              <span className="text-text-primary">
                {match.job.location || (match.job.isRemote ? "Remote" : "Unspecified")}
              </span>
            </div>

            {match.job.applyUrl && (
              <div className="pt-2 border-t border-border-default">
                <a
                  href={match.job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary underline"
                >
                  View original posting <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Identified Evaluation Gaps (Reused from Match) */}
          <div className="border border-border-default bg-bg-base p-4 space-y-3">
            <span className="eyebrow block text-text-muted">
              Gaps from the match report
            </span>
            {match.gaps && match.gaps.length > 0 ? (
              <div className="space-y-2">
                {match.gaps.map((g, i) => {
                  const severity =
                    typeof g === "object" ? g.severity ?? "significant" : "significant";
                  const desc =
                    typeof g === "object" ? g.gap ?? g.description ?? g.title : g;
                  return (
                    <div
                      key={i}
                      className="p-2.5 bg-bg-surface border border-border-default flex items-start gap-2 text-data"
                    >
                      <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border-default uppercase font-semibold text-text-muted shrink-0 mt-0.5">
                        {severity}
                      </span>
                      <span className="text-text-secondary leading-snug">{desc}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-data text-text-muted font-mono">
                No blocking or critical gaps recorded.
              </p>
            )}
          </div>

          {/* CV Improvement Tips from Match report */}
          {match.cvTips && match.cvTips.length > 0 && (
            <div className="border border-border-default bg-bg-base p-4 space-y-3">
              <span className="eyebrow block text-text-muted">
                CV tips from the match report
              </span>
              <div className="space-y-2">
                {match.cvTips.map((tip, i) => {
                  const section =
                    typeof tip === "object" ? tip.targetSection ?? "General" : "General";
                  const change = typeof tip === "object" ? tip.change : tip;
                  return (
                    <div key={i} className="text-data font-sans text-text-secondary leading-relaxed">
                      <span className="font-mono text-xs font-semibold text-text-primary mr-1.5">
                        [{section}]
                      </span>
                      {change}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tailoring Generator Button */}
          <div className="border border-border-default bg-bg-base p-4 space-y-3">
            <span className="eyebrow block text-text-muted">
              Tailoring Generation
            </span>
            <p className="text-data text-text-secondary">
              Grounded in the CV text, job requirements, and match gaps. Never invents experience.
            </p>

            <Button
              variant="default"
              onClick={handleGenerateTailoring}
              disabled={isGenerating || isPending}
              className="w-full"
            >
              {isGenerating || isPending ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
                  Tailoring CV guidance...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  {artifact ? "Regenerate CV tailoring" : "Generate CV tailoring"}
                </span>
              )}
            </Button>

            {generateError && (
              <div className="p-3 bg-[var(--color-state-error)]/10 border border-[var(--color-state-error)] text-[var(--color-state-error)] text-data flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Section Rewrites & Editable Guidance */}
        <div className="lg:col-span-7 flex flex-col h-full bg-bg-base overflow-y-auto">
          {/* Header & Meta Bar */}
          <div className="p-6 border-b border-border-default flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-bg-base/95 backdrop-blur z-10">
            <div className="flex items-center gap-2">
              <span className="eyebrow text-text-muted">Tailoring suggestions</span>
              {artifact?.promptVersion && (
                <span className="font-mono text-label text-text-muted px-1.5 py-0.5 border border-border-default">
                  {artifact.promptVersion}
                </span>
              )}
              {artifact?.costUsd && (
                <span className="font-mono text-label text-text-muted px-1.5 py-0.5 border border-border-default tabular-nums">
                  ${Number(artifact.costUsd).toFixed(4)}
                </span>
              )}
              {suggestions.length > 0 && (
                <span className="font-mono text-label text-text-secondary">
                  {suggestions.length} {suggestions.length === 1 ? "section" : "sections"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasUserEdited && (
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={isReverting}
                  className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-label uppercase underline transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert edits
                </button>
              )}

              {suggestions.length > 0 && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-1.5"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-text-primary" />
                      Copied all
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-text-primary" />
                      Copy all rewrites
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Suggestions Body */}
          <div className="p-6 flex-1 flex flex-col gap-6">
            {isGenerating || isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                <ProgressState
                  status="RUNNING"
                  isPending={true}
                  isFailed={false}
                  isCompleted={false}
                  label="Generating truthful section rewrites and honest gap audit..."
                />
                <p className="font-mono text-data text-text-muted text-center max-w-md">
                  Surfacing candidate&apos;s real experience without fabricating claims. Flagging unaddressable requirements.
                </p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex-1 border border-dashed border-border-default flex flex-col items-center justify-center p-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-text-muted opacity-60" />
                <h3 className="heading text-heading text-text-primary">
                  No tailoring generated yet
                </h3>
                <p className="text-body text-text-secondary max-w-md">
                  Click &ldquo;Generate CV tailoring&rdquo; on the left to produce concrete, section-by-section rewrites grounded in your CV and the role requirements.
                </p>
              </div>
            ) : (
              <>
                {/* Summary Advice Callout if present */}
                {summaryAdvice && (
                  <div className="p-4 bg-bg-surface border border-border-default flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                    <div>
                      <span className="eyebrow block text-text-muted mb-0.5">Positioning strategy</span>
                      <p className="text-data text-text-primary font-sans leading-relaxed">
                        {summaryAdvice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Honesty Defense: Unaddressable Requirements Block */}
                {unaddressable.length > 0 && (
                  <div className="p-5 border border-border-strong bg-bg-surface flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-text-primary">
                      <ShieldAlert className="w-4 h-4 text-[var(--color-accent)]" />
                      <span className="eyebrow text-text-primary font-semibold">
                        Unaddressable Requirements ({unaddressable.length})
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-sans">
                      These requirements cannot be honestly satisfied by rewriting because your CV does not claim this experience. Papering over them in rewriting is dishonest and risks failing technical interviews.
                    </p>

                    <div className="space-y-2 mt-1">
                      {unaddressable.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-bg-base border border-border-default flex flex-col gap-1"
                        >
                          <span className="font-mono text-xs font-semibold text-text-primary">
                            • {item.requirement}
                          </span>
                          <span className="text-data text-text-secondary pl-3">
                            {item.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Rewrite Cards */}
                <div className="space-y-6">
                  {suggestions.map((suggestion, idx) => {
                    const isCopied = copiedSectionIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="border border-border-default bg-bg-surface p-5 flex flex-col gap-4"
                      >
                        {/* Section Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="eyebrow text-text-muted">TARGET:</span>
                            <span className="font-mono text-xs font-semibold text-text-primary bg-bg-base px-2 py-0.5 border border-border-default">
                              {suggestion.targetSection}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopySection(idx)}
                              className="gap-1.5 text-xs font-mono"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-state-success" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy section
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Requirement Citing */}
                        <div className="flex items-start gap-2 bg-bg-base p-2.5 border border-border-default text-data">
                          <span className="font-mono text-xs text-text-muted shrink-0 mt-0.5">
                            Answers:
                          </span>
                          <span className="text-text-primary font-medium">
                            {suggestion.requirementAddressed}
                          </span>
                        </div>

                        {/* Current vs Proposed Rewrite */}
                        <div className="space-y-3">
                          {suggestion.currentText && (
                            <div className="space-y-1">
                              <span className="text-label uppercase font-mono text-text-muted">
                                Current CV text
                              </span>
                              <div className="p-3 bg-bg-base border border-border-default text-data text-text-muted font-sans line-through opacity-80 leading-relaxed">
                                {suggestion.currentText}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-label uppercase font-mono text-text-primary flex items-center gap-1.5">
                                <Edit3 className="w-3 h-3 text-[var(--color-accent)]" />
                                Proposed rewrite (editable)
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              value={suggestion.proposedRewrite}
                              onChange={(e) => handleRewriteChange(idx, e.target.value)}
                              className="w-full bg-bg-base border border-border-default p-3 font-sans text-body text-text-primary leading-relaxed focus:outline-none focus:border-text-primary rounded-none"
                              placeholder="Proposed rewrite..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Persistent Footer */}
          {suggestions.length > 0 && (
            <div className="border-t border-border-default bg-bg-surface p-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-10">
              <div className="flex items-center gap-2">
                <span className="text-label uppercase font-mono text-text-muted">
                  System stance:
                </span>
                <span className="text-data font-mono text-text-secondary">
                  Tips and editable text only. You assemble this into your own CV document.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save edits"}
                </Button>

                <Button
                  variant="accent"
                  size="md"
                  onClick={handleCopyAll}
                  className="gap-2"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-4 h-4 text-text-primary" />
                      Copied all rewrites
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-text-primary" />
                      Copy all rewrites
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
