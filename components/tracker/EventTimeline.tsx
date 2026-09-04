"use client";

import React from "react";
import { ApplicationEvent, EventType } from "@prisma/client";
import { ArrowRight, Clock, History, FileText, CheckCircle, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";

export interface EventTimelineProps {
  events: ApplicationEvent[];
}

/**
 * One tone per event type, drawn from the palette tokens only. Ink for the
 * events the user caused, accent for what the pipeline produced, muted for
 * the rest. (Invariant 8)
 */
const EVENT_TYPE_LABELS: Record<
  EventType,
  { label: string; icon: React.ElementType; color: string }
> = {
  CREATED: {
    label: "Saved to tracker",
    icon: CheckCircle,
    color: "text-text-primary border-border-strong bg-bg-raised",
  },
  STATUS_CHANGED: {
    label: "Status moved",
    icon: ArrowRight,
    color: "text-accent-muted border-accent-muted/40 bg-bg-raised",
  },
  NOTE_ADDED: {
    label: "Note recorded",
    icon: FileText,
    color: "text-text-secondary border-border-default bg-bg-raised",
  },
  ARTIFACT_GENERATED: {
    label: "Draft generated",
    icon: Sparkles,
    color: "text-text-primary border-accent bg-accent/25",
  },
  FOLLOW_UP_SENT: {
    label: "Follow-up marked sent",
    icon: Mail,
    color: "text-text-primary border-accent bg-accent/25",
  },
  REEVALUATED: {
    label: "Re-evaluated",
    icon: History,
    color: "text-accent-muted border-accent-muted/40 bg-bg-raised",
  },
};

function formatTimestamp(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <EmptyState label="No activity yet">
        Every status change on this application is recorded here. Move the
        card to another column and the move appears with its timestamp.
      </EmptyState>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
      {events.map((event) => {
        const meta = EVENT_TYPE_LABELS[event.type] || {
          label: event.type,
          icon: Clock,
          color: "text-slate-600 border-slate-200 bg-slate-50",
        };
        const Icon = meta.icon;

        return (
          <div key={event.id} className="relative group">
            {/* Timeline bullet icon */}
            <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            </div>

            {/* Event Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10.5px] uppercase tracking-wider font-bold",
                      meta.color
                    )}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {meta.label}
                  </span>

                  {/* Status transition chips if status changed */}
                  {event.type === "STATUS_CHANGED" && event.fromStatus && event.toStatus && (
                    <div className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[11px] text-slate-500 font-medium">
                        {event.fromStatus}
                      </span>
                      <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="px-2 py-0.5 bg-blue-50 rounded-md border border-blue-200 text-[11px] font-bold text-blue-700">
                        {event.toStatus}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mono timestamp */}
                <time className="font-mono text-xs tabular-nums text-slate-400 shrink-0">
                  {formatTimestamp(event.createdAt)}
                </time>
              </div>

              {/* Message / context */}
              {event.message && (
                <p className="text-xs text-slate-700 leading-relaxed mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {event.message}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
