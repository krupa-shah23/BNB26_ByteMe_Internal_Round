import { z } from "zod";

const ctx = { containsAi: z.boolean().optional(), aiDisclosed: z.boolean().optional() };

export const prepublishBody = z.strictObject({ ...ctx });
export const swapBody = z.strictObject({ trackId: z.string().min(1), version: z.number().int().min(1) });
export const approveBody = z.strictObject({ version: z.number().int().min(1).optional() });
export const publishBody = z.strictObject({ ...ctx, acceptWarnings: z.boolean().optional() });

/** Alias bodies: the PDF routes by clipId, the UI by project. */
export const clipPrepublishBody = z.strictObject({ clipId: z.string().min(1), ...ctx });
export const clipPublishBody = z.strictObject({ clipId: z.string().min(1), ...ctx, acceptWarnings: z.boolean().optional() });

export const publishedPost = z.object({
  id: z.string(), projectId: z.string(), platform: z.string(), title: z.string(),
  publishedAt: z.string(), thumbUrl: z.string().nullable(),
  /** null + metricsAvailable:false means "Not available", never 0 */
  metrics: z.null(), metricsAvailable: z.literal(false),
});
export type PublishedPost = z.infer<typeof publishedPost>;

const item = z.object({
  id: z.string(), platform: z.enum(["ig_reel", "yt_short", "yt_video", "linkedin", "x", "facebook", "all"]), severity: z.enum(["pass", "warn", "fail"]), title: z.string(), detail: z.string(),
  policyUrl: z.string().optional(), fix: z.object({ label: z.string(), action: z.enum(["swap-audio", "add-cta", "shorten-thumb"]) }).optional(),
});
export const prepublishResult = z.object({
  summary: z.object({ pass: z.number(), warn: z.number(), fail: z.number() }),
  items: z.array(item), score: z.number(), disclaimer: z.string(), version: z.number(),
});
export const publishStarted = z.object({ alreadyPublished: z.boolean(), jobId: z.string().nullable(), projectId: z.string() });
