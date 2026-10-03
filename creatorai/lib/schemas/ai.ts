import { z } from "zod";

const tone = z.string().max(40).default("witty");
const lang = z.enum(["en", "hinglish"]).default("en");

export const captionsBody = z.strictObject({
  tone, language: lang.optional(),
  platform: z.string().max(40).default("ig_reel"),
  topic: z.string().max(200).default("creator"),
  text: z.string().max(1000).default(""),
  style: z.string().max(400).optional(),
});
export const hooksBody = z.strictObject({ topic: z.string().min(1).max(200), tone, language: lang.optional(), count: z.number().int().min(1).max(10).default(5) });
export const scriptBody = z.strictObject({ topic: z.string().min(1).max(200), groupId: z.string().optional(), lengthSec: z.number().int().min(10).max(900).default(45), tone });
export const ideasBody = z.strictObject({ niche: z.string().max(100).default("creator"), kind: z.enum(["meme", "reel", "hook", "format", "story"]).default("reel"), count: z.number().int().min(1).max(10).default(5) });
export const bioBody = z.strictObject({ niche: z.string().min(1).max(100), handle: z.string().max(60).optional(), tone, language: lang.optional() });

// LLM output shapes
export const captionOut = z.object({ options: z.array(z.object({ id: z.string().optional(), caption: z.string(), cta: z.string().default(""), hashtags: z.array(z.string()).default([]) })).min(1) });
export const hooksOut = z.object({ hooks: z.array(z.string()).min(1) });
export const scriptOut = z.object({ lines: z.array(z.string()).min(1) });
export const ideasOut = z.object({ ideas: z.array(z.object({ title: z.string(), why: z.string().default("") })).min(1) });
export const bioOut = z.object({ bios: z.array(z.string()).min(1) });
