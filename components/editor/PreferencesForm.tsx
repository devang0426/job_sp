"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Check, AlertTriangle, ChevronDown, ChevronUp, ShieldCheck, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { AUTO_SCAN_INTERVALS } from "@/lib/validation/preferences";

export interface PreferencesFormData {
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  employmentTypes: string[];
  seniority: string | null;
  minSalary: number | null;
  salaryCurrency: string;
  keywords: string[];
  excludeKeywords: string[];
  excludedCompanies: string[];
  sources: string[];
  maxJobsPerScan: number;
  autoEvaluate: boolean;
  autoScanEnabled: boolean;
  autoScanIntervalMinutes: number;
}

interface PreferencesFormProps {
  initialData?: Partial<PreferencesFormData>;
  onSaveSuccess?: () => void;
  submitLabel?: string;
  showHeading?: boolean;
}

const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];

const SENIORITY_OPTIONS = [
  { value: "", label: "Any seniority" },
  { value: "INTERN", label: "Internship" },
  { value: "JUNIOR", label: "Junior / Entry Level" },
  { value: "MID", label: "Mid Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "STAFF", label: "Staff / Principal" },
  { value: "LEAD", label: "Lead / Manager" },
];

const SOURCE_OPTIONS = [
  { id: "GREENHOUSE", label: "Greenhouse", isFree: true },
  { id: "LEVER", label: "Lever", isFree: true },
  { id: "ASHBY", label: "Ashby", isFree: true },
  { id: "ADZUNA", label: "Adzuna", isFree: false },
  { id: "JSEARCH", label: "JSearch / RapidAPI", isFree: false },
  { id: "SCRAPED", label: "Web scraper (RemoteOK)", isFree: true },
  { id: "FIRECRAWL", label: "Firecrawl (WeWorkRemotely)", isFree: false },
];

export function PreferencesForm({
  initialData,
  onSaveSuccess,
  submitLabel = "Save Preferences",
  showHeading = true,
}: PreferencesFormProps) {
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Progressive disclosure toggle for advanced preferences
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State
  const [targetRolesText, setTargetRolesText] = useState("");
  const [locationsText, setLocationsText] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(["Full-time"]);
  const [seniority, setSeniority] = useState<string>("");
  const [minSalary, setMinSalary] = useState<string>("");
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [keywordsText, setKeywordsText] = useState("");
  const [excludeKeywordsText, setExcludeKeywordsText] = useState("");
  const [excludedCompaniesText, setExcludedCompaniesText] = useState("");
  const [sources, setSources] = useState<string[]>([
    "GREENHOUSE",
    "LEVER",
    "ASHBY",
    "SCRAPED",
    "FIRECRAWL",
  ]);
  const [maxJobsPerScan, setMaxJobsPerScan] = useState<number>(40);
  const [autoEvaluate, setAutoEvaluate] = useState(true);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [autoScanIntervalMinutes, setAutoScanIntervalMinutes] = useState(60);

  const populateForm = useCallback((data: Partial<PreferencesFormData>) => {
    setTargetRolesText(data.targetRoles ? data.targetRoles.join(", ") : "");
    setLocationsText(data.locations ? data.locations.join(", ") : "");
    setRemoteOnly(Boolean(data.remoteOnly));
    setEmploymentTypes(data.employmentTypes && data.employmentTypes.length ? data.employmentTypes : ["Full-time"]);
    setSeniority(data.seniority || "");
    setMinSalary(data.minSalary !== null && data.minSalary !== undefined ? String(data.minSalary) : "");
    setSalaryCurrency(data.salaryCurrency || "INR");
    setKeywordsText(data.keywords ? data.keywords.join(", ") : "");
    setExcludeKeywordsText(data.excludeKeywords ? data.excludeKeywords.join(", ") : "");
    setExcludedCompaniesText(data.excludedCompanies ? data.excludedCompanies.join(", ") : "");
    setSources(
      data.sources && data.sources.length
        ? data.sources
        : ["GREENHOUSE", "LEVER", "ASHBY", "SCRAPED", "FIRECRAWL"],
    );
    setMaxJobsPerScan(data.maxJobsPerScan || 40);
    setAutoEvaluate(data.autoEvaluate !== false);
    setAutoScanEnabled(Boolean(data.autoScanEnabled));
    setAutoScanIntervalMinutes(data.autoScanIntervalMinutes || 60);
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/preferences");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          populateForm(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
      setError("Could not load existing preferences.");
    } finally {
      setLoading(false);
    }
  }, [populateForm]);

  // Preferences arrive one of two ways: handed down by a server component,
  // or fetched. Adopt a handed-down set during render; fetch otherwise.
  const [adoptedInitial, setAdoptedInitial] =
    useState<Partial<PreferencesFormData> | null>(null);
  if (initialData && adoptedInitial !== initialData) {
    setAdoptedInitial(initialData);
    populateForm(initialData);
    setLoading(false);
  }

  useEffect(() => {
    // Loading data on mount is the intended use of an effect. The rule
    // traces the setState that lands after the await and cannot tell the
    // difference, so it is silenced here rather than worked around.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initialData) fetchPreferences();
  }, [initialData, fetchPreferences]);

  const toggleSource = (sourceId: string) => {
    setSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((s) => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const toggleEmploymentType = (type: string) => {
    setEmploymentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const rolesArray = targetRolesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (rolesArray.length === 0) {
      setError("Please specify at least one target role (e.g. Senior Frontend Engineer).");
      return;
    }

    const payload = {
      targetRoles: rolesArray,
      locations: locationsText.split(",").map((s) => s.trim()).filter(Boolean),
      remoteOnly,
      employmentTypes,
      seniority: seniority || null,
      minSalary: minSalary ? Number(minSalary) : null,
      salaryCurrency,
      keywords: keywordsText.split(",").map((s) => s.trim()).filter(Boolean),
      excludeKeywords: excludeKeywordsText.split(",").map((s) => s.trim()).filter(Boolean),
      excludedCompanies: excludedCompaniesText.split(",").map((s) => s.trim()).filter(Boolean),
      sources,
      maxJobsPerScan: Math.min(Number(maxJobsPerScan) || 40, 60),
      autoEvaluate,
      autoScanEnabled,
      autoScanIntervalMinutes,
    };

    setSaving(true);

    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error?.message || "Failed to save preferences.");
      } else {
        setSuccessMsg("Preferences saved successfully!");
        if (json.data) {
          populateForm(json.data);
        }
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      }
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError("Failed to connect to server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center font-mono text-xs text-[var(--color-text-muted)] border border-[var(--color-border-default)]">
        Loading preferences...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {showHeading && (
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Job & Scan Preferences
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Define what roles to look for and how scan budget is spent.
          </p>
        </div>
      )}

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-state-error/10 border border-state-error/40 text-state-error text-sm font-sans flex items-center gap-3 rounded-none">
          <AlertTriangle className="w-5 h-5 shrink-0 text-state-error" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-state-success/10 border border-state-success/40 text-state-success text-sm font-sans flex items-center gap-3 rounded-none">
          <Check className="w-5 h-5 shrink-0 text-state-success" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PRIMARY SECTION: Roles & Locations */}
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
            Roles you&apos;re targeting <span className="text-state-error">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Senior Frontend Engineer, Fullstack Developer, Product Architect"
            value={targetRolesText}
            onChange={(e) => setTargetRolesText(e.target.value)}
            className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
          />
          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
            Comma-separated job titles. Scans will evaluate postings matching these roles first.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
              Preferred locations
            </label>
            <input
              type="text"
              placeholder="e.g. Bengaluru, Mumbai, Remote"
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
              className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
            />
            <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
              Comma-separated cities or countries.
            </p>
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="w-4 h-4 rounded-none accent-[var(--color-text-primary)]"
              />
              <span className="text-sm font-sans font-medium text-[var(--color-text-primary)]">
                Remote positions only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* AUTOMATIC SCANS */}
      <div className="p-5 border border-[var(--color-border-default)] bg-[var(--color-accent)]/5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScanEnabled}
            onChange={(e) => setAutoScanEnabled(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded-none accent-[var(--color-text-primary)]"
          />
          <span className="flex items-start gap-2">
            <Clock className="w-5 h-5 text-[var(--color-accent-muted)] shrink-0" aria-hidden="true" />
            <span>
              <span className="text-sm font-sans font-medium text-[var(--color-text-primary)] block">
                Scan automatically on a schedule
              </span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                A background job re-scans and re-scores against your CV without you clicking anything.
              </span>
            </span>
          </span>
        </label>

        {autoScanEnabled && (
          <div className="pl-7 space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                How often
              </label>
              <select
                value={autoScanIntervalMinutes}
                onChange={(e) => setAutoScanIntervalMinutes(Number(e.target.value))}
                className="w-full max-w-xs p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
              >
                {AUTO_SCAN_INTERVALS.map((opt) => (
                  <option
                    key={opt.minutes}
                    value={opt.minutes}
                    className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs font-mono text-[var(--color-text-muted)]">
              Scheduled scans use the free ATS boards and the web scraper only, to protect your
              metered quotas. Run a manual scan to include Adzuna, JSearch, and Firecrawl.
            </p>
          </div>
        )}
      </div>

      {/* PROGRESSIVE DISCLOSURE TOGGLE */}
      <div className="border-t border-b border-[var(--color-border-default)] py-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] hover:opacity-80 transition-opacity"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent-muted)]" />
            {showAdvanced ? "Hide detailed preferences & cost controls" : "Refine preferences (Seniority, Salary, Cost Filters, Sources) →"}
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* EXPANDABLE REFINEMENTS SECTION */}
      {showAdvanced && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Seniority & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                Seniority level
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
              >
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-2">
                Employment type
              </label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPE_OPTIONS.map((type) => {
                  const selected = employmentTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleEmploymentType(type)}
                      className={cn(
                        "min-h-[44px] border px-3 text-sm font-sans transition-colors",
                        selected
                          ? "border-text-primary bg-text-primary text-[var(--color-bg-base)]"
                          : "border-border-default text-text-secondary hover:border-text-primary hover:text-text-primary",
                      )}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs font-sans text-text-muted">
                Leave every type selected to search them all.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                Minimum salary
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                placeholder="e.g. 2000000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                Currency
              </label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
              >
                <option value="INR" className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">INR (₹)</option>
                <option value="USD" className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">USD ($)</option>
                <option value="EUR" className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">EUR (€)</option>
                <option value="GBP" className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* DETERMINISTIC PRE-FILTER / COST SAVERS SECTION */}
          <div className="p-5 border border-[var(--color-border-default)] bg-[var(--color-accent)]/5 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[var(--color-accent-muted)] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--color-text-primary)]">
                  Deterministic Pre-filtering & Cost Control
                </h4>
                <p className="text-xs font-sans text-[var(--color-text-secondary)] mt-1">
                  Keywords and exclusions run in the deterministic pre-filter before any Claude model call — so every posting they drop is money not spent.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                  Must-have keywords (Narrows)
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Next.js, Node.js"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
                />
                <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                  Postings must match at least one keyword when set. Unmatched postings are dropped before evaluation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                    Exclude keywords (Removes)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WordPress, PHP, legacy"
                    value={excludeKeywordsText}
                    onChange={(e) => setExcludeKeywordsText(e.target.value)}
                    className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
                  />
                  <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                    Postings containing these words are dropped immediately.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                    Excluded companies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spam Corp, Agency X"
                    value={excludedCompaniesText}
                    onChange={(e) => setExcludedCompaniesText(e.target.value)}
                    className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-sans text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
                  />
                  <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                    Comma-separated list of companies to ignore.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SOURCES & BUDGET CAP */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-2">
                Job sources to scan
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SOURCE_OPTIONS.map((src) => {
                  const checked = sources.includes(src.id);
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => toggleSource(src.id)}
                      className={`p-3 border text-left flex items-center justify-between transition-colors rounded-none ${
                        checked
                          ? "border-[var(--color-text-primary)] bg-[var(--color-accent)]/10 font-semibold"
                          : "border-[var(--color-border-default)] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono uppercase text-[var(--color-text-primary)]">
                          {src.label}
                        </span>
                        {src.isFree && (
                          <span className="block text-[10px] font-mono text-[var(--color-accent-muted)] uppercase">
                            FREE ATS BOARD
                          </span>
                        )}
                      </div>
                      {checked && <Check className="w-4 h-4 text-[var(--color-text-primary)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-2">
                Greenhouse, Lever, and Ashby are direct ATS job boards and cost nothing to search.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--color-border-default)]">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                  Max jobs evaluated per scan (Hard Cap: 60)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={maxJobsPerScan}
                  onChange={(e) => setMaxJobsPerScan(Number(e.target.value))}
                  className="w-full p-3 bg-transparent border border-[var(--color-border-default)] text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] rounded-none"
                />
                <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                  Default is 40. Values over 60 are clamped server-side to protect your AI budget.
                </p>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoEvaluate}
                    onChange={(e) => setAutoEvaluate(e.target.checked)}
                    className="w-4 h-4 rounded-none accent-[var(--color-text-primary)]"
                  />
                  <div>
                    <span className="text-sm font-sans font-medium text-[var(--color-text-primary)] block">
                      Auto-evaluate new matches
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      Automatically run AI score evaluation on newly found jobs.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <div className="flex justify-end pt-4 border-t border-[var(--color-border-default)]">
        <Button variant="accent" size="md" type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
