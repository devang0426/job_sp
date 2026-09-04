import { z } from "zod";

export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const resumePasteSchema = z.object({
  text: z
    .string()
    .min(10, "Resume text must be at least 10 characters long.")
    .max(100000, "Resume text must not exceed 100,000 characters."),
  label: z.string().trim().max(100).optional(),
});

export type ResumePasteInput = z.infer<typeof resumePasteSchema>;
