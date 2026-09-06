"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Radar, ExternalLink, ShieldCheck, Check, Play, X, Sparkles } from "lucide-react";
import { ScoreMeter } from "@/components/meter/ScoreMeter";

const DEMO_POSTINGS = [
  {
    id: "demo-1",
    title: "Senior Full-Stack Engineer",
    company: "Stripe",
    initial: "S",
    location: "Remote / Hybrid",
    source: "Greenhouse",
    score: 94,
    recommendation: "APPLY" as const,
    why: "You meet 5 out of 5 required skills (React, Node.js, PostgreSQL, Distributed Systems, Docker).",
    matchedSkills: ["React & TypeScript", "PostgreSQL at Scale", "Node.js API", "Docker / AWS"],
    time: "Posted 2h ago",
  },
  {
    id: "demo-2",
    title: "Backend Platform Engineer",
    company: "Linear",
    initial: "L",
    location: "Remote (Global)",
    source: "Ashby",
    score: 82,
    recommendation: "CONSIDER" as const,
    why: "Strong engineering background, but you're missing Rust experience mentioned in nice-to-have.",
    matchedSkills: ["TypeScript", "GraphQL", "High QPS Databases"],
    time: "Posted 5h ago",
  },
  {
    id: "demo-3",
    title: "Lead Infrastructure Architect",
    company: "Datadog",
    initial: "D",
    location: "San Francisco, CA",
    source: "Lever",
    score: 38,
    recommendation: "SKIP" as const,
    why: "Missing mandatory 5+ years Kubernetes cluster operator experience. Hard score cap applied.",
    matchedSkills: ["General Linux", "Cloud Basics"],
    time: "Posted 1d ago",
  },
];

export function LandingHero() {
  const [selectedPosting, setSelectedPosting] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const activePosting = DEMO_POSTINGS[selectedPosting];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVideoOpen(false);
      }
    };
    if (isVideoOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVideoOpen]);

  return (
    <section className="relative pt-24 pb-14 md:pt-28 md:pb-20 px-4 max-w-6xl mx-auto">
      {/* Precision Grid Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Simple Plain English Explanation */}
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          {/* Friendly pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 font-mono text-[11px] font-semibold mb-4 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>NO GHOST JOBS · HONEST 0–100 MATCH SCORES</span>
          </div>

          {/* Big, Clear Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4">
            Find jobs that actually match your CV.{" "}
            <span className="text-blue-600 block">Stop applying in the dark.</span>
          </h1>

          {/* Simple, clear subtext */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-[52ch] mb-6">
            Job boards give you 500 random listings and silent rejections. <strong>Job Console</strong> pulls real postings from verified company boards, compares each one against your actual resume, and tells you exactly: <strong>Apply</strong>, <strong>Consider</strong>, or <strong>Skip</strong>.
          </p>

          {/* Quick 3-point explanation */}
          <div className="space-y-2 mb-8 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span><strong>Real postings only:</strong> Sourced directly from Greenhouse, Lever, Ashby, and RemoteOK.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span><strong>Transparent scores:</strong> See the exact requirements you meet and where you have gaps.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span><strong>You are in control:</strong> We recommend — you decide and apply via direct company links.</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-8 w-full sm:w-auto">
            <Link
              href="/feed"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-sm transition-all cursor-pointer w-full sm:w-auto"
            >
              <Radar className="h-3.5 w-3.5" />
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setIsVideoOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] text-slate-700 text-xs font-semibold uppercase tracking-wider shadow-2xs transition-all cursor-pointer w-full sm:w-auto group"
            >
              <span className="h-4 w-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
              </span>
              <span>See How It Works</span>
            </button>
          </div>

          {/* Trust strip */}
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 border-t border-slate-200/80 pt-4 w-full">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-slate-800 font-medium">Zero Hallucinations</span>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <span className="text-slate-800 font-medium">100% Honest Scoring</span>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <span className="text-slate-800 font-medium">Free to Try</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Feed Simulator (Click to test) */}
        <div id="interactive-demo" className="lg:col-span-6 w-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Window Command Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/80 text-slate-800 border-b border-slate-200 font-mono text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                </div>
                <span className="text-[11px] text-slate-600 font-medium ml-1">
                  Live Scored Feed · Click any job to inspect
                </span>
              </div>
              <span className="text-[10.5px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live ATS Sync</span>
              </span>
            </div>

            {/* Posting Selection Rows */}
            <div className="divide-y divide-slate-100 bg-white">
              {DEMO_POSTINGS.map((item, idx) => {
                const isSelected = selectedPosting === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPosting(idx)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 border-l-3 border-l-blue-600"
                        : "hover:bg-slate-50 border-l-3 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Monogram */}
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {item.initial}
                      </div>
                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="text-slate-800 font-semibold">{item.company}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">{item.source}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score + Chip */}
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div className="flex items-center gap-1.5">
                        <ScoreMeter score={item.score} recommendation={item.recommendation} scale="sm" />
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {item.score}%
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.recommendation === "APPLY"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.recommendation === "CONSIDER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {item.recommendation}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Posting Details Telemetry Drawer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs font-sans space-y-3">
              <div className="space-y-1">
                <div className="font-mono text-[10.5px] uppercase font-bold text-slate-500">
                  Why this recommendation?
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {activePosting.why}
                </p>
              </div>

              {/* Skills Evidenced Pills */}
              <div className="space-y-1 pt-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase">
                  Verified Skills on Your CV:
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {activePosting.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10.5px] font-medium"
                    >
                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-mono">
                  Location: <strong className="text-slate-800">{activePosting.location}</strong>
                </span>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-1 font-bold text-xs text-blue-600 hover:text-blue-700"
                >
                  <span>Open Full Match Report</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sourced Syndication Strip */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
          We Pull Jobs Directly From Company Career Portals:
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-700">
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-semibold">Greenhouse</span>
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-semibold">Lever</span>
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-semibold">Ashby</span>
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-semibold">RemoteOK</span>
          <span className="bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-semibold">Adzuna</span>
        </div>
      </div>

      {/* Video Demo Modal Dialog */}
      {isVideoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 id="video-modal-title" className="text-xs sm:text-sm font-semibold tracking-tight">
                  Job Console Walkthrough · Product Demo
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  <Sparkles className="h-3 w-3 text-blue-400" />
                  Full Feature Demo
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close demo video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative bg-black w-full flex items-center justify-center aspect-video max-h-[75vh]">
              <video
                src="/demo.webm"
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                Watch how real ATS postings are scored, tailored, and dispatched directly.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVideoOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href="/feed"
                  onClick={() => setIsVideoOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs"
                >
                  <span>Try It Yourself</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
