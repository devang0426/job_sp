import { DEFAULT_MODEL, MODEL_RATES } from "./client";

export interface CostCalculationInput {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  cacheCreationTokens?: number;
}

/**
 * Calculates total execution cost in USD based on model pricing per 1M tokens.
 * Handles input, output, cached read, and cache creation tokens.
 */
export function calculateCostUsd(usage: CostCalculationInput): number {
  const modelName = usage.model || DEFAULT_MODEL;
  const rates =
    MODEL_RATES[modelName] ||
    (modelName.endsWith(":free")
      ? { inputPer1M: 0, outputPer1M: 0, cacheReadPer1M: 0, cacheCreationPer1M: 0 }
      : MODEL_RATES["gemini-2.5-flash"] || MODEL_RATES[DEFAULT_MODEL]);

  const cachedInput = usage.cachedTokens || 0;
  const cacheCreationInput = usage.cacheCreationTokens || 0;
  const uncachedInput = Math.max(0, usage.inputTokens - cachedInput - cacheCreationInput);

  const inputCost = (uncachedInput / 1_000_000) * rates.inputPer1M;
  const cachedReadCost = (cachedInput / 1_000_000) * rates.cacheReadPer1M;
  const cacheCreationCost = (cacheCreationInput / 1_000_000) * rates.cacheCreationPer1M;
  const outputCost = (usage.outputTokens / 1_000_000) * rates.outputPer1M;

  const total = inputCost + cachedReadCost + cacheCreationCost + outputCost;
  return Number(total.toFixed(6));
}
