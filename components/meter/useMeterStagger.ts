"use client";

import { useEffect, useRef, useState } from "react";

export interface UseMeterStaggerOptions {
  /** The final number of filled segments (0–10) */
  targetSegments: number;
  /** Unique match result ID. Prevents re-animating the same result on remount/re-render. */
  matchId?: string;
  /** Whether this result just arrived live (true) or was already present on load (false). */
  isNewArrival?: boolean;
}

// Global set tracking match IDs that have animated during this browser session
const animatedMatchIds = new Set<string>();

/**
 * Orchestrates the score meter staggered segment fill animation.
 * Fills segments one at a time, 40ms apart.
 *
 * Enforces three key constraints:
 * 1. Runs once per match result (tracked by `matchId` and `hasAnimatedRef`).
 * 2. Runs ONLY when a result arrives (`isNewArrival: true`), not when landing on pages with existing results.
 * 3. Disabled when `prefers-reduced-motion: reduce` is set.
 */
export function useMeterStagger({
  targetSegments,
  matchId,
  isNewArrival = false,
}: UseMeterStaggerOptions): number {
  const hasAnimatedRef = useRef(false);

  const [visibleSegments, setVisibleSegments] = useState<number>(() => {
    if (!isNewArrival) return targetSegments;
    if (matchId && animatedMatchIds.has(matchId)) return targetSegments;
    return 0;
  });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      !isNewArrival ||
      prefersReducedMotion ||
      hasAnimatedRef.current ||
      (matchId && animatedMatchIds.has(matchId)) ||
      targetSegments <= 0
    ) {
      setVisibleSegments(targetSegments);
      hasAnimatedRef.current = true;
      if (matchId) animatedMatchIds.add(matchId);
      return;
    }

    let currentCount = 0;
    setVisibleSegments(0);

    const interval = setInterval(() => {
      currentCount += 1;
      setVisibleSegments(currentCount);

      if (currentCount >= targetSegments) {
        clearInterval(interval);
        hasAnimatedRef.current = true;
        if (matchId) animatedMatchIds.add(matchId);
      }
    }, 40);

    return () => {
      clearInterval(interval);
    };
  }, [targetSegments, matchId, isNewArrival]);

  return visibleSegments;
}
