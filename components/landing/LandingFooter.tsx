import Link from "next/link";
import { Terminal, ArrowRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600 py-14 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        {/* Top Banner CTA */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 tracking-tight">
              Ready to find jobs you actually match?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Run your first verified scan in under 60 seconds with your active CV.
            </p>
          </div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <span>Launch Free Console</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Links & Brand Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-xs font-sans">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <Terminal className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight">Job Console</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              AI match engine and career dispatch console for engineers and technical professionals.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-slate-600">
              <li><Link href="/feed" className="hover:text-blue-600 transition-colors">Job Feed</Link></li>
              <li><Link href="/scans" className="hover:text-blue-600 transition-colors">Scan Dashboard</Link></li>
              <li><Link href="/tracker" className="hover:text-blue-600 transition-colors">Kanban Tracker</Link></li>
              <li><Link href="/studio/cv" className="hover:text-blue-600 transition-colors">CV Studio</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
              Direct Sources
            </h4>
            <ul className="space-y-2 font-mono text-[11px] text-slate-600">
              <li>Greenhouse Direct</li>
              <li>Lever Portals</li>
              <li>Ashby API</li>
              <li>Adzuna Ingestion</li>
              <li>RemoteOK Feed</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-3">
              Telemetry Status
            </h4>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">AI Workers Operational</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">Database Connected</span>
              </div>
              <p className="text-[10.5px] text-slate-500 pt-1">
                Deterministic Scoring Engine v1.0
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <p>© 2026 Job Console. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="hover:text-slate-900 transition-colors">Preferences</Link>
            <Link href="/feed" className="hover:text-slate-900 transition-colors">Dispatch Console</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
