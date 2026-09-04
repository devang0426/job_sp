"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ApplicationBoardItem } from "@/lib/db/applications";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/lib/tracker/states";

export interface CardProps {
  application: ApplicationBoardItem;
  index: number;
  onDragStart?: (e: React.DragEvent, app: ApplicationBoardItem) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOverCard?: (e: React.DragEvent, targetId: string) => void;
}

export function formatDaysInStatus(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${days}d`;
}

export function Card({
  application,
  onDragStart,
  onDragEnd,
  onDragOverCard,
}: CardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const daysInStatus = formatDaysInStatus(application.statusChangedAt);
  const matchScore = application.match?.score;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: application.id,
        status: application.status,
        boardOrder: application.boardOrder,
      })
    );
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, application);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };

  const initial = (application.job.company || "C").trim().charAt(0).toUpperCase();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard?.(e, application.id);
      }}
      className={cn(
        "group relative block rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-sm shadow-xs",
        isDragging && "opacity-40 border-dashed border-blue-400 ring-2 ring-blue-400/30"
      )}
    >
      <Link
        href={`/tracker/${application.id}`}
        className="block focus:outline-none"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        {/* Company & Location/Remote */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
              {initial}
            </div>
            <span className="font-semibold text-xs text-slate-800 truncate">
              {application.job.company}
            </span>
          </div>
          {application.job.isRemote && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider shrink-0">
              Remote
            </span>
          )}
        </div>

        {/* Role Title */}
        <h4 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
          {application.job.title}
        </h4>

        {/* Bottom bar: Score meter & days in status */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {matchScore !== null && matchScore !== undefined ? (
              <>
                <ScoreMeter
                  score={matchScore}
                  recommendation={application.match?.recommendation ?? undefined}
                  scale="sm"
                  matchId={application.match?.id}
                />
                <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
                  {matchScore}%
                </span>
              </>
            ) : (
              <span className="font-mono text-[10.5px] text-slate-400">No score</span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-slate-500 shrink-0">
            {application.nextFollowUpAt && (
              <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 text-[10.5px]">
                <Calendar aria-hidden className="w-3 h-3" />
                <span className="sr-only">Follow up on</span>
                {new Date(application.nextFollowUpAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10.5px] font-semibold text-slate-600">
              {daysInStatus}
              <span className="sr-only">
                {" "}in {STATUS_LABEL[application.status].toLowerCase()}
              </span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

