import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function EmailStudioPage() {
  const user = await requireUser();

  const artifacts = await prisma.artifact.findMany({
    where: {
      userId: user.id,
      kind: "FOLLOW_UP_EMAIL",
    },
    include: {
      application: {
        include: {
          job: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border-default pb-6">
        <p className="eyebrow text-text-muted mb-1">Outreach studio</p>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
          <h1 className="display text-display text-text-primary">
            Application emails
          </h1>
          <span className="font-mono text-data text-text-muted">
            <span className="font-bold text-text-primary tabular-nums">
              {artifacts.length}
            </span>{" "}
            drafts generated
          </span>
        </div>
        <p className="text-body text-text-secondary mt-2 max-w-2xl">
          Follow-up email drafts generated from an application&apos;s context collect
          here. Every draft lands editable — nothing is sent for you.
        </p>
      </div>

      {artifacts.length === 0 ? (
        <EmptyState
          label="No drafts yet"
          action={
            <Link href="/tracker">
              <Button variant="ghost" size="sm">
                Go to the tracker
              </Button>
            </Link>
          }
        >
          Open a saved application and generate a follow-up. The draft is
          written from that application&apos;s match report and its status, and
          it lands here editable.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {artifacts.map((art) => {
            const effectiveBody = art.editedContent || art.content;
            const wordCount = effectiveBody.trim() ? effectiveBody.trim().split(/\s+/).length : 0;

            return (
              <div
                key={art.id}
                className="border border-border-default bg-bg-surface p-5 space-y-3 hover:border-text-primary transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
                  <div>
                    <h3 className="heading text-heading text-text-primary">
                      {art.subject || "Follow-up email"}
                    </h3>
                    {art.application && (
                      <p className="text-data text-text-secondary font-mono mt-0.5">
                        {art.application.job.title} at {art.application.job.company}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-label text-text-muted shrink-0">
                    {art.promptVersion && (
                      <span className="px-1.5 py-0.5 border border-border-default">
                        {art.promptVersion}
                      </span>
                    )}
                    {art.costUsd && (
                      <span className="px-1.5 py-0.5 border border-border-default tabular-nums">
                        ${Number(art.costUsd).toFixed(4)}
                      </span>
                    )}
                    <span className="tabular-nums">
                      {new Date(art.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="font-sans text-data text-text-secondary line-clamp-3 leading-relaxed">
                  {effectiveBody}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border-default/60">
                  <span className="font-mono text-data text-text-muted tabular-nums">
                    {wordCount} words
                    {art.editedContent ? " (edited)" : " (original)"}
                  </span>

                  {art.applicationId && (
                    <Link href={`/tracker/${art.applicationId}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Edit this draft
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
