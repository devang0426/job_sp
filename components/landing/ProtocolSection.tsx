import { UploadCloud, Search, CheckCircle, Kanban } from "lucide-react";

export function ProtocolSection() {
  const steps = [
    {
      number: "01",
      title: "Upload Your CV in 10 Seconds",
      subtitle: "Drop your PDF or paste text",
      icon: UploadCloud,
      whatYouDo: "Upload your existing resume and pick your target job titles, location preferences, and salary floor.",
      whatAppDoes: "Extracts your real skills, past roles, and experience depth into a structured profile without changing your data.",
      tip: "Takes < 1 minute",
    },
    {
      number: "02",
      title: "Scan Real Jobs from Verified Boards",
      subtitle: "Direct ATS syndication",
      icon: Search,
      whatYouDo: "Click 'Run Scan' or enable automated daily scans to pull the latest tech opportunities.",
      whatAppDoes: "Connects directly to Greenhouse, Lever, Ashby, and RemoteOK. It removes expired postings, scam listings, and duplicates automatically.",
      tip: "Zero ghost jobs",
    },
    {
      number: "03",
      title: "Get Honest 0–100 Match Scores",
      subtitle: "Clear recommendations",
      icon: CheckCircle,
      whatYouDo: "Read your job feed. See 🟢 Apply (75%+), 🔵 Consider (50–74%), or ⚫ Skip (<50%).",
      whatAppDoes: "Compares job requirements against your CV. It clearly highlights which qualifications you meet and flags any missing prerequisites.",
      tip: "No black-box guesses",
    },
    {
      number: "04",
      title: "Tailor, Dispatch & Track",
      subtitle: "Apply directly & manage your pipeline",
      icon: Kanban,
      whatYouDo: "Use 1-click tailored resume bullets, generate 150-word follow-up emails, and drag cards on your Kanban board as you progress.",
      whatAppDoes: "Opens the direct company application link. Records every status change (Applied → Interview → Offer) with timestamps.",
      tip: "You stay organized",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="font-mono text-[11px] text-blue-600 font-bold uppercase tracking-wider mb-2">
            STEP-BY-STEP GUIDE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Job Console Works in 4 Simple Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2.5 leading-relaxed">
            No complicated setup. From uploading your CV to tracking interview offers, here is what happens at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      STEP {step.number}
                    </span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {step.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 mb-4">
                    {step.subtitle}
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                    <div>
                      <strong className="text-slate-800 block text-[11px] uppercase font-mono mb-0.5">What you do:</strong>
                      <span>{step.whatYouDo}</span>
                    </div>
                    <div>
                      <strong className="text-slate-800 block text-[11px] uppercase font-mono mb-0.5">What the console does:</strong>
                      <span>{step.whatAppDoes}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Advantage</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {step.tip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
