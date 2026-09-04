"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRec = searchParams.get("recommendation") || "";
  const currentMinScore = searchParams.get("minScore") || "";
  const currentSource = searchParams.get("source") || "";
  const currentRemote = searchParams.get("remote") || "";
  const currentCompany = searchParams.get("company") || "";
  const currentSort = searchParams.get("sort") || "score";

  const [companyInput, setCompanyInput] = useState(currentCompany);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("cursor");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const hasActiveFilters = Boolean(
    currentRec ||
      currentMinScore ||
      currentSource ||
      currentRemote ||
      currentCompany ||
      (currentSort && currentSort !== "score"),
  );

  const clearAll = useCallback(() => {
    setCompanyInput("");
    router.push(pathname);
  }, [pathname, router]);

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("company", companyInput.trim() || null);
  };

  return (
    <div className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/95 backdrop-blur px-5 py-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Filter Groups */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold pr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
            <span>Filters:</span>
          </div>

          {/* Verdict Recommendation */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
            <Chip
              active={!currentRec}
              size="sm"
              onClick={() => updateParam("recommendation", null)}
            >
              All Verdicts
            </Chip>
            <Chip
              active={currentRec === "APPLY"}
              size="sm"
              onClick={() =>
                updateParam("recommendation", currentRec === "APPLY" ? null : "APPLY")
              }
            >
              Apply (≥75)
            </Chip>
            <Chip
              active={currentRec === "CONSIDER"}
              size="sm"
              onClick={() =>
                updateParam("recommendation", currentRec === "CONSIDER" ? null : "CONSIDER")
              }
            >
              Consider (50–74)
            </Chip>
            <Chip
              active={currentRec === "SKIP"}
              size="sm"
              onClick={() =>
                updateParam("recommendation", currentRec === "SKIP" ? null : "SKIP")
              }
            >
              Skip (&lt;50)
            </Chip>
          </div>

          {/* Min Score filter */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
            <Chip
              active={currentMinScore === "75"}
              size="sm"
              onClick={() =>
                updateParam("minScore", currentMinScore === "75" ? null : "75")
              }
            >
              75+ Score
            </Chip>
            <Chip
              active={currentMinScore === "50"}
              size="sm"
              onClick={() =>
                updateParam("minScore", currentMinScore === "50" ? null : "50")
              }
            >
              50+ Score
            </Chip>
          </div>

          {/* Remote Only Toggle */}
          <Chip
            active={currentRemote === "true"}
            size="sm"
            onClick={() =>
              updateParam("remote", currentRemote === "true" ? null : "true")
            }
          >
            Remote Only
          </Chip>

          {/* Source Selector */}
          <select
            value={currentSource}
            onChange={(e) => updateParam("source", e.target.value || null)}
            className="h-7 rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-accent focus:outline-none transition-colors cursor-pointer"
            aria-label="Filter by Job Source"
          >
            <option value="">All Sources</option>
            <option value="GREENHOUSE">Greenhouse</option>
            <option value="LEVER">Lever</option>
            <option value="ASHBY">Ashby</option>
            <option value="ADZUNA">Adzuna</option>
            <option value="JSEARCH">JSearch</option>
            <option value="SCRAPED">RemoteOK</option>
            <option value="FIRECRAWL">WeWorkRemotely</option>
            <option value="MANUAL">Manual</option>
          </select>

          {/* Company Search Input */}
          <form
            key={currentCompany}
            onSubmit={handleCompanySubmit}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Search company..."
              defaultValue={currentCompany}
              onChange={(e) => setCompanyInput(e.target.value)}
              onBlur={() => updateParam("company", companyInput.trim() || null)}
              className="h-7 w-44 rounded-md border border-slate-200 bg-white pl-7 pr-6 text-xs text-slate-900 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all"
            />
            <Search className="absolute left-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            {companyInput && (
              <button
                type="button"
                onClick={() => {
                  setCompanyInput("");
                  updateParam("company", null);
                }}
                className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </form>

          {/* Clear All button */}
          {hasActiveFilters && (
            <Button
              variant="danger"
              size="xs"
              onClick={clearAll}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" /> Reset Filters
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold pr-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-700" />
            <span>Sort:</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
            <Chip
              active={currentSort === "score"}
              size="sm"
              onClick={() => updateParam("sort", "score")}
            >
              Match Score
            </Chip>
            <Chip
              active={currentSort === "postedAt"}
              size="sm"
              onClick={() => updateParam("sort", "postedAt")}
            >
              Posted Date
            </Chip>
          </div>
        </div>
      </div>
    </div>
  );
}


