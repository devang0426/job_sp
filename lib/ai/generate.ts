import { z } from "zod";
import { generateStructured as generateWithGemini, isGeminiConfigured } from "./gemini";
import { generateWithClaude, isClaudeConfigured } from "./claude";
import {
  generateStructuredWithOpenRouter,
  isOpenRouterConfigured,
} from "./openrouter";

/**
 * Provider selection for every structured AI call in the codebase.
 *
 * Supports OpenRouter (`OPENROUTER_API_KEY`), Gemini (`GOOGLE_GENERATIVE_AI_API_KEY` /
 * `GEMINI_API_KEY`), and Claude (`ANTHROPIC_API_KEY`).
 * All providers constrain generation to the supplied Zod schema and re-validate
 * before returning, so callers receive a typed value or an exception and never
 * an unchecked object.
 */

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
}

export interface AiResult<T> {
  data: T;
  usage: AiUsage;
  model: string;
}

export interface GenerateParams<T> {
  system: string;
  /** Stable per-user context. Becomes the Claude prompt-cache prefix or appended to system. */
  cacheableContext?: string;
  user: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
}

export function hasAiProvider(): boolean {
  return isOpenRouterConfigured() || isGeminiConfigured() || isClaudeConfigured();
}

export type ProviderName = "openrouter" | "gemini" | "claude";

export function configuredProvider(): ProviderName | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as ProviderName | undefined;
  if (explicit && ["openrouter", "gemini", "claude"].includes(explicit)) {
    if (explicit === "openrouter" && isOpenRouterConfigured()) return "openrouter";
    if (explicit === "gemini" && isGeminiConfigured()) return "gemini";
    if (explicit === "claude" && isClaudeConfigured()) return "claude";
  }

  if (isOpenRouterConfigured()) return "openrouter";
  if (isGeminiConfigured()) return "gemini";
  if (isClaudeConfigured()) return "claude";
  return null;
}

export async function generate<T>({
  system,
  cacheableContext,
  user,
  schema,
  maxOutputTokens = 8192,
}: GenerateParams<T>): Promise<AiResult<T>> {
  const providers: ProviderName[] = [];
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as ProviderName | undefined;

  if (explicit && ["openrouter", "gemini", "claude"].includes(explicit)) {
    providers.push(explicit);
  }

  if (isOpenRouterConfigured() && !providers.includes("openrouter")) {
    providers.push("openrouter");
  }
  if (isGeminiConfigured() && !providers.includes("gemini")) {
    providers.push("gemini");
  }
  if (isClaudeConfigured() && !providers.includes("claude")) {
    providers.push("claude");
  }

  if (providers.length === 0) {
    throw new Error(
      "No AI provider configured. Set OPENROUTER_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or ANTHROPIC_API_KEY in .env.local.",
    );
  }

  const errors: string[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const isLast = i === providers.length - 1;

    try {
      if (provider === "openrouter") {
        return await generateViaOpenRouter({
          system,
          cacheableContext,
          user,
          schema,
          maxOutputTokens,
        });
      }

      if (provider === "gemini") {
        return await generateViaGemini({
          system,
          cacheableContext,
          user,
          schema,
          maxOutputTokens,
        });
      }

      if (provider === "claude") {
        const result = await generateWithClaude({
          system,
          cacheableContext,
          user,
          schema,
          maxTokens: maxOutputTokens,
        });
        return { data: result.data, model: result.model, usage: result.usage };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${provider}]: ${msg}`);
      if (!isLast) {
        console.warn(
          `AI provider '${provider}' failed: ${msg}. Falling back to next configured provider...`,
        );
      }
    }
  }

  throw new Error(`All configured AI providers failed: ${errors.join(" | ")}`);
}

async function generateViaOpenRouter<T>({
  system,
  cacheableContext,
  user,
  schema,
  maxOutputTokens,
}: Required<Pick<GenerateParams<T>, "system" | "user" | "schema" | "maxOutputTokens">> &
  Pick<GenerateParams<T>, "cacheableContext">): Promise<AiResult<T>> {
  const result = await generateStructuredWithOpenRouter({
    system: cacheableContext ? `${system}\n\n${cacheableContext}` : system,
    user,
    schema,
    maxOutputTokens,
  });
  return {
    data: result.data,
    model: result.model,
    usage: { ...result.usage, cacheCreationTokens: 0 },
  };
}

async function generateViaGemini<T>({
  system,
  cacheableContext,
  user,
  schema,
  maxOutputTokens,
}: Required<Pick<GenerateParams<T>, "system" | "user" | "schema" | "maxOutputTokens">> &
  Pick<GenerateParams<T>, "cacheableContext">): Promise<AiResult<T>> {
  const result = await generateWithGemini({
    system: cacheableContext ? `${system}\n\n${cacheableContext}` : system,
    user,
    schema,
    maxOutputTokens,
  });
  return {
    data: result.data,
    model: result.model,
    usage: { ...result.usage, cacheCreationTokens: 0 },
  };
}
