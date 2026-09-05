"use client";

import { useState, useEffect, useCallback } from "react";
import { ResumeUpload } from "@/components/editor/ResumeUpload";
import { PreferencesForm } from "@/components/editor/PreferencesForm";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, ArrowRight, FileText, Sliders, Sparkles, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hasResume, setHasResume] = useState(false);
  const [checkingResume, setCheckingResume] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const checkUserResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      if (res.ok) {
        const json = await res.json();
        const resumes = json.data?.resumes || [];
        setHasResume(resumes.length > 0);
      }
    } catch (err) {
      console.error("Failed to check resumes:", err);
    } finally {
      setCheckingResume(false);
    }
  }, []);

  useEffect(() => {
    // Loading data on mount is the intended use of an effect. The rule
    // traces the setState that lands after the await and cannot tell the
    // difference, so it is silenced here rather than worked around.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkUserResumes();
  }, [checkUserResumes]);

  const handlePreferencesSaved = async () => {
    setCompleteError(null);
    setCompleting(true);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setCompleteError(json.error?.message || "Failed to complete onboarding.");
        // If resume was missing server-side, send back to step 1
        if (json.error?.code === "NO_ACTIVE_RESUME") {
          setStep(1);
        }
      } else {
        setStep(3);
      }
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setCompleteError("Connection error while completing setup.");
    } finally {
      setCompleting(false);
    }
  };

  const handleGoToFeed = () => {
    router.push("/feed");
  };

  return (
    <div className="space-y-8">
      {/* STEP INDICATOR BAR */}
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-border-default)] pb-4">
        <div
          className={`flex items-center gap-2 pb-2 text-xs font-mono uppercase tracking-wider ${
            step === 1
              ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)] font-bold"
              : step > 1
              ? "text-[var(--color-accent-muted)] font-semibold"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Upload CV</span>
          {hasResume && <CheckCircle2 className="w-4 h-4 text-state-success ml-auto shrink-0" />}
        </div>

        <div
          className={`flex items-center gap-2 pb-2 text-xs font-mono uppercase tracking-wider ${
            step === 2
              ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)] font-bold"
              : step > 2
              ? "text-[var(--color-accent-muted)] font-semibold"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>2. Preferences</span>
        </div>

        <div
          className={`flex items-center gap-2 pb-2 text-xs font-mono uppercase tracking-wider ${
            step === 3
              ? "text-[var(--color-text-primary)] border-b-2 border-[var(--color-text-primary)] font-bold"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>3. Ready</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD CV */}
      {step === 1 && (
        <div className="space-y-6">
          <ResumeUpload onResumeUploaded={checkUserResumes} />

          {completeError && (
            <div className="p-4 bg-state-error/10 border border-state-error/40 text-state-error text-sm font-sans flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-state-error" />
              <span>{completeError}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t border-[var(--color-border-default)]">
            <p className="text-xs font-mono text-[var(--color-text-muted)]">
              {checkingResume
                ? "Checking resume status..."
                : hasResume
                ? "✓ CV registered. Proceed to preferences."
                : "Upload a PDF or paste CV text to enable the next step."}
            </p>

            <Button
              variant="accent"
              size="md"
              disabled={checkingResume}
              onClick={() => {
                checkUserResumes();
                setStep(2);
              }}
            >
              Continue to Preferences <ArrowRight className="w-4 h-4 ml-2 inline" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: SET PREFERENCES */}
      {step === 2 && (
        <div className="space-y-6">
          {completeError && (
            <div className="p-4 bg-state-error/10 border border-state-error/40 text-state-error text-sm font-sans flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-state-error" />
              <span>{completeError}</span>
            </div>
          )}

          <PreferencesForm
            submitLabel={completing ? "Completing setup..." : "Save Preferences & Finish Setup →"}
            onSaveSuccess={handlePreferencesSaved}
            showHeading={false}
          />

          <div className="flex justify-start">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Back to CV Upload
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: DONE & READY */}
      {step === 3 && (
        <div className="p-8 border border-[var(--color-border-default)] bg-[var(--color-accent)]/5 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-state-success/10 text-state-success mb-2">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Setup Complete!
            </h2>
            <p className="text-xs sm:text-sm font-sans text-slate-600 max-w-md mx-auto">
              Your active CV and target job preferences are saved. You are ready to start scanning job boards and evaluating matches.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="accent" size="md" onClick={handleGoToFeed}>
              Go to Job Feed & Start Scanning <ArrowRight className="w-4 h-4 ml-2 inline" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
