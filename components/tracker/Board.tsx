"use client";

import React, { useState, useEffect, useRef } from "react";
import { ApplicationStatus } from "@prisma/client";
import { STATUS_ORDER, TERMINAL } from "@/lib/tracker/states";
import { ApplicationBoardItem, BoardColumns } from "@/lib/db/applications";
import { Column } from "./Column";
import { AlertCircle, Search } from "lucide-react";
import { errorMessage as messageOf } from "@/lib/artifacts";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  EVALUATED: "Evaluated",
  APPLIED: "Applied",
  RESPONDED: "Responded",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  DISCARDED: "Discarded",
  SKIP: "Skip",
  HIRED: "Hired",
};

interface DragPayload {
  id: string;
  status: ApplicationStatus;
  boardOrder: number;
}

interface BoardProps {
  initialColumns: BoardColumns;
  totalCount: number;
}

export function Board({ initialColumns, totalCount }: BoardProps) {
  const [columns, setColumns] = useState<BoardColumns>(initialColumns);
  const [viewMode, setViewMode] = useState<"active" | "all">("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragPayload | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Keep a ref for rolling back optimistic mutations
  const previousColumnsRef = useRef<BoardColumns>(initialColumns);

  // A server refresh hands down new columns. Adopt them during render, so
  // the board never shows one frame of the pre-refresh arrangement.
  const [adoptedColumns, setAdoptedColumns] = useState(initialColumns);
  if (adoptedColumns !== initialColumns) {
    setAdoptedColumns(initialColumns);
    setColumns(initialColumns);
  }

  // The rollback snapshot follows whatever is on screen. A drop overwrites
  // it with the pre-drop arrangement before the request goes out, so a
  // failed move restores exactly what the user was looking at.
  useEffect(() => {
    previousColumnsRef.current = columns;
  }, [columns]);

  const activeCount = STATUS_ORDER.filter((s) => !TERMINAL.has(s)).reduce(
    (sum, s) => sum + (columns[s]?.length || 0),
    0
  );

  // Filter columns to display based on viewMode
  const displayedStatuses = STATUS_ORDER.filter((status) => {
    if (viewMode === "active") {
      return !TERMINAL.has(status);
    }
    return true;
  });

  const handleDragStart = (_e: React.DragEvent, app: ApplicationBoardItem) => {
    setDraggedItem({
      id: app.id,
      status: app.status,
      boardOrder: app.boardOrder,
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDropCard = async (
    targetStatus: ApplicationStatus,
    targetCardId?: string
  ) => {
    if (!draggedItem) return;
    const { id: appId, status: sourceStatus } = draggedItem;

    setErrorMessage(null);

    // Save previous snapshot for rollback
    previousColumnsRef.current = { ...columns };

    // Find the dragged card
    const sourceList = [...(columns[sourceStatus] || [])];
    const cardIndex = sourceList.findIndex((item) => item.id === appId);
    if (cardIndex === -1) return;

    const [cardToMove] = sourceList.splice(cardIndex, 1);
    const updatedCard: ApplicationBoardItem = {
      ...cardToMove,
      status: targetStatus,
      statusChangedAt:
        sourceStatus !== targetStatus ? new Date() : cardToMove.statusChangedAt,
    };

    // Calculate insertion index in target column
    const targetList =
      sourceStatus === targetStatus
        ? sourceList
        : [...(columns[targetStatus] || [])];

    let insertIndex = targetList.length;
    if (targetCardId) {
      const idx = targetList.findIndex((c) => c.id === targetCardId);
      if (idx !== -1) {
        insertIndex = idx;
      }
    }

    targetList.splice(insertIndex, 0, updatedCard);

    // Optimistically update columns state
    const nextColumns: BoardColumns = {
      ...columns,
      [sourceStatus]: sourceStatus === targetStatus ? targetList : sourceList,
      ...(sourceStatus !== targetStatus ? { [targetStatus]: targetList } : {}),
    };

    setColumns(nextColumns);
    setDraggedItem(null);

    // Execute API call based on whether it's a status transition or in-column reorder
    try {
      if (sourceStatus !== targetStatus) {
        const res = await fetch(`/api/applications/${appId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            boardOrder: insertIndex,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error?.message || "Failed to update status");
        }
      } else {
        const orderedIds = targetList.map((c) => c.id);
        const res = await fetch("/api/applications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnStatus: targetStatus,
            orderedIds,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error?.message || "Failed to reorder column");
        }
      }
    } catch (err) {
      console.error("Board update error, reverting:", err);
      // Revert optimistic update
      setColumns(previousColumnsRef.current);
      setErrorMessage(
        `${messageOf(err, "The move didn't save.")} The card is back in its previous column — try moving it again.`
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full select-none">
      {/* Board Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">
            Application Board
          </h2>
          <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {totalCount} {totalCount === 1 ? "application" : "applications"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick filter by company / title */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter company or role..."
              aria-label="Filter cards by company or role"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-6 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-44 sm:w-60 transition-all"
            />
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear the card filter"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 p-0.5 text-xs text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            )}
          </div>

          {/* View mode toggle: Active (4) vs All (9) */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium shadow-2xs">
            <button
              onClick={() => setViewMode("active")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "active"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "all"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All stages ({totalCount})
            </button>
          </div>
        </div>
      </div>

      {/* Rollback Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2.5 text-xs text-rose-700 font-medium"
        >
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="px-2 underline hover:no-underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Board Columns Horizontal Scroll Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-100/70">
        <div className="inline-flex gap-4 h-full min-w-full pb-2">
          {displayedStatuses.map((status) => {
            const rawCards = columns[status] || [];
            const filteredCards = searchQuery.trim()
              ? rawCards.filter((card) => {
                  const q = searchQuery.toLowerCase();
                  return (
                    card.job.company.toLowerCase().includes(q) ||
                    card.job.title.toLowerCase().includes(q)
                  );
                })
              : rawCards;

            return (
              <Column
                key={status}
                status={status}
                title={STATUS_LABELS[status]}
                applications={filteredCards}
                onDropCard={handleDropCard}
                onDragStartCard={handleDragStart}
                onDragEndCard={handleDragEnd}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

