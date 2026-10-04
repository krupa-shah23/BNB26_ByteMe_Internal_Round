import { z } from "zod";
import { platformId, aspect, segment } from "./project";

/** Shapes the fixtures must keep. A fixture edit that breaks one of these fails the contract test, not the demo. */
const inputRole = z.object({ role: z.string(), filenames: z.array(z.string()).min(1), sha256_first_1mb: z.string(), durationSec: z.number().min(0), kind: z.enum(["video", "image"]).optional(), size: z.number().int().min(0).optional(), width: z.number().int().optional(), height: z.number().int().optional() });
const reelOutput = z.object({ video: z.string(), poster: z.string(), durationSec: z.number().positive(), width: z.number().int().positive(), height: z.number().int().positive(), fps: z.number().optional(), codec: z.string().optional(), hasAudio: z.boolean().optional() });
export const groupSchema = z.object({
  id: z.string(), title: z.string(), topic: z.string(), format: z.enum(["short", "video"]), type: z.string(), preset: z.string(), media: z.boolean(), hue: z.number(),
  inputs: z.array(inputRole), // the _default group has none by design
  photos: z.array(z.object({ id: z.string(), filenames: z.array(z.string()), sha256: z.string() })),
  audio: z.object({ id: z.string(), src: z.string(), risk: z.string() }),
  timeline: z.array(segment.omit({ ai: true, touched: true, id: true })).min(1),
  hashtags: z.array(z.string()), chapters: z.array(z.object({ t: z.number(), title: z.string() })),
  kind: z.enum(["photo-reel", "lecture-merge", "vlog-merge", "legal-check"]).optional(), output: reelOutput.optional(),
});
export const groupsFile = z.object({ groups: z.array(groupSchema.refine((g) => g.inputs.length > 0, "a real group needs inputs")).min(1), default: groupSchema });

export const captionsFile = z.object({
  tones: z.array(z.string()),
  options: z.record(z.string(), z.array(z.object({ id: z.string(), caption: z.string(), cta: z.string() })).min(1)),
  hooks: z.array(z.object({ text: z.string(), style: z.string(), score: z.number() })).min(1),
});
export const scriptsFile = z.record(z.string(), z.array(z.string()).min(1));
export const creatorsFile = z.object({ creators: z.array(z.object({ id: z.string(), name: z.string(), handle: z.string(), niche: z.string(), followers: z.number(), topics: z.array(z.string()), vec: z.array(z.number()).length(8) })).min(1) });
export const analyticsFile = z.object({
  overview: z.object({ followers: z.number(), views: z.number(), engagement: z.number() }).passthrough(),
  content: z.array(z.object({ id: z.string(), title: z.string(), platform: z.string(), postedAt: z.string(), views: z.number().nullable(), reach: z.number().nullable() }).passthrough()).min(1),
  earningsMonthly: z.array(z.object({ month: z.string(), amount: z.number() })),
  collabIncome: z.array(z.object({ with: z.string(), amount: z.number() })),
  collabLog: z.array(z.object({ id: z.string(), what: z.string(), when: z.string(), withWhom: z.string() }).passthrough()),
  bestTimes: z.array(z.object({ day: z.string(), time: z.string() })),
});
export const homeFile = z.object({
  user: z.object({ id: z.string(), name: z.string(), handle: z.string() }).passthrough(),
  ideas: z.array(z.object({ id: z.string(), title: z.string(), why: z.string() }).passthrough()).min(1),
  events: z.array(z.object({ id: z.string(), name: z.string(), date: z.string() }).passthrough()),
  trending: z.object({ songs: z.array(z.object({ id: z.string(), title: z.string(), risk: z.string() }).passthrough()), memes: z.array(z.unknown()), topics: z.array(z.unknown()), hashtags: z.record(z.string(), z.array(z.string())) }),
  unusedClips: z.array(z.unknown()), library: z.array(z.object({ id: z.string(), name: z.string(), used: z.boolean() }).passthrough()),
});
export const profilesFile = z.record(platformId, z.object({ label: z.string(), aspect, res: z.string(), maxSec: z.number(), minSec: z.number(), hashtagMax: z.number(), muted: z.boolean() }).passthrough());
