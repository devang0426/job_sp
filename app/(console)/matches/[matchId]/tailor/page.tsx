import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  TailorPanel,
  type MatchCvTip,
  type MatchGap,
} from "@/components/editor/TailorPanel";
import { asReportList } from "@/lib/db/matches";
import { ArtifactKind } from "@prisma/client";

export const runtime = "nodejs";

export default async function MatchTailorPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireUser();
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    include: {
      job: true,
      resume: true,
      application: true,
    },
  });

  if (!match) {
    notFound();
  }

  // Fetch existing CV_VARIANT artifact if one exists
  const existingArtifact = await prisma.artifact.findFirst({
    where: {
      matchId: match.id,
      userId: user.id,
      kind: ArtifactKind.CV_VARIANT,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-53px)] bg-bg-base text-text-primary">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-border-default px-6 py-3 bg-bg-surface select-none">
        <Link
          href={`/feed/${match.jobId}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary hover:text-text-primary uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Match report
        </Link>

        <div className="flex items-center gap-3">
          <span className="eyebrow text-text-muted">CV TAILORING STUDIO</span>
          <span className="font-mono text-xs text-text-muted">
            {match.job.company}
          </span>
        </div>
      </div>

      {/* Two-Pane Editor Panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <TailorPanel
          matchId={match.id}
          initialArtifact={existingArtifact}
          match={{
            id: match.id,
            score: match.score,
            recommendation: match.recommendation,
            summary: match.summary,
            gaps: asReportList<MatchGap>(match.gaps),
            cvTips: asReportList<MatchCvTip>(match.cvTips),
            requirements: asReportList(match.requirements),
            job: {
              id: match.job.id,
              title: match.job.title,
              company: match.job.company,
              location: match.job.location,
              isRemote: match.job.isRemote,
              applyUrl: match.job.applyUrl,
              descriptionText: match.job.descriptionText,
            },
          }}
        />
      </div>
    </div>
  );
}
