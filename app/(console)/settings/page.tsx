import Link from "next/link";
import { PreferencesForm } from "@/components/editor/PreferencesForm";
import { Sparkles, ArrowRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Profile & Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your target roles, preferred locations, salary floor, pre-filters, and scan source configuration.
          </p>
        </div>

        <Link
          href="/onboarding?restart=1"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Re-run Onboarding Flow</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xs">
        <PreferencesForm showHeading={false} />
      </div>
    </div>
  );
}

