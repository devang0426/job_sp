import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { OnboardingWizard } from "@/components/editor/OnboardingWizard";
import { resetOnboarding } from "@/lib/db/preferences";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ restart?: string }>;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    throw error;
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const isRestart = resolvedParams.restart === "1";

  if (isRestart && user.onboardedAt) {
    await resetOnboarding(user.id);
  } else if (user.onboardedAt && !isRestart) {
    // If already onboarded and not explicitly restarting, redirect to feed.
    redirect("/feed");
  }


  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans py-12 px-4 sm:px-6 md:px-8">
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
  );
}
