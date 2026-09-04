import { requireUser } from "@/lib/auth";
import { getMatchByJobId } from "@/lib/db/matches";
import { MatchReportClient } from "@/components/report/MatchReportClient";
import { notFound } from "next/navigation";

export const runtime = "nodejs";

export default async function JobReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireUser();
  const { jobId } = await params;

  const data = await getMatchByJobId(jobId, user.id);
  if (!data) {
    notFound();
  }

  return <MatchReportClient initialData={data} />;
}
