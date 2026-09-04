import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

/** One row's worth of application, as this page's query returns it. */
type FollowUpApplication = Prisma.ApplicationGetPayload<{
  include: { job: true; match: true; artifacts: true };
}>;

export default async function FollowUpsPage() {
  const user = await requireUser();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch applications with a nextFollowUpAt date
  const applications = await prisma.application.findMany({
    where: {
      userId: user.id,
      nextFollowUpAt: { not: null },
    },
    include: {
      job: true,
      match: true,
      artifacts: {
        where: { kind: "FOLLOW_UP_EMAIL" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { nextFollowUpAt: "asc" },
  });

  const overdueApps = applications.filter(
    (app) => app.nextFollowUpAt && new Date(app.nextFollowUpAt) < startOfToday
  );
  const dueTodayApps = applications.filter(
    (app) =>
      app.nextFollowUpAt &&
      new Date(app.nextFollowUpAt) >= startOfToday &&
      new Date(app.nextFollowUpAt) <= endOfToday
  );
  const upcomingApps = applications.filter(
    (app) => app.nextFollowUpAt && new Date(app.nextFollowUpAt) > endOfToday
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border-default pb-6">
        <p className="eyebrow text-text-muted mb-1">Pipeline outreach</p>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
          <h1 className="display text-display text-text-primary">
            Follow-ups
          </h1>
          <div className="flex items-center gap-4 font-mono text-data text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="tabular-nums font-bold text-[var(--color-state-error)]">
                {overdueApps.length}
              </span>{" "}
              overdue
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="tabular-nums font-bold text-text-primary">
                {dueTodayApps.length}
              </span>{" "}
              due today
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className="tabular-nums font-bold text-text-primary">
                {upcomingApps.length}
              </span>{" "}
              upcoming
            </span>
          </div>
        </div>
        <p className="text-body text-text-secondary mt-2 max-w-2xl">
          Applications with a follow-up date appear here when they come due. The system
          drafts the email; you edit and send it yourself.
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          label="Nothing to follow up"
          action={
            <Link href="/tracker">
              <Button variant="ghost" size="sm">
                Go to the tracker
              </Button>
            </Link>
          }
        >
          Set a follow-up date on a saved application and it appears here on
          the day it comes due.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {/* Overdue Section */}
          {overdueApps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--color-state-error)]" />
                <h2 className="heading text-heading text-[var(--color-state-error)] uppercase tracking-wider font-mono text-sm">
                  Overdue ({overdueApps.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {overdueApps.map((app) => (
                  <FollowUpRow key={app.id} app={app} isOverdue />
                ))}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {dueTodayApps.length > 0 && (
            <div className="space-y-3">
              <h2 className="heading text-heading text-text-primary uppercase tracking-wider font-mono text-sm">
                Due today ({dueTodayApps.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {dueTodayApps.map((app) => (
                  <FollowUpRow key={app.id} app={app} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingApps.length > 0 && (
            <div className="space-y-3">
              <h2 className="heading text-heading text-text-muted uppercase tracking-wider font-mono text-sm">
                Upcoming ({upcomingApps.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {upcomingApps.map((app) => (
                  <FollowUpRow key={app.id} app={app} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({
  app,
  isOverdue,
}: {
  app: FollowUpApplication;
  isOverdue?: boolean;
}) {
  const latestDraft = app.artifacts?.[0];
  const followUpDate = app.nextFollowUpAt ? new Date(app.nextFollowUpAt) : null;

  return (
    <div className="border border-border-default bg-bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-text-primary transition-colors">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="heading font-bold text-text-primary text-base">
            {app.job.title}
          </span>
          <span className="text-text-muted">at</span>
          <span className="text-text-secondary font-medium">{app.job.company}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-data text-text-muted">
          <span className="uppercase text-label px-1.5 py-0.5 border border-border-default">
            {app.status}
          </span>
          {followUpDate && (
            <span
              className={
                isOverdue
                  ? "text-[var(--color-state-error)] font-semibold"
                  : "text-text-primary"
              }
            >
              Follow-up: {followUpDate.toLocaleDateString()}
            </span>
          )}
          {latestDraft && (
            <span className="text-[var(--color-accent-muted)] font-medium flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              Draft ready
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/tracker/${app.id}`}>
          <Button variant="ghost" size="sm">
            Open Application
          </Button>
        </Link>
      </div>
    </div>
  );
}
