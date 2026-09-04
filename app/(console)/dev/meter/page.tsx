"use client";

import { useState } from "react";
import { ScoreMeter } from "@/components/meter/ScoreMeter";
import { filledSegments } from "@/lib/evaluation/score";
import { Button } from "@/components/ui/Button";

const TEST_SCORES = [0, 1, 4, 5, 50, 51, 55, 88, 100];

export default function MeterDevPage() {
  const [staggerKey, setStaggerKey] = useState(1);
  const [customScore, setCustomScore] = useState(88);

  return (
    <div className="p-8 max-w-5xl space-y-10">
      <div>
        <div className="eyebrow text-text-muted mb-1">Developer Sandbox</div>
        <h1 className="text-title font-sans font-bold text-text-primary">
          Score Meter Specification & Verification
        </h1>
        <p className="text-body text-text-secondary mt-2">
          The signature 10-segment signal meter. Colored entirely by recommendation verdict at three scales.
        </p>
      </div>

      {/* Boundary test table */}
      <section className="space-y-4">
        <h2 className="text-heading text-text-primary">
          1. Boundary Test Matrix (sm / md / lg)
        </h2>
        <div className="rounded border border-border-default bg-bg-surface overflow-hidden">
          <table className="w-full text-left text-data">
            <thead className="bg-bg-raised text-text-muted border-b border-border-default font-condensed uppercase text-label">
              <tr>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Expected Filled</th>
                <th className="px-4 py-2">Small (3px)</th>
                <th className="px-4 py-2">Medium (6px)</th>
                <th className="px-4 py-2">Large (12px)</th>
                <th className="px-4 py-2">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default font-mono">
              {TEST_SCORES.map((score) => {
                const expected = filledSegments(score);
                const verdict =
                  score >= 75 ? "apply" : score >= 50 ? "consider" : "skip";
                return (
                  <tr key={score} className="hover:bg-bg-raised/50">
                    <td className="px-4 py-3 text-text-primary font-bold">{score}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {expected} / 10
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreMeter score={score} scale="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreMeter score={score} scale="md" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreMeter score={score} scale="lg" />
                      </div>
                    </td>
                    <td className="px-4 py-3 uppercase text-label font-condensed">
                      <span
                        className={
                          verdict === "apply"
                            ? "text-verdict-apply"
                            : verdict === "consider"
                            ? "text-verdict-consider"
                            : "text-verdict-skip"
                        }
                      >
                        {verdict}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scale Comparison with display numerals */}
      <section className="space-y-4">
        <h2 className="text-heading text-text-primary">
          2. Scale Comparison & Context Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-border-default bg-bg-surface space-y-2">
            <div className="eyebrow text-text-muted">sm (3px) — Feed rows & tracker</div>
            <div className="flex items-center gap-3 font-mono">
              <ScoreMeter score={88} scale="sm" />
              <span className="text-data text-text-primary">88</span>
            </div>
          </div>

          <div className="p-4 rounded border border-border-default bg-bg-surface space-y-2">
            <div className="eyebrow text-text-muted">md (6px) — Saved job cards</div>
            <div className="flex items-center gap-3 font-mono">
              <ScoreMeter score={88} scale="md" />
              <span className="text-data text-text-primary">88</span>
            </div>
          </div>

          <div className="p-4 rounded border border-border-default bg-bg-surface space-y-2">
            <div className="eyebrow text-text-muted">lg (12px) — Match report headline</div>
            <div className="flex items-center gap-4 font-mono">
              <ScoreMeter score={88} scale="lg" />
              <span className="text-display text-text-primary font-bold">88</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stagger Arrival Test */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-text-primary">
            3. Stagger Animation Test (Arrival Event)
          </h2>
          <Button
            size="sm"
            onClick={() => setStaggerKey((prev) => prev + 1)}
          >
            Simulate Result Arrival
          </Button>
        </div>
        <div className="p-6 rounded border border-border-default bg-bg-surface space-y-6">
          <p className="text-body text-text-secondary">
            When a match result first arrives, segments fill 40ms apart. Re-rendering will not trigger animation again.
          </p>

          <div className="flex flex-wrap items-center gap-8 font-mono">
            <div className="space-y-1">
              <div className="eyebrow text-text-muted">Score 88 (APPLY)</div>
              <ScoreMeter
                key={`stagger-88-${staggerKey}`}
                score={88}
                scale="lg"
                matchId={`match-88-${staggerKey}`}
                isNewArrival={true}
              />
            </div>

            <div className="space-y-1">
              <div className="eyebrow text-text-muted">Score 65 (CONSIDER)</div>
              <ScoreMeter
                key={`stagger-65-${staggerKey}`}
                score={65}
                scale="lg"
                matchId={`match-65-${staggerKey}`}
                isNewArrival={true}
              />
            </div>

            <div className="space-y-1">
              <div className="eyebrow text-text-muted">Score 40 (SKIP)</div>
              <ScoreMeter
                key={`stagger-40-${staggerKey}`}
                score={40}
                scale="lg"
                matchId={`match-40-${staggerKey}`}
                isNewArrival={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Custom Score Evaluator */}
      <section className="space-y-4">
        <h2 className="text-heading text-text-primary">
          4. Interactive Score Playground
        </h2>
        <div className="p-6 rounded border border-border-default bg-bg-surface space-y-4">
          <div className="flex items-center gap-4">
            <label htmlFor="score-input" className="eyebrow text-text-muted">
              Score (0 - 100):
            </label>
            <input
              id="score-input"
              type="range"
              min="0"
              max="100"
              value={customScore}
              onChange={(e) => setCustomScore(Number(e.target.value))}
              className="w-64 accent-text-primary"
            />
            <span className="font-mono text-data font-bold text-text-primary">
              {customScore}
            </span>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-3 font-mono">
              <ScoreMeter score={customScore} scale="lg" />
              <span className="text-display font-bold text-text-primary">
                {customScore}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
