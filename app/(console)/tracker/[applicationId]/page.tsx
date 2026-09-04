import { requireUser } from "@/lib/auth";
import { getApplicationDetail } from "@/lib/db/applications";
import { notFound } from "next/navigation";
import { ApplicationDetailView } from "./ApplicationDetailView";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const user = await requireUser();
  const { applicationId } = await params;

  const application = await getApplicationDetail(applicationId, user.id);

  if (!application) {
    notFound();
  }

  return <ApplicationDetailView initialApplication={application} />;
}
