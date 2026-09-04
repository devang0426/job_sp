import { z } from "zod";
import { getCleanGoogleApiKey } from "./client";

/**
 * The single Gemini call site. Every structured Gemini request in this
 * codebase goes through `generateStructured`.
 *
 * The contract is enforced by the API, not by prompt wording: the Zod
 * schema is converted to JSON Schema and sent as `response_json_schema`,
 * so the model is constrained to the exact field names the application
 * expects. Without it the model invents its own casing and every
 * downstream `safeParse` fails.
 */

export const GEMINI_MODEL = "gemini-2.5-flash";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface GeminiResult<T> {
  data: T;
  usage: GeminiUsage;
  model: string;
}

/** Shape of the Gemini REST response we depend on. Validated, not asserted. */
const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
      cachedContentTokenCount: z.number().optional(),
    })
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

export function isGeminiConfigured(): boolean {
  return getCleanGoogleApiKey().length > 0;
}

/**
 * Convert a Zod schema to the JSON Schema Gemini accepts.
 * `io: "output"` resolves defaults and transforms to their output shape.
 */
export function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: "draft-7",
    io: "output",
  }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}

/** Statuses that mean "busy, ask again", not "this request is wrong". */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ATTEMPTS = 4;

/** Exponential backoff with jitter: ~0.8s, ~1.6s, ~3.2s. */
function backoffMs(attempt: number): number {
  return Math.round(800 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerateStructuredParams<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Call Gemini and return a value already validated against `schema`.
 * Throws on transport failure, safety block, truncation, or a response
 * that does not satisfy the schema. Callers translate the throw into a
 * persisted failure state.
 */
export async function generateStructured<T>({
  system,
  user,
  schema,
  maxOutputTokens = 8192,
  temperature,
}: GenerateStructuredParams<T>): Promise<GeminiResult<T>> {
  if (!isGeminiConfigured()) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      response_mime_type: "application/json",
      response_json_schema: toResponseSchema(schema),
      maxOutputTokens,
      ...(temperature === undefined ? {} : { temperature }),
    },
  });

  const key = getCleanGoogleApiKey();
  const url = `${ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  let response: Response | null = null;
  let lastStatus = 0;
  let lastBody = "";

  // A scan fans out dozens of calls at once, and 429/503 are the routine
  // answer to that, not a real failure. Retrying here keeps one busy
  // moment from marking a whole batch of evaluations failed.
  for (let attempt = 0; attempt < RETRYABLE_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt));

    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) break;

    lastStatus = response.status;
    lastBody = await response.text();
    if (!RETRYABLE_STATUSES.has(lastStatus)) break;
    response = null;
  }

  if (!response || !response.ok) {
    throw new Error(
      `Gemini request failed (${lastStatus}): ${lastBody.slice(0, 400)}`,
    );
  }

  const envelope = GeminiResponseSchema.safeParse(await response.json());
  if (!envelope.success) {
    throw new Error("Gemini returned an unrecognized response envelope.");
  }

  const blockReason = envelope.data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the request: ${blockReason}.`);
  }

  const candidate = envelope.data.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "Gemini response was truncated before the JSON closed. Shorten the input or raise maxOutputTokens.",
    );
  }

  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned text that is not valid JSON.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Gemini response failed schema validation: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const usage = envelope.data.usageMetadata;
  return {
    data: parsed.data,
    model: GEMINI_MODEL,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      cachedTokens: usage?.cachedContentTokenCount ?? 0,
    },
  };
}
