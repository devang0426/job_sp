"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What exactly is Job Console?",
    a: "Job Console is a filter for your job search. Instead of searching through hundreds of noisy postings across multiple websites, it pulls verified jobs directly from company career portals (Greenhouse, Lever, Ashby, RemoteOK), reads each job against your CV, and gives you an honest 0–100 match rating so you know where to spend your time.",
  },
  {
    q: "Does this app apply to jobs automatically on my behalf?",
    a: "No. This is a core product rule. Auto-apply bots spam recruiters and get candidates blacklisted. We evaluate and recommend — you decide and apply. Every job row gives you a direct link to the company's official application page, and we help you tailor your resume bullets so your application stands out.",
  },
  {
    q: "How does the 0–100 match score work?",
    a: "Our AI evaluates the job description against your CV across 5 dimensions: Role Fit (30%), Skills Match (30%), Experience Depth (20%), Domain Context (10%), and Logistics/Remote (10%). If a job requires mandatory skills you lack, the score is capped so you aren't misled into applying for a role that will silently reject you.",
  },
  {
    q: "Does the CV Tailor make up fake experience or buzzwords?",
    a: "Never. Our tailoring studio enforces strict honesty rules: it only rewrites your existing experience to clearly answer the job's stated requirements. It will never invent jobs, dates, or technologies you haven't worked with.",
  },
  {
    q: "Where do the job postings come from?",
    a: "We connect directly to official applicant tracking systems (Greenhouse, Lever, Ashby) used by top tech companies, plus verified remote portals (RemoteOK, WeWorkRemotely, Adzuna). Stale listings over 30 days old and duplicate postings are removed automatically.",
  },
  {
    q: "Can I track my applications and schedule follow-ups?",
    a: "Yes! When you find a job you like, save it to your Kanban Tracker. Move it through Applied, Responded, Interview, and Offer stages. The tracker tells you how many days an application has been waiting, and generates concise 150-word follow-up emails when you're ready to check in.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 px-4 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="font-mono text-[11px] text-blue-600 font-bold uppercase tracking-wider mb-2">
            COMMON QUESTIONS
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Everything you need to know about how Job Console works in simple words.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.q}
                className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/80 pt-3 bg-white">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
