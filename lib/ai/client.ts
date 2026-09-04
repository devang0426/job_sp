import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-5";

export interface ModelRates {
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M: number;
  cacheCreationPer1M: number;
}

/**
 * Published list prices, USD per 1M tokens.
 * OpenRouter models use their published pricing, or fallback to Gemini 2.5 Flash equivalent if unspecified.
 */
export const MODEL_RATES: Record<string, ModelRates> = {
  "claude-sonnet-5": {
    inputPer1M: 2.0,
    outputPer1M: 10.0,
    cacheReadPer1M: 0.2,
    cacheCreationPer1M: 2.5,
  },
  "gemini-2.5-flash": {
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    cacheReadPer1M: 0.075,
    cacheCreationPer1M: 0.30,
  },
  "google/gemini-2.5-flash": {
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    cacheReadPer1M: 0.075,
    cacheCreationPer1M: 0.30,
  },
};

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export function getCleanGoogleApiKey(): string {
  const raw = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key;
}

export function getCleanOpenRouterApiKey(): string {
  const raw = process.env.OPENROUTER_API_KEY || "";
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key;
}

export function getCleanOpenRouterModel(): string {
  const raw = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
  let model = raw.trim();
  if ((model.startsWith('"') && model.endsWith('"')) || (model.startsWith("'") && model.endsWith("'"))) {
    model = model.slice(1, -1).trim();
  }
  return model || "google/gemini-2.5-flash";
}

export function getCleanAnthropicApiKey(): string {
  const raw = process.env.ANTHROPIC_API_KEY || "";
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key;
}

export const googleApiKey = getCleanGoogleApiKey();
export const openrouterApiKey = getCleanOpenRouterApiKey();
export const OPENROUTER_DEFAULT_MODEL = getCleanOpenRouterModel();
