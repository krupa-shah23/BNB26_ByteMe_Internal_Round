import { z } from "zod";

export const platformId = z.enum(["ig_reel", "yt_short", "yt_video", "linkedin", "x", "facebook"]);
export const aspect = z.enum(["9:16", "1:1", "16:9", "4:5"]);
export const projectStatus = z.enum(["Generated", "Editing", "In review", "Scheduled", "Published"]);

export const segment = z.strictObject({
  id: z.string().optional(),
  at: z.number().min(0), dur: z.number().positive(),
  src: z.string().optional(), in: z.number().optional(), out: z.number().optional(),
  photo: z.string().optional(), anim: z.string().optional(),
  kind: z.string(), caption: z.string().optional(), zoom: z.number().optional(), url: z.string().optional(),
  touched: z.boolean().optional(),
  speed: z.number().optional(), vol: z.number().optional(), label: z.string().optional(),
  ai: z.strictObject({ dur: z.number(), caption: z.string().optional(), in: z.number().optional(), out: z.number().optional() }).optional(),
});

const captionSel = z.strictObject({ id: z.string(), caption: z.string(), cta: z.string(), tone: z.string(), hashtags: z.array(z.string()) });
const thumb = z.strictObject({ frame: z.number(), text: z.string(), template: z.enum(["brand", "blur", "bold"]), score: z.number(), id: z.string(), url: z.string().optional(), source: z.enum(["video", "photo"]).optional() });

/** Every write carries the version it was based on. */
const versioned = { version: z.number().int().min(1) };

export const patchProjectBody = z.strictObject({
  ...versioned,
  title: z.string().min(1).max(200).optional(),
  caption: captionSel.nullable().optional(),
  thumb: thumb.nullable().optional(),
  platforms: z.array(platformId).min(1).optional(),
  aspect: aspect.optional(),
  audioId: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  status: projectStatus.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});
export const patchEdlBody = z.strictObject({ ...versioned, timeline: z.array(segment).min(1) });

export const createProjectBody = z.strictObject({
  groupId: z.string(),
  /** Lets the client mirror a project it created locally under the same id. */
  id: z.string().regex(/^p_[A-Za-z0-9_]+$/).max(64).optional(),
  title: z.string().min(1).max(200).optional(),
  platforms: z.array(platformId).min(1).optional(),
  aspect: aspect.optional(),
  status: projectStatus.optional(),
  files: z.array(z.string()).max(50).optional(),
  photos: z.number().int().min(0).optional(),
  hashtags: z.array(z.string()).optional(),
  audioId: z.string().optional(),
});

export const studioQuery = z.object({
  sort: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: projectStatus.optional(),
  type: z.enum(["Short", "Video"]).optional(),
  platform: platformId.optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
