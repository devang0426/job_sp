"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Activity, Clock } from "lucide-react";

export interface StatusBarProps {
  initialCounters?: {
    live: number;
    overdue: number;
    dueToday: number;
  };
}

export function StatusBar({ initialCounters }: StatusBarProps) {
  const [counts, setCounts] = useState(
    initialCounters || { live: 0, overdue: 0, dueToday: 0 }
  );

  const fetchCounters = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setCounts(json.data);
        }
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok && active) {
          const json = await res.json();
          if (json.data) {
            setCounts(json.data);
          }
        }
      } catch {
        // Non-fatal
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchCounters();
      }
    };
    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", fetchCounters);

    const interval = setInterval(fetchCounters, 30000);

    return () => {
      active = false;
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", fetchCounters);
      clearInterval(interval);
    };
  }, [fetchCounters]);

  const items = [
    {
      value: counts.live,
      label: "Active Applications",
      icon: Activity,
      textColor: "text-slate-900",
      badgeColor: "bg-slate-100 text-slate-700",
      highlight: false,
    },
    {
      value: counts.dueToday,
      label: "Due Today",
      icon: Clock,
      textColor: counts.dueToday > 0 ? "text-amber-700 font-bold" : "text-slate-900",
      badgeColor: counts.dueToday > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700",
      highlight: counts.dueToday > 0,
    },
    {
      value: counts.overdue,
      label: "Overdue Follow-ups",
      icon: Clock,
      textColor: counts.overdue > 0 ? "text-rose-700 font-bold" : "text-slate-900",
      badgeColor: counts.overdue > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700",
      highlight: counts.overdue > 0,
    },
  ];

  return (
    <div
      aria-label="Pipeline counters"
      className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-5 select-none"
    >
      <div className="flex items-center gap-5 text-xs">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="mr-3 text-slate-200">|</span>}
              <Icon className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">{item.label}:</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center px-1.5 py-0.2 rounded-md font-mono text-xs font-bold tabular-nums",
                  item.badgeColor
                )}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>System Ready</span>
      </div>
    </div>
  );
}


