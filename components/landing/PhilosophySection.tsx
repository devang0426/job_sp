import { ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";

export function PhilosophySection() {
  return (
    <section id="philosophy" className="py-20 px-4 bg-slate-50/70 border-b border-slate-200">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>OUR CORE PROMISE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            The Golden Rule: You Are Always in Control
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
            We evaluate and recommend. <strong>You decide and apply.</strong> We never submit applications, scrape private data, or message recruiters on your behalf.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Contrast 1: The Broken Industry */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                  The Old Way (Job Boards & Bots)
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-medium">HIGH BURNOUT</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-700 leading-relaxed font-sans">
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Applying blind to 200 random jobs with a generic resume and getting 98% ghosted.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Wasting hours on ghost jobs, expired reposts, or roles where you lack hard requirements.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Using spammy auto-apply bots that burn recruiter goodwill and get your profile blacklisted.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              Outcome: Wasted weeks, zero feedback, and endless application fatigue.
            </div>
          </div>

          {/* Contrast 2: The Precision Console */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-blue-500/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  The Job Console Way
                </span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  VERIFIED MATCHES
                </span>
              </div>
              <ul className="space-y-3 text-xs text-slate-800 leading-relaxed font-sans font-medium">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Only apply to high-match roles (75%+) where you have verified, evidenced strengths.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Direct links to the company&apos;s real career portal on Greenhouse, Lever, and Ashby.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Tailored resume bullets and concise follow-up email drafts that you review, edit, and send.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-blue-100 text-[11px] font-mono text-emerald-700 font-semibold flex items-center justify-between">
              <span>Outcome: Zero wasted effort.</span>
              <span>100% Fit Transparency</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
