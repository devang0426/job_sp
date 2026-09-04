"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { ResumeProfile } from "@/components/editor/ResumeProfile";
import { Upload, AlertTriangle, Check, Trash2 } from "lucide-react";
import type { StructuredResumePayload } from "@/lib/ai/structureResume";

export interface ResumeItem {
  id: string;
  userId: string;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  rawText: string;
  charCount: number;
  parseSource: "PDF_PARSE" | "CLAUDE_DOCUMENT" | "PASTED";
  parseStatus?: "PARSED" | "EMPTY" | "FAILED";
  parseError?: string | null;
  structured?: StructuredResumePayload | null;
  createdAt: string;
}

export function ResumeUpload() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Paste fallback state
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pastedLabel, setPastedLabel] = useState("");
  const [submittingPaste, setSubmittingPaste] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setResumes(json.data.resumes || []);
          setActiveResumeId(json.data.activeResumeId || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading data on mount is the intended use of an effect. The rule
    // traces the setState that lands after the await and cannot tell the
    // difference, so it is silenced here rather than worked around.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResumes();
  }, [fetchResumes]);

  const handleFileUpload = async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Only PDF files are supported for resume upload.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume file size exceeds the 5 MB limit.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        const errMsg =
          json.error?.message ||
          "Couldn't read that PDF. Try a text-based PDF, or paste your CV instead.";
        setError(errMsg);
        // Automatically offer paste fallback on unreadable PDF
        if (json.error?.code === "PDF_UNREADABLE") {
          setIsPasteMode(true);
        }
      } else {
        await fetchResumes();
      }
    } catch (err) {
      console.error("Error uploading resume:", err);
      setError("Couldn't read that PDF. Try a text-based PDF, or paste your CV instead.");
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim() || pastedText.trim().length < 10) {
      setError("Resume text must be at least 10 characters long.");
      return;
    }

    setError(null);
    setSubmittingPaste(true);

    try {
      const res = await fetch("/api/resumes/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: pastedText,
          label: pastedLabel.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error?.message || "Failed to submit pasted text.");
      } else {
        setPastedText("");
        setPastedLabel("");
        setIsPasteMode(false);
        await fetchResumes();
      }
    } catch (err) {
      console.error("Error pasting resume:", err);
      setError("Failed to process pasted resume text.");
    } finally {
      setSubmittingPaste(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        setActiveResumeId(id);
      }
    } catch (err) {
      console.error("Error activating resume:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (resumes.length === 1 && activeResumeId === id) {
      setError("Cannot delete active resume when it is your only resume.");
      return;
    }

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error?.message || "Failed to delete resume.");
      } else {
        await fetchResumes();
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
      setError("Failed to delete resume.");
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-default)] pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Resume Management
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Upload PDF CV or paste plain text. Plain text is extracted and parsed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={!isPasteMode ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setIsPasteMode(false);
              setError(null);
            }}
          >
            Upload PDF
          </Button>
          <Button
            variant={isPasteMode ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setIsPasteMode(true);
              setError(null);
            }}
          >
            Paste Text
          </Button>
        </div>
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="p-4 bg-state-error/10 border border-state-error/40 text-state-error text-sm font-sans flex items-start gap-3 rounded-none">
          <AlertTriangle className="w-5 h-5 shrink-0 text-state-error mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            {error.includes("paste your CV") && !isPasteMode && (
              <button
                type="button"
                className="mt-2 text-xs font-mono uppercase tracking-wider underline hover:opacity-80"
                onClick={() => setIsPasteMode(true)}
              >
                Switch to text paste mode →
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Drag & Drop Upload Zone */}
      {!isPasteMode && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed p-10 text-center transition-colors rounded-none ${
            isDragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-[var(--color-border-default)] hover:border-[var(--color-text-primary)]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <Upload className="w-10 h-10 text-[var(--color-text-muted)]" />
            <div>
              <p className="text-sm font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
                Drag & Drop your CV PDF here
              </p>
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                PDF files up to 5 MB. Evaluated in-memory and discarded.
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Parsing PDF..." : "Browse PDF File"}
            </Button>
          </div>
        </div>
      )}

      {/* Paste Mode Form */}
      {isPasteMode && (
        <form onSubmit={handlePasteSubmit} className="space-y-4 border p-6 border-[var(--color-border-default)]">
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
              CV Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Frontend Resume 2026"
              value={pastedLabel}
              onChange={(e) => setPastedLabel(e.target.value)}
              className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)]">
              Paste Plain Text Resume
            </label>
            <textarea
              rows={12}
              placeholder="Paste your plain text resume content here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-mono focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsPasteMode(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              type="submit"
              disabled={submittingPaste || !pastedText.trim()}
            >
              {submittingPaste ? "Saving..." : "Save Pasted CV"}
            </Button>
          </div>
        </form>
      )}

      {/* Resumes List */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-2">
          Uploaded Resumes ({resumes.length})
        </h3>

        {loading ? (
          <p className="text-xs font-mono text-[var(--color-text-muted)]">Loading resumes...</p>
        ) : resumes.length === 0 ? (
          <p className="text-xs font-mono text-[var(--color-text-muted)] py-4">
            No resumes uploaded yet. Upload a PDF or paste text to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => {
              const isActive = r.id === activeResumeId;
              return (
                <div
                  key={r.id}
                  className={`p-4 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-none ${
                    isActive
                      ? "border-[var(--color-text-primary)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border-default)]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                        {r.label}
                      </span>
                      {isActive && (
                        <StatusChip tone="success">
                          <Check className="w-3 h-3 mr-1 inline" /> ACTIVE
                        </StatusChip>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[var(--color-text-muted)]">
                      <span>{r.fileName}</span>
                      <span>•</span>
                      <span>{(r.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{r.charCount} chars</span>
                      {r.pageCount && (
                        <>
                          <span>•</span>
                          <span>{r.pageCount} pg</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="uppercase">{r.parseSource.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetActive(r.id)}
                      >
                        Make Active
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isActive && resumes.length === 1}
                      title={
                        isActive && resumes.length === 1
                          ? "Cannot delete active resume when it is your only resume"
                          : "Delete Resume"
                      }
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Resume Structured Profile Section */}
      {(() => {
        const activeResume = resumes.find((r) => r.id === activeResumeId) || resumes[0];
        if (!activeResume) return null;

        return (
          <div className="pt-4 border-t border-[var(--color-border-default)]">
            <ResumeProfile
              resumeId={activeResume.id}
              structured={activeResume.structured}
              parseStatus={activeResume.parseStatus}
              parseError={activeResume.parseError}
              onRefresh={fetchResumes}
            />
          </div>
        );
      })()}
    </div>
  );
}
