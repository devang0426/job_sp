import { z } from "zod";

// Request schemas for the scan resource. POST /api/scans takes no body —
// a scan always runs against the caller's saved Preferences, snapshotted
// at trigger time. GET /api/scan-runs is a simple cursor page.

export const scanRunsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ScanRunsQueryParams = z.infer<typeof scanRunsQuerySchema>;
