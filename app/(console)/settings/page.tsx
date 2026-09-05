import { PreferencesForm } from "@/components/editor/PreferencesForm";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Profile & Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your target roles, preferred locations, salary floor, pre-filters, and scan source configuration.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xs">
        <PreferencesForm showHeading={false} />
      </div>
    </div>
  );
}
