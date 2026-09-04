import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, DEFAULT_MODEL } from "./client";

/**
 * The single Claude call site. Structured output is constrained by
 * `zodOutputFormat`, and the parsed value is re-validated before it is
 * returned, because `parsed_output` can be null when parsing fails.
 * See invariant 4 in context/architecture.md.
 */

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
}

export interface ClaudeResult<T> {
  data: T;
  usage: ClaudeUsage;
  model: string;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface GenerateWithClaudeParams<T> {
  system: string;
  /**
   * Stable, per-user context placed after the system prompt and marked as
   * the prompt cache breakpoint. The CV text goes here so that every job
   * evaluated in one scan reuses the same cached prefix.
   */
  cacheableContext?: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

export async function generateWithClaude<T>({
  system,
  cacheableContext,
  user,
  schema,
  maxTokens = 8192,
}: GenerateWithClaudeParams<T>): Promise<ClaudeResult<T>> {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const systemBlocks = [{ type: "text" as const, text: system }];
  if (cacheableContext) {
    systemBlocks.push({
      type: "text" as const,
      text: cacheableContext,
      // Cache breakpoint after the stable context.
      ...{ cache_control: { type: "ephemeral" as const } },
    });
  }

  const message = await anthropic.messages.parse({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema) },
  });

  let candidate: unknown = message.parsed_output ?? null;

  if (candidate === null) {
    const firstBlock = message.content[0];
    if (firstBlock && firstBlock.type === "text") {
      try {
        candidate = JSON.parse(firstBlock.text);
      } catch {
        candidate = null;
      }
    }
  }

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `Claude response failed schema validation: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  return {
    data: parsed.data,
    model: DEFAULT_MODEL,
    usage: {
      inputTokens: message.usage.input_tokens ?? 0,
      outputTokens: message.usage.output_tokens ?? 0,
      cachedTokens: message.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
