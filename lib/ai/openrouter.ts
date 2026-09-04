import { z } from "zod";
import { getCleanOpenRouterApiKey, getCleanOpenRouterModel } from "./client";

/**
 * OpenRouter AI Provider.
 * Connects to OpenRouter's OpenAI-compatible completions API endpoint
 * allowing the use of any model on OpenRouter (both free and paid).
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface OpenRouterResult<T> {
  data: T;
  usage: OpenRouterUsage;
  model: string;
}

export function isOpenRouterConfigured(): boolean {
  return getCleanOpenRouterApiKey().length > 0;
}

/** Statuses that mean "busy, rate limited, or transient error". */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ATTEMPTS = 4;

function backoffMs(attempt: number): number {
  return Math.round(800 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to clean JSON text that may be wrapped in Markdown code blocks (```json ... ```).
 */
export function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    text = text.replace(/\s*```$/, "");
  }
  return text.trim();
}

/**
 * Convert Zod schema to JSON Schema for OpenRouter.
 */
export function toOpenRouterJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: "draft-7",
    io: "output",
  }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

export interface GenerateStructuredOpenRouterParams<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Call OpenRouter with structured JSON format and schema validation.
 */
export async function generateStructuredWithOpenRouter<T>({
  system,
  user,
  schema,
  maxOutputTokens = 8192,
  temperature,
  model,
}: GenerateStructuredOpenRouterParams<T>): Promise<OpenRouterResult<T>> {
  const key = getCleanOpenRouterApiKey();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const targetModel = model || getCleanOpenRouterModel();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonSchema = toOpenRouterJsonSchema(schema);

  const systemPrompt = `${system}

==============================
MANDATORY JSON OUTPUT SCHEMA:
==============================
You MUST return ONLY a single valid JSON object that strictly complies with this JSON schema:
${JSON.stringify(jsonSchema, null, 2)}

Ensure every required field is present with exact names and types (e.g. summary, dimensions, requirements, legitimacy, etc.).
Do not include markdown code blocks, backticks, or any conversational text.`;

  const makeBody = (useJsonSchemaFormat: boolean) =>
    JSON.stringify({
      model: targetModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: user },
      ],
      max_tokens: maxOutputTokens,
      ...(temperature !== undefined ? { temperature } : {}),
      response_format: useJsonSchemaFormat
        ? {
            type: "json_schema",
            json_schema: {
              name: "structured_output",
              strict: true,
              schema: jsonSchema,
            },
          }
        : { type: "json_object" },
    });

  let response: Response | null = null;
  let lastStatus = 0;
  let lastBody = "";
  let useJsonSchema = true;

  for (let attempt = 0; attempt < RETRYABLE_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt));

    try {
      response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": appUrl,
          "X-Title": "Job Search & Match Engine",
          "Content-Type": "application/json",
        },
        body: makeBody(useJsonSchema),
      });

      if (response.ok) break;

      lastStatus = response.status;
      lastBody = await response.text();

      // If model provider rejects json_schema format, retry with json_object
      if (useJsonSchema && (lastStatus === 400 || lastBody.includes("response_format") || lastBody.includes("json_schema"))) {
        useJsonSchema = false;
        continue;
      }

      if (!RETRYABLE_STATUSES.has(lastStatus)) break;
      response = null;
    } catch (err) {
      lastStatus = 0;
      lastBody = err instanceof Error ? err.message : String(err);
      response = null;
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `OpenRouter request failed (${lastStatus}): ${lastBody.slice(0, 400)}`,
    );
  }

  const jsonResponse = await response.json();

  if (jsonResponse.error) {
    throw new Error(`OpenRouter API error: ${jsonResponse.error.message || JSON.stringify(jsonResponse.error)}`);
  }

  const choice = jsonResponse.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error(
      "OpenRouter response was truncated before completion. Increase maxOutputTokens.",
    );
  }

  const rawText = choice?.message?.content || "";
  const cleanedText = cleanJsonText(rawText);

  if (!cleanedText) {
    throw new Error("OpenRouter returned an empty response.");
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(cleanedText);
  } catch {
    throw new Error(`OpenRouter response is not valid JSON: ${cleanedText.slice(0, 200)}`);
  }

  const validated = schema.safeParse(parsedRaw);
  if (!validated.success) {
    throw new Error(
      `OpenRouter response failed schema validation: ${validated.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const usageData = jsonResponse.usage;
  const inputTokens = usageData?.prompt_tokens ?? 0;
  const outputTokens = usageData?.completion_tokens ?? 0;
  const cachedTokens = usageData?.prompt_tokens_details?.cached_tokens ?? 0;

  return {
    data: validated.data,
    model: targetModel,
    usage: {
      inputTokens,
      outputTokens,
      cachedTokens,
    },
  };
}
