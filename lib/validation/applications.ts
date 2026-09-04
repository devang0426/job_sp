import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";

export const CreateApplicationSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

export const UpdateApplicationSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  notes: z.string().nullable().optional(),
  boardOrder: z.number().int().min(0).optional(),
  nextFollowUpAt: z.union([z.string().datetime(), z.null()]).optional(),
  lastContactAt: z.union([z.string().datetime(), z.null()]).optional(),
  message: z.string().optional(),
});

export const ReorderColumnSchema = z.object({
  columnStatus: z.nativeEnum(ApplicationStatus),
  orderedIds: z.array(z.string().min(1)),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type ReorderColumnInput = z.infer<typeof ReorderColumnSchema>;
