import { requireUser } from "@/lib/auth";
import { getMatchByJobId } from "@/lib/db/matches";
import { notFound, redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function JobFeedTailorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireUser();
  const { jobId } = await params;

  const data = await getMatchByJobId(jobId, user.id);
  if (!data || !data.match) {
    notFound();
  }

  redirect(`/matches/${data.match.id}/tailor`);
}
