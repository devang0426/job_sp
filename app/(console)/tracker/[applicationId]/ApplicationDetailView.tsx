"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { STATUS_ORDER } from "@/lib/tracker/states";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { EventTimeline } from "@/components/tracker/EventTimeline";
import { errorMessage } from "@/lib/artifacts";
import type { ApplicationDetail } from "@/lib/db/applications";
import { formatDaysInStatus } from "@/components/tracker/Card";
import { ArrowLeft, Building2, ExternalLink, Calendar, FileText, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DraftEditor } from "@/components/editor/DraftEditor";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  EVALUATED: "Evaluated",
  APPLIED: "Applied",
  RESPONDED: "Responded",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  DISCARDED: "Discarded",
  SKIP: "Skip",
  HIRED: "Hired",
};

interface ApplicationDetailViewProps {
  initialApplication: ApplicationDetail;
}

export function ApplicationDetailView({ initialApplication }: ApplicationDetailViewProps) {
  const router = useRouter();
  const [app, setApp] = useState(initialApplication);
  const [activeTab, setActiveTab] = useState<"overview" | "followup" | "documents" | "activity">("overview");

  // Notes state
  const [notesText, setNotesText] = useState(initialApplication.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);

  // Status transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Follow-up date state
  const [followUpDate, setFollowUpDate] = useState(
    initialApplication.nextFollowUpAt
      ? new Date(initialApplication.nextFollowUpAt).toISOString().split("T")[0]
      : ""
  );
  const [isSavingDate, setIsSavingDate] = useState(false);

  const daysInStatus = formatDaysInStatus(app.statusChangedAt);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (newStatus === app.status) return;
    setIsTransitioning(true);
    setTransitionError(null);

    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error?.message || "Failed to update status");
      }

      setApp(data.data);
      router.refresh();
    } catch (err) {
      setTransitionError(
        errorMessage(err, "Couldn't move the card. Try the change again."),
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setApp(data.data);
        setNotesSaveSuccess(true);
        setTimeout(() => setNotesSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveFollowUpDate = async (newDateStr: string) => {
    setFollowUpDate(newDateStr);
    setIsSavingDate(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextFollowUpAt: newDateStr ? new Date(newDateStr).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setApp(data.data);
      }
    } catch (err) {
      console.error("Failed to update follow-up date:", err);
    } finally {
      setIsSavingDate(false);
    }
  };

  function formatMonoDate(date: Date | string | null | undefined): string {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-default bg-bg-surface">
        <Link
          href="/tracker"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tracker</span>
        </Link>

        <div className="flex items-center gap-3">
          {app.job.applyUrl && (
            <a
              href={app.job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-accent-muted hover:underline"
            >
              <span>Apply on the posting</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <Link
            href={`/feed/${app.jobId}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text-primary"
          >
            <Sparkles className="w-3 h-3 text-accent-muted" />
            <span>Match report</span>
          </Link>
        </div>
      </div>

      {/* Main Content Layout: Left Rail + Right Tabs */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Summary Rail */}
        <div className="w-full lg:w-[340px] xl:w-[380px] border-b lg:border-b-0 lg:border-r border-border-default bg-bg-surface p-6 space-y-6 shrink-0">
          {/* Company & Role */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1 font-mono uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>{app.job.company}</span>
            </div>
            <h1 className="heading text-2xl font-bold uppercase tracking-wide text-text-primary leading-tight">
              {app.job.title}
            </h1>
            {app.job.location && (
              <p className="text-xs text-text-muted mt-1">
                {app.job.location} {app.job.isRemote ? "• Remote" : ""}
              </p>
            )}
          </div>

          {/* Status Section */}
          <div className="p-4 border border-border-default bg-bg-base/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Status
              </span>
              <span className="font-mono text-xs tabular-nums text-text-muted">
                {daysInStatus} in status
              </span>
            </div>

            <div className="relative">
              <select
                value={app.status}
                disabled={isTransitioning}
                onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                aria-label="Application Status"
                className="w-full bg-bg-surface border border-border-default px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-text-primary focus:outline-none focus:border-accent-muted cursor-pointer disabled:opacity-50"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {transitionError && (
              <p className="font-mono text-[11px] text-state-error flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{transitionError}</span>
              </p>
            )}
          </div>

          {/* Match score Meter */}
          <div className="p-4 border border-border-default bg-bg-base/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Match Signal
              </span>
              {app.match?.recommendation && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-primary">
                  {app.match.recommendation}
                </span>
              )}
            </div>

            {app.match?.score !== null && app.match?.score !== undefined ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <ScoreMeter
                  score={app.match.score}
                  recommendation={app.match.recommendation ?? undefined}
                  scale="md"
                  matchId={app.match.id}
                />
                <span className="font-mono text-lg font-bold tabular-nums text-text-primary">
                  {app.match.score}
                </span>
              </div>
            ) : (
              <p className="font-mono text-xs text-text-muted">No evaluation recorded</p>
            )}
          </div>

          {/* Key Dates in Mono */}
          <div className="p-4 border border-border-default bg-bg-base/40 space-y-3">
            <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider border-b border-border-default pb-1.5">
              Key Dates
            </h3>

            <dl className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Saved to Tracker</dt>
                <dd className="tabular-nums text-text-primary">
                  {formatMonoDate(app.createdAt)}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Status changed</dt>
                <dd className="tabular-nums text-text-primary">
                  {formatMonoDate(app.statusChangedAt)}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Applied date</dt>
                <dd className="tabular-nums text-text-primary">
                  {formatMonoDate(app.appliedAt)}
                </dd>
              </div>

              <div className="flex items-center justify-between pt-1">
                <dt className="text-text-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Next Follow-up</span>
                </dt>
                <dd className="tabular-nums text-text-primary">
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => handleSaveFollowUpDate(e.target.value)}
                    disabled={isSavingDate}
                    aria-label="Next follow-up date"
                    aria-busy={isSavingDate}
                    className="bg-bg-surface border border-border-default px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-muted disabled:opacity-60"
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Tabbed Pane */}
        <div className="flex-1 flex flex-col bg-bg-base">
          {/* Tabs Bar: Overview, Documents, Activity (Interviews, Offer, Outcome omitted) */}
          <div className="flex items-center border-b border-border-default bg-bg-surface px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "py-3.5 px-4 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors",
                activeTab === "overview"
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("followup")}
              className={cn(
                "py-3.5 px-4 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors flex items-center gap-1.5",
                activeTab === "followup"
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-muted)]" />
              Follow-up Email
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={cn(
                "py-3.5 px-4 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors",
                activeTab === "documents"
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              Documents ({app.artifacts?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "py-3.5 px-4 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors",
                activeTab === "activity"
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              Activity ({app.events?.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
            {activeTab === "overview" && (
              <div className="max-w-4xl space-y-8">
                {/* Notes Section */}
                <div className="space-y-3 p-5 border border-border-default bg-bg-surface">
                  <div className="flex items-center justify-between">
                    <h3 className="heading font-bold text-sm uppercase tracking-wider text-text-primary">
                      Application Notes
                    </h3>
                    <div className="flex items-center gap-2">
                      {notesSaveSuccess && (
                        <span className="font-mono text-xs text-state-success flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Saved
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? "Saving..." : "Save Note"}
                      </Button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add interview notes, recruiter contacts, timeline specifics..."
                    className="w-full bg-bg-base border border-border-default p-3 text-xs font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-muted"
                  />
                </div>

                {/* Job Description Overview */}
                <div className="space-y-4 p-5 border border-border-default bg-bg-surface">
                  <h3 className="heading font-bold text-sm uppercase tracking-wider text-text-primary border-b border-border-default pb-2">
                    Role Description
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-text-muted border-b border-border-default/60 pb-4">
                    <div>
                      <span className="block text-[10px] uppercase text-text-muted/80">Location</span>
                      <span className="text-text-primary font-semibold">
                        {app.job.location || "Unspecified"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-text-muted/80">Remote policy</span>
                      <span className="text-text-primary font-semibold">
                        {app.job.isRemote ? "Remote" : "On-site / Hybrid"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-text-muted/80">Compensation</span>
                      <span className="text-text-primary font-semibold">
                        {app.job.salaryMin
                          ? `${app.job.salaryCurrency || "$"} ${app.job.salaryMin.toLocaleString()} ${
                              app.job.salaryMax ? `– ${app.job.salaryMax.toLocaleString()}` : ""
                            }`
                          : "Undisclosed"}
                      </span>
                    </div>
                  </div>

                  <div className="font-sans text-xs text-text-primary/90 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {app.job.descriptionText || "The source posting had no description text. Open the apply link to read it."}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "followup" && (
              <div className="h-full -m-6 sm:-m-8">
                <DraftEditor
                  applicationId={app.id}
                  initialArtifact={
                    app.artifacts?.find((a) => a.kind === "FOLLOW_UP_EMAIL") || null
                  }
                  application={app}
                  onArtifactChange={(updatedArtifact) => {
                    setApp((prev) => {
                      const existing = prev.artifacts ?? [];
                      const idx = existing.findIndex((a) => a.id === updatedArtifact.id);
                      const nextArtifacts =
                        idx >= 0
                          ? existing.map((a) =>
                              a.id === updatedArtifact.id
                                ? {
                                    ...a,
                                    subject: updatedArtifact.subject,
                                    content: updatedArtifact.content,
                                    editedContent: updatedArtifact.editedContent,
                                  }
                                : a,
                            )
                          : existing;
                      return { ...prev, artifacts: nextArtifacts };
                    });
                  }}
                />
              </div>
            )}

            {activeTab === "documents" && (
              <div className="max-w-4xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="heading font-bold text-sm uppercase tracking-wider text-text-primary">
                    Generated Artifacts
                  </h3>
                  <span className="font-mono text-xs text-text-muted">
                    {app.artifacts?.length || 0} items
                  </span>
                </div>

                {!app.artifacts || app.artifacts.length === 0 ? (
                  <div className="p-8 border border-dashed border-border-default text-center space-y-2 text-text-muted font-mono text-xs">
                    <FileText className="w-6 h-6 mx-auto opacity-50 mb-2" />
                    <p>No tailored documents generated yet.</p>
                    <p className="text-[11px] text-text-muted/80">
                      Tailored CVs and outreach messages will be accessible here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.artifacts.map((artifact) => (
                      <div
                        key={artifact.id}
                        className="p-4 border border-border-default bg-bg-surface space-y-2 hover:border-text-primary transition-colors cursor-pointer"
                        onClick={() => {
                          if (artifact.kind === "FOLLOW_UP_EMAIL") {
                            setActiveTab("followup");
                          }
                        }}
                      >
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-bold text-[var(--color-accent-muted)] uppercase">
                            {artifact.kind}
                          </span>
                          <span className="text-text-muted tabular-nums">
                            {new Date(artifact.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {artifact.subject && (
                          <p className="font-medium text-body text-text-primary">
                            {artifact.subject}
                          </p>
                        )}
                        <p className="font-sans text-data text-text-secondary line-clamp-3">
                          {artifact.editedContent || artifact.content}
                        </p>
                        {artifact.kind === "FOLLOW_UP_EMAIL" && (
                          <div className="pt-1 flex items-center justify-end">
                            <span className="text-label uppercase font-mono text-text-muted hover:text-text-primary flex items-center gap-1">
                              Open in editor →
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="max-w-4xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="heading font-bold text-sm uppercase tracking-wider text-text-primary">
                    Transition & Event History
                  </h3>
                  <span className="font-mono text-xs text-text-muted">
                    {app.events?.length || 0} events
                  </span>
                </div>

                <EventTimeline events={app.events || []} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
