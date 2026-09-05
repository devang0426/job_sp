import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { OnboardingWizard } from "@/components/editor/OnboardingWizard";
import { OnboardingHeader } from "@/components/auth/OnboardingHeader";

export default async function OnboardingPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    throw error;
  }

  // Requirement: /onboarding redirects to feed when onboardedAt is set — no loop.
  if (user.onboardedAt) {
    redirect("/feed");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans">
      {/* Top Header with Sign Out Button */}
      <OnboardingHeader userEmail={user.email} />

      <div className="py-10 px-4 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Onboarding Header */}
          <div className="text-center space-y-2 border-b border-slate-200 pb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-blue-600 font-semibold">
              Job Match Dispatch • Onboarding
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Setup Your Match Radar
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              From signed-in to ready-to-scan in two quick steps: upload your CV, set your target roles, done.
            </p>
          </div>

          {/* Wizard Flow Component */}
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
