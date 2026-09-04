"use client";

import React, { useState } from "react";
import { ApplicationStatus } from "@prisma/client";
import { ApplicationBoardItem } from "@/lib/db/applications";
import { Card } from "./Card";
import { STATUS_TONE, TERMINAL } from "@/lib/tracker/states";
import { cn } from "@/lib/cn";

export interface ColumnProps {
  status: ApplicationStatus;
  title: string;
  applications: ApplicationBoardItem[];
  onDropCard: (targetStatus: ApplicationStatus, targetAppId?: string) => void;
  onDragStartCard?: (e: React.DragEvent, app: ApplicationBoardItem) => void;
  onDragEndCard?: (e: React.DragEvent) => void;
}

export function Column({
  status,
  title,
  applications,
  onDropCard,
  onDragStartCard,
  onDragEndCard,
}: ColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const isTerminal = TERMINAL.has(status);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
    setHoveredCardId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDropCard(status, hoveredCardId || undefined);
    setHoveredCardId(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col flex-shrink-0 w-[290px] sm:w-[320px] h-full rounded-xl border border-slate-200 bg-slate-50/80 transition-all duration-150 shadow-xs overflow-hidden",
        isOver && "border-blue-500 bg-blue-50/60 ring-2 ring-blue-400/30",
        isTerminal && "opacity-90"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white select-none">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("w-2 h-2 rounded-full shrink-0", STATUS_TONE[status])} />
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-900">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs tabular-nums font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {applications.length}
            <span className="sr-only"> cards</span>
          </span>
        </div>
      </div>

      {/* Cards List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[320px]">
        {applications.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-28 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-medium select-none px-3 text-center transition-colors bg-white/50",
              isOver && "border-blue-400 text-blue-600 bg-blue-50/80 font-semibold"
            )}
          >
            {isOver ? "Release to drop here" : "No applications in stage"}
          </div>
        ) : (
          applications.map((app, index) => (
            <Card
              key={app.id}
              application={app}
              index={index}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              onDragOverCard={(_e, targetId) => setHoveredCardId(targetId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

