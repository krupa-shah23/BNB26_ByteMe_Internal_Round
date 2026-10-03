import { z } from "zod";

export const jobStatus = z.enum(["queued", "running", "done", "failed", "cancelled"]);
export const stepStatus = z.enum(["queued", "running", "done", "failed"]);

/** What the client sees. Same shape for generate, render, publish, align. */
export const jobView = z.object({
  id: z.string(),
  kind: z.string(),
  status: jobStatus,
  progress: z.number().min(0).max(1),
  steps: z.array(z.object({ key: z.string(), label: z.string(), status: stepStatus })),
  result: z.record(z.string(), z.unknown()).optional(),
});
export type JobView = z.infer<typeof jobView>;
