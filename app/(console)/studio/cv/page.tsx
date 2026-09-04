import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArtifactKind } from "@prisma/client";
import { ResumeUpload } from "@/components/editor/ResumeUpload";
import Link from "next/link";
import { Wand2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { artifactInputs } from "@/lib/artifacts";

export const runtime = "nodejs";

export default async function CvStudioPage() {
  const user = await requireUser();

  const tailoredVariants = await prisma.artifact.findMany({
    where: {
      userId: user.id,
      kind: ArtifactKind.CV_VARIANT,
    },
    include: {
      job: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          CV Studio
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload and manage your CVs for job match evaluation and role-specific tailoring.
        </p>
      </div>

      {/* Resume Upload and Management Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase font-mono">
          Active CV
        </h2>
        <ResumeUpload />
      </section>

      {/* Tailored CV Variants Section */}
      <section className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-600" />
              Tailored CV Guidance ({tailoredVariants.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-specific section rewrites generated from match evaluation reports.
            </p>
          </div>
        </div>

        {tailoredVariants.length === 0 ? (
          <EmptyState
            label="No tailoring yet"
            action={
              <Link href="/feed">
                <Button variant="ghost" size="sm">
                  Go to the job feed
                </Button>
              </Link>
            }
          >
            Open a match report and choose &ldquo;Tailor CV for this role&rdquo;.
            The rewrites it suggests are grounded in that report&apos;s gaps, and
            they collect here.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tailoredVariants.map((item) => {
              const inputs = artifactInputs(item);
              return (
                <div
                  key={item.id}
                  className="p-5 bg-bg-surface border border-border-default hover:border-text-primary transition-colors flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <span className="eyebrow text-text-muted">
                      {item.job?.company || inputs?.company || "Saved role"}
                    </span>
                    <h3 className="heading text-heading text-text-primary leading-snug">
                      {item.job?.title || inputs?.jobTitle || "Saved role"}
                    </h3>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-text-muted pt-1">
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{item.promptVersion}</span>
                      <span>•</span>
                      <span>${Number(item.costUsd).toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-default flex items-center justify-between">
                    <span className="text-xs font-mono text-text-secondary">
                      {inputs?.suggestionsCount ? `${inputs.suggestionsCount} rewrites` : "Structured guidance"}
                    </span>
                    {item.matchId && (
                      <Link
                        href={`/matches/${item.matchId}/tailor`}
                        className="inline-flex items-center gap-1 text-xs font-mono uppercase text-text-primary hover:text-[var(--color-accent)] font-semibold"
                      >
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
