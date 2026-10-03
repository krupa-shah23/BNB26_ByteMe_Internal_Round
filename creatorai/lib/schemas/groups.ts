import { z } from "zod";

export const fileKind = z.enum(["video", "image", "audio", "other"]);

export const matchBody = z.strictObject({
  files: z.array(z.strictObject({
    name: z.string().min(1).max(260),
    size: z.number().int().min(0),
    sha256First1MB: z.string().max(64).default(""),
    durationSec: z.number().min(0).default(0),
    kind: fileKind,
  })).max(50),
});

export const matchResult = z.object({
  groupId: z.string().optional(),
  matched: z.array(z.object({ role: z.string(), fileName: z.string() })),
  missingRoles: z.array(z.string()),
  photosMatched: z.array(z.string()),
  unused: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  candidates: z.array(z.object({ groupId: z.string(), score: z.number() })),
  isDefault: z.boolean(),
  duplicates: z.array(z.string()),
});

export const generateBody = z.strictObject({
  useDefaultsForMissing: z.boolean().optional(),
  /** generate again even if this group already has a project */
  force: z.boolean().optional(),
  /** title and platforms are chosen by the Short Videos / Videos tab */
  title: z.string().min(1).max(200).optional(),
  platforms: z.array(z.enum(["ig_reel", "yt_short", "yt_video", "linkedin", "x", "facebook"])).min(1).optional(),
});
