"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, RotateCcw, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressState } from "@/components/ui/ProgressState";
import { useRunStatus } from "@/hooks/useRunStatus";
import { cn } from "@/lib/cn";
import {
  artifactInputs,
  errorMessage,
  type ArtifactView,
} from "@/lib/artifacts";

export interface DraftEditorProps {
  applicationId: string;
  initialArtifact?: ArtifactView | null;
  application: {
    id: string;
    status: string;
    appliedAt?: string | Date | null;
    nextFollowUpAt?: string | Date | null;
    job: {
      id: string;
      title: string;
      company: string;
      location?: string | null;
      isRemote?: boolean;
      applyUrl?: string | null;
      descriptionText?: string | null;
    };
    match?: {
      id: string;
      score?: number | null;
      recommendation?: string | null;
      summary?: string | null;
    } | null;
  };
  onArtifactChange?: (artifact: ArtifactView) => void;
}

export function DraftEditor({
  applicationId,
  initialArtifact,
  application,
  onArtifactChange,
}: DraftEditorProps) {
  const [artifact, setArtifact] = useState<ArtifactView | null>(initialArtifact || null);
  const [tone, setTone] = useState<"direct" | "warm">(
    artifactInputs(initialArtifact).tone ?? "direct"
  );
  const [contextNote, setContextNote] = useState<string>(
    artifactInputs(initialArtifact).userContextNote ?? ""
  );

  // Editable fields: subject line and body draft
  const [subjectText, setSubjectText] = useState(
    initialArtifact?.subject || `Following up on ${application.job.title} application`
  );
  const [bodyText, setBodyText] = useState(
    initialArtifact
      ? initialArtifact.editedContent !== null && initialArtifact.editedContent !== undefined
        ? initialArtifact.editedContent
        : initialArtifact.content
      : ""
  );

  // UI action states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [markSentStatus, setMarkSentStatus] = useState<"idle" | "saving" | "done">("idle");
  const [runId, setRunId] = useState<string | null>(null);

  // A regenerated draft arrives as a new `initialArtifact`. Adopt it
  // during render, not in an effect, so the editor never shows the old
  // draft for a frame after the new one lands.
  const [adoptedArtifact, setAdoptedArtifact] = useState(initialArtifact);
  if (initialArtifact && adoptedArtifact !== initialArtifact) {
    setAdoptedArtifact(initialArtifact);
    setArtifact(initialArtifact);
    setSubjectText(
      initialArtifact.subject ||
        `Following up on ${application.job.title} application`,
    );
    setBodyText(initialArtifact.editedContent ?? initialArtifact.content);
  }

  // Hook into Trigger.dev run status polling if an async run was triggered
  const { isPending } = useRunStatus(runId, {
    enabled: !!runId,
    onComplete: (data: unknown) => {
      setIsGenerating(false);
      setRunId(null);
      const generated = (data as { artifact?: ArtifactView } | null)?.artifact;
      if (generated) {
        setArtifact(generated);
        setSubjectText(generated.subject || "");
        setBodyText(generated.content || "");
        if (onArtifactChange) onArtifactChange(generated);
      }
    },
    onError: (err: unknown) => {
      setIsGenerating(false);
      setRunId(null);
      setGenerateError(
        errorMessage(
          err,
          "The draft task failed. Try generating the follow-up again.",
        ),
      );
    },
  });

  // Calculate word count of current draft body
  const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
  const isOverWordLimit = wordCount > 150;

  // Has user modified the generated text?
  const hasUserEdited =
    artifact &&
    ((artifact.editedContent !== null && artifact.editedContent !== undefined) ||
      bodyText !== artifact.content ||
      subjectText !== (artifact.subject || ""));

  // Trigger draft generation
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone,
          userContextNote: contextNote.trim() || undefined,
          async: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to generate follow-up draft");
      }

      if (json.data.isAsync && json.data.runId) {
        setRunId(json.data.runId);
      } else if (json.data.artifact) {
        const newArt = json.data.artifact;
        setArtifact(newArt);
        setSubjectText(newArt.subject || "");
        setBodyText(newArt.content || "");
        setIsGenerating(false);
        if (onArtifactChange) onArtifactChange(newArt);
      }
    } catch (err) {
      setIsGenerating(false);
      setGenerateError(
        errorMessage(err, "Couldn't generate the draft. Try again in a moment."),
      );
    }
  };

  // Persist user edits to editedContent
  const handleSaveEdit = async () => {
    if (!artifact) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectText,
          editedContent: bodyText,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setArtifact(json.data);
        if (onArtifactChange) onArtifactChange(json.data);
      }
    } catch (err) {
      console.error("Failed to save draft edits:", err);
    } finally {
      setIsSavingDraft(false);
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
        setSubjectText(json.data.subject || "");
        setBodyText(json.data.content);
        if (onArtifactChange) onArtifactChange(json.data);
      }
    } catch (err) {
      console.error("Failed to revert draft:", err);
    } finally {
      setIsReverting(false);
    }
  };

  // Copy to clipboard: copies editedContent when present, original content otherwise
  const handleCopyToClipboard = async () => {
    const textToCopy = `Subject: ${subjectText}\n\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      // Auto-save pending changes if artifact exists
      if (artifact && (bodyText !== artifact.editedContent || subjectText !== artifact.subject)) {
        handleSaveEdit();
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  // Mark follow-up as sent (separate explicit user action per product stance)
  const handleMarkAsSent = async () => {
    setMarkSentStatus("saving");
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactAt: new Date().toISOString(),
          message: `Follow-up email sent (${tone} tone)`,
        }),
      });

      if (res.ok) {
        setMarkSentStatus("done");
        setTimeout(() => setMarkSentStatus("idle"), 3000);
      }
    } catch (err) {
      console.error("Failed to mark follow-up as sent:", err);
      setMarkSentStatus("idle");
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Main Two-Pane Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-border-default">
        {/* Left Pane: Source Application & Match Context */}
        <div className="lg:col-span-5 p-6 flex flex-col gap-6 overflow-y-auto bg-bg-surface">
          <div>
            <span className="eyebrow block text-text-muted mb-1">
              Source Context
            </span>
            <h2 className="heading text-heading text-text-primary">
              {application.job.title}
            </h2>
            <p className="text-body text-text-secondary font-medium">
              {application.job.company}
            </p>
          </div>

          {/* Timeline & Metadata Cards */}
          <div className="border border-border-default bg-bg-base p-4 space-y-3 font-mono text-data">
            <div className="flex justify-between items-center py-1 border-b border-border-default">
              <span className="text-text-muted">Status</span>
              <span className="text-text-primary uppercase font-semibold">
                {application.status}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border-default">
              <span className="text-text-muted">Applied date</span>
              <span className="text-text-primary tabular-nums">
                {application.appliedAt
                  ? new Date(application.appliedAt).toLocaleDateString()
                  : "Not recorded"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-border-default">
              <span className="text-text-muted">Next follow-up</span>
              <span className="text-text-primary tabular-nums">
                {application.nextFollowUpAt
                  ? new Date(application.nextFollowUpAt).toLocaleDateString()
                  : "Not scheduled"}
              </span>
            </div>

            {application.match && (
              <div className="flex justify-between items-center py-1">
                <span className="text-text-muted">Match score</span>
                <span className="text-text-primary tabular-nums font-bold">
                  {application.match.score}/100 ({application.match.recommendation})
                </span>
              </div>
            )}
          </div>

          {/* Match Evaluation Context */}
          {application.match?.summary && (
            <div className="border border-border-default bg-bg-base p-4 space-y-2">
              <span className="eyebrow block text-text-muted">
                Match Summary
              </span>
              <p className="text-body text-text-secondary leading-relaxed">
                {application.match.summary}
              </p>
            </div>
          )}

          {/* Generator Controls */}
          <div className="border border-border-default bg-bg-base p-4 space-y-4">
            <span className="eyebrow block text-text-muted">
              Draft Parameters
            </span>

            {/* Tone Toggle (Direct vs Warm - two tones only per spec) */}
            <div className="space-y-1.5">
              <label className="text-label uppercase font-mono text-text-muted">
                Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTone("direct")}
                  className={cn(
                    "min-h-[44px] px-3 text-data font-mono uppercase transition-colors border",
                    tone === "direct"
                      ? "bg-text-primary text-bg-base border-text-primary font-semibold"
                      : "bg-transparent text-text-secondary border-border-default hover:border-text-primary"
                  )}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setTone("warm")}
                  className={cn(
                    "min-h-[44px] px-3 text-data font-mono uppercase transition-colors border",
                    tone === "warm"
                      ? "bg-text-primary text-bg-base border-text-primary font-semibold"
                      : "bg-transparent text-text-secondary border-border-default hover:border-text-primary"
                  )}
                >
                  Warm
                </button>
              </div>
            </div>

            {/* Optional Personal Note / Context */}
            <div className="space-y-1.5">
              <label className="text-label uppercase font-mono text-text-muted">
                Personal Note / Context (Optional)
              </label>
              <textarea
                rows={3}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="e.g. Spoke with hiring manager at conference; submitted via referral link..."
                className="w-full bg-bg-surface border border-border-default p-2.5 text-data text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-primary rounded-none"
              />
            </div>

            {/* Generate Action */}
            <Button
              variant="default"
              onClick={handleGenerateDraft}
              disabled={isGenerating || isPending}
              className="w-full"
            >
              {isGenerating || isPending ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-[var(--color-accent)]" />
                  Generating draft...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  {artifact ? "Regenerate draft" : "Generate email draft"}
                </span>
              )}
            </Button>

            {generateError && (
              <div className="p-3 bg-[var(--color-state-error)]/10 border border-[var(--color-state-error)] text-[var(--color-state-error)] text-data flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Editable Draft */}
        <div className="lg:col-span-7 flex flex-col h-full bg-bg-base">
          {/* Draft Header & Meta */}
          <div className="p-6 border-b border-border-default flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="eyebrow text-text-muted">Draft email</span>
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
              </div>

              {/* Word counter and length defense */}
              <div className="flex items-center gap-3 font-mono text-data">
                <span
                  className={cn(
                    "tabular-nums",
                    isOverWordLimit
                      ? "text-[var(--color-state-error)] font-bold"
                      : "text-text-muted"
                  )}
                >
                  {wordCount} / 150 words
                </span>
                {hasUserEdited && (
                  <button
                    type="button"
                    onClick={handleRevert}
                    disabled={isReverting}
                    className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-label uppercase underline transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Revert to generated
                  </button>
                )}
              </div>
            </div>

            {/* Editable Subject Field */}
            <div className="space-y-1">
              <label className="text-label uppercase font-mono text-text-muted">
                Subject
              </label>
              <input
                type="text"
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                placeholder="Email Subject Line..."
                className="w-full bg-bg-surface border border-border-default px-3 py-2 text-heading heading text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-primary rounded-none"
              />
            </div>
          </div>

          {/* Draft Body Editor */}
          <div className="flex-1 p-6 flex flex-col min-h-0">
            {isGenerating || isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                <ProgressState
                  status="RUNNING"
                  isPending={true}
                  isFailed={false}
                  isCompleted={false}
                  label="Generating structured follow-up email..."
                />
                <p className="font-mono text-data text-text-muted text-center max-w-sm">
                  Grounding email in application specifics, enforcing under 150 words constraint.
                </p>
              </div>
            ) : !artifact && !bodyText ? (
              <div className="flex-1 border border-dashed border-border-default flex flex-col items-center justify-center p-8 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-text-muted opacity-60" />
                <h3 className="heading text-heading text-text-primary">
                  No draft generated yet
                </h3>
                <p className="text-body text-text-secondary max-w-md">
                  Click &ldquo;Generate email draft&rdquo; to create a tailored, concise follow-up email ready to edit and send.
                </p>
              </div>
            ) : (
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Email body draft..."
                rows={12}
                className="w-full flex-1 bg-bg-surface border border-border-default p-4 font-sans text-body text-text-primary leading-relaxed resize-none focus:outline-none focus:border-text-primary rounded-none"
              />
            )}
          </div>

          {/* Persistent Footer Bar with Copy & Mark As Sent Actions */}
          <div className="border-t border-border-default bg-bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-label uppercase font-mono text-text-muted">
                System stance:
              </span>
              <span className="text-data font-mono text-text-secondary">
                The draft lands editable. You copy and send it yourself.
              </span>
            </div>

            <div className="flex items-center gap-3">
              {artifact && hasUserEdited && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSavingDraft}
                >
                  {isSavingDraft ? "Saving..." : "Save edits"}
                </Button>
              )}

              {/* Primary Copy-to-Clipboard Action */}
              <Button
                variant="accent"
                size="md"
                onClick={handleCopyToClipboard}
                disabled={!bodyText}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-text-primary" />
                    Copied to clipboard
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-text-primary" />
                    Copy to clipboard
                  </>
                )}
              </Button>

              {/* Explicit User Action to Mark Sent */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsSent}
                disabled={markSentStatus === "saving" || !applicationId}
                className="gap-1.5"
              >
                {markSentStatus === "done" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--color-state-success)]" />
                    Marked sent
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-text-muted" />
                    Mark as sent
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
