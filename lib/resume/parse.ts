import { PDFParse } from "pdf-parse";
import { ParseSource } from "@prisma/client";
import { anthropic, DEFAULT_MODEL } from "@/lib/ai/client";

export class PdfUnreadableError extends Error {
  readonly code = "PDF_UNREADABLE";
  constructor(
    message = "Couldn't read that PDF. Try a text-based PDF, or paste your CV instead."
  ) {
    super(message);
    this.name = "PdfUnreadableError";
  }
}

export function normalizeResumeText(text: string): string {
  if (!text) return "";

  return text
    // Normalize line endings
    .replace(/\r\n|\r/g, "\n")
    // Collapse horizontal whitespace (spaces, tabs) except line breaks
    .replace(/[ \t]+/g, " ")
    // Strip common page number header/footer artifacts
    .replace(/\bPage\s+\d+(\s+of\s+\d+)?\b/gi, "")
    // Collapse 3 or more consecutive newlines into double newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim leading/trailing lines
    .trim();
}

export interface ParsedResumeResult {
  rawText: string;
  charCount: number;
  pageCount: number | null;
  parseSource: ParseSource;
}

const MIN_CHAR_COUNT_FLOOR = 400;

export async function parsePdfResume(
  buffer: Buffer
): Promise<ParsedResumeResult> {
  // Path 1: pdf-parse library
  try {
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
    console.warn("pdf-parse path failed, trying Claude document block:", err);
  }

  // Path 2: Claude Native Document Block
  try {
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

    const extractedText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

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

  // Path 3: Both paths failed or yielded insufficient text
  throw new PdfUnreadableError();
}
