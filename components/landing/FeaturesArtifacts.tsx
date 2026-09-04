"use client";

import { useState } from "react";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { LayoutList, FileSearch, Wand2, Columns3, Check, Mail } from "lucide-react";

export function FeaturesArtifacts() {
  const [activeTab, setActiveTab] = useState<"feed" | "report" | "tailor" | "tracker">("feed");

  return (
    <section id="features" className="py-20 px-4 bg-slate-100/70 border-b border-slate-200">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="font-mono text-[11px] text-blue-600 font-bold uppercase tracking-wider mb-2">
            ALL-IN-ONE PLATFORM
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Explore Every Tool Inside Job Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2.5">
            Click through the 4 core tools below to see exactly how each screen helps your search.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("feed")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === "feed"
                ? "bg-blue-600 text-white font-semibold shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs font-medium"
            }`}
          >
            <LayoutList className={`h-4 w-4 ${activeTab === "feed" ? "text-white" : "text-blue-600"}`} />
            <span>1. Scored Job Feed</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === "report"
                ? "bg-blue-600 text-white font-semibold shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs font-medium"
            }`}
          >
            <FileSearch className={`h-4 w-4 ${activeTab === "report" ? "text-white" : "text-emerald-600"}`} />
            <span>2. Match Report</span>
          </button>

          <button
            onClick={() => setActiveTab("tailor")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === "tailor"
                ? "bg-blue-600 text-white font-semibold shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs font-medium"
            }`}
          >
            <Wand2 className={`h-4 w-4 ${activeTab === "tailor" ? "text-white" : "text-indigo-600"}`} />
            <span>3. CV Tailor Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("tracker")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === "tracker"
                ? "bg-blue-600 text-white font-semibold shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs font-medium"
            }`}
          >
            <Columns3 className={`h-4 w-4 ${activeTab === "tracker" ? "text-white" : "text-amber-600"}`} />
            <span>4. Kanban & Emails</span>
          </button>
        </div>

        {/* Dynamic Display Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm transition-all">
          {/* TAB 1: JOB FEED */}
          {activeTab === "feed" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  Feature 01 · Feed & Filters
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  One Unified Feed for All Your Target Roles
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Instead of checking 10 different job boards every morning, see all verified postings in one clean, comparable table with instant 0–100 scores.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>1-Click Filtering:</strong> Filter by Apply (&gt;75%), Remote only, or specific ATS sources.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Direct Apply Links:</strong> Takes you straight to the real company application form.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>No Duplicates:</strong> If the same job is on Adzuna and Greenhouse, it collapses into 1 row.</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 bg-slate-50 rounded-xl border border-slate-200 p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-500 text-[11px]">
                  <span>MATCH SCORE</span>
                  <span>COMPANY & TITLE</span>
                  <span>VERDICT</span>
                </div>
                {/* Row 1 */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <ScoreMeter score={94} recommendation="APPLY" scale="sm" />
                    <span className="font-bold text-slate-900">94%</span>
                  </div>
                  <div className="font-sans text-xs">
                    <strong className="text-slate-900 block">Senior Distributed Systems</strong>
                    <span className="text-slate-500 text-[11px]">Stripe · Remote</span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    APPLY
                  </span>
                </div>
                {/* Row 2 */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <ScoreMeter score={82} recommendation="CONSIDER" scale="sm" />
                    <span className="font-bold text-slate-900">82%</span>
                  </div>
                  <div className="font-sans text-xs">
                    <strong className="text-slate-900 block">Full-Stack Platform Eng</strong>
                    <span className="text-slate-500 text-[11px]">Vercel · San Francisco</span>
                  </div>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    CONSIDER
                  </span>
                </div>
                {/* Row 3 */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 opacity-60">
                  <div className="flex items-center gap-2">
                    <ScoreMeter score={38} recommendation="SKIP" scale="sm" />
                    <span className="font-bold text-slate-900">38%</span>
                  </div>
                  <div className="font-sans text-xs">
                    <strong className="text-slate-900 block">Lead Infra Architect</strong>
                    <span className="text-slate-500 text-[11px]">Datadog · Missing Prerequisites</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    SKIP
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATCH REPORT */}
          {activeTab === "report" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  Feature 02 · Honest Match Report
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Know Exactly Why You Match Before Spending Time
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every scored job gives you an in-depth report showing the 5 scoring dimensions, your key strengths, specific gaps, and a 6-signal anti-scam check.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>5 Dimensions:</strong> Role Fit (30%), Skills (30%), Depth (20%), Domain (10%), Logistics (10%).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Requirement Checklist:</strong> Shows which job requirements your CV actually proves.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Hard Caps:</strong> If a job demands a skill you completely lack, the score is capped so you don&apos;t get misled.</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Stripe · Senior Full-Stack</span>
                    <h4 className="text-sm font-bold text-slate-900">Match Evaluation Breakdown</h4>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    Score: 94 / 100
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Role Fit (30%)</span>
                    <span className="font-bold text-slate-900">95%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[95%]" />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Skills Evidence (30%)</span>
                    <span className="font-bold text-slate-900">96%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[96%]" />
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">Experience Depth & Scale (20%)</span>
                    <span className="font-bold text-slate-900">90%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[90%]" />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs font-sans text-slate-700">
                  <strong className="text-slate-900 block mb-1 text-[11px] font-mono uppercase">Key Strengths Found:</strong>
                  Your experience with PostgreSQL query optimization directly aligns with their high-throughput database requirements.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TAILORING */}
          {activeTab === "tailor" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs font-bold text-indigo-700 uppercase bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                  Feature 03 · CV Tailor Studio
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Tailor Your Resume Without Inventing Fake Skills
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Generic resumes get rejected by recruiters. Our Studio rewrites your existing experience to highlight the exact keywords and metrics the hiring manager wants.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Honesty First:</strong> It never fabricates experience you don&apos;t have.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Requirement Citing:</strong> Every suggestion explains which job requirement it answers.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>1-Click Copy:</strong> Copy individual bullets or the full tailored variant into your resume editor.</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
                    Original Bullet on Your Resume:
                  </span>
                  <p className="text-slate-600 italic">
                    &quot;Built backend services and managed PostgreSQL databases for client web applications.&quot;
                  </p>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-mono text-blue-700 font-bold uppercase">
                      Tailored Bullet for Stripe:
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">
                      Answers: High-Throughput DBs
                    </span>
                  </div>
                  <p className="text-slate-900 font-semibold leading-relaxed">
                    &quot;Architected distributed PostgreSQL read-replicas handling 45k QPS, reducing query latency by 35% across production services.&quot;
                  </p>
                  <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Source: Section 2 (Backend Experience)</span>
                    <span className="text-blue-600 font-bold">Ready to Copy</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRACKER */}
          {activeTab === "tracker" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                  Feature 04 · Kanban & Follow-ups
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Track Applications & Write Polite Follow-up Emails
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Never lose track of where you applied. Organize your job search across visual stages, and generate short, polite follow-up email drafts with one click.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Visual Kanban:</strong> Move cards from Saved → Applied → Interview → Offer.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Days-in-Status:</strong> Highlights applications waiting over 7 days for a reply.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>150-Word Follow-ups:</strong> Generates concise, professional follow-up emails ready to send.</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {/* Column 1 */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-700 text-[10.5px]">APPLIED (3)</span>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
                      <strong className="text-slate-900 block font-sans">Stripe</strong>
                      <span className="text-slate-400 text-[10px]">Applied 4d ago</span>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-blue-700 text-[10.5px]">INTERVIEW (1)</span>
                    <div className="p-2 bg-blue-50/60 rounded border border-blue-200 text-[11px]">
                      <strong className="text-slate-900 block font-sans">Linear</strong>
                      <span className="text-blue-600 text-[10px]">Round 2 Today</span>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-emerald-700 text-[10.5px]">OFFER (1)</span>
                    <div className="p-2 bg-emerald-50/60 rounded border border-emerald-200 text-[11px]">
                      <strong className="text-slate-900 block font-sans">Vercel</strong>
                      <span className="text-emerald-700 text-[10px]">Reviewing</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-slate-700">Follow-up due for Stripe (4 days since applied)</span>
                  </div>
                  <span className="text-blue-600 font-bold text-[11px] font-mono">Draft Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
