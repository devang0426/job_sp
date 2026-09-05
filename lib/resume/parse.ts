import { ParseSource } from "@prisma/client";
import {
  anthropic,
  DEFAULT_MODEL,
  getCleanAnthropicApiKey,
  getCleanGoogleApiKey,
} from "@/lib/ai/client";
import { normalizeResumeText } from "./normalize";

export { normalizeResumeText };

export class PdfUnreadableError extends Error {
  readonly code = "PDF_UNREADABLE";
  constructor(
    message = "Couldn't read that PDF. Try a text-based PDF, or paste your CV instead."
  ) {
    super(message);
    this.name = "PdfUnreadableError";
  }
}

export interface ParsedResumeResult {
  rawText: string;
  charCount: number;
  pageCount: number | null;
  parseSource: ParseSource;
}

const MIN_CHAR_COUNT_FLOOR = 50;

async function extractPdfWithGemini(buffer: Buffer): Promise<string> {
  const apiKey = getCleanGoogleApiKey();
  if (!apiKey) throw new Error("No Google API Key configured.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: "application/pdf",
                data: buffer.toString("base64"),
              },
            },
            {
              text: "Extract all resume text verbatim as clean plain text. Preserve sections, bullet points, skills, work experience, education, and contact details accurately.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini PDF extraction failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  return (
    json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("\n") || ""
  );
}

async function extractPdfWithClaude(buffer: Buffer): Promise<string> {
  const apiKey = getCleanAnthropicApiKey();
  if (!apiKey) throw new Error("No Anthropic API Key configured.");

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Extract all text content from this resume document verbatim as plain text. Do not summarize or alter the content.",
          },
        ],
      },
    ],
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("\n");
}

export async function parsePdfResume(
  buffer: Buffer
): Promise<ParsedResumeResult> {
  // Path 1: pdf-parse library
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const pageCount = textResult.total || null;
    const rawText = normalizeResumeText(textResult.text || "");
    await parser.destroy().catch(() => {});

    if (rawText.length >= MIN_CHAR_COUNT_FLOOR) {
      return {
        rawText,
        charCount: rawText.length,
        pageCount,
        parseSource: ParseSource.PDF_PARSE,
      };
    }
  } catch (err) {
    console.warn("pdf-parse path failed, falling back to AI extraction:", err);
  }

  // Path 2: Gemini Native Multimodal Document Block
  try {
    const extractedText = await extractPdfWithGemini(buffer);
    const rawText = normalizeResumeText(extractedText);
    if (rawText.length >= MIN_CHAR_COUNT_FLOOR) {
      return {
        rawText,
        charCount: rawText.length,
        pageCount: null,
        parseSource: ParseSource.CLAUDE_DOCUMENT,
      };
    }
  } catch (err) {
    console.warn("Gemini document extraction path failed, trying Claude:", err);
  }

  // Path 3: Claude Native Document Block
  try {
    const extractedText = await extractPdfWithClaude(buffer);
    const rawText = normalizeResumeText(extractedText);
    if (rawText.length >= MIN_CHAR_COUNT_FLOOR) {
      return {
        rawText,
        charCount: rawText.length,
        pageCount: null,
        parseSource: ParseSource.CLAUDE_DOCUMENT,
      };
    }
  } catch (err) {
    console.warn("Claude document block path failed:", err);
  }

  // Path 4: All extraction paths failed or yielded insufficient text
  throw new PdfUnreadableError();
}
