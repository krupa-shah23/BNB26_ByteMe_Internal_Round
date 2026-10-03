import fs from "node:fs";
import { z } from "zod";
import { ApiError, body, ok, parse, withRoute } from "@/lib/server/http";
import { generateContent } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/llm";
import { uploadPath } from "@/lib/server/uploads";
export const runtime = "nodejs";

const analyzeBody = z.strictObject({
  uploadId: z.string().max(60),
  format: z.enum(["short", "video"]).default("short"),
  /** browser-measured length, used to keep timestamps inside the clip */
  durationSec: z.number().positive().max(36000).optional(),
});

const analysis = z.object({
  title: z.string(),
  summary: z.string(),
  hook: z.string(),
  highlights: z.array(z.object({ start: z.number(), end: z.number(), label: z.string(), reason: z.string() })).max(10),
  captions: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).max(60),
  hashtags: z.array(z.string()).max(15),
  thumbnailText: z.string(),
  thumbnailMoment: z.number(),
  thumbnailPrompt: z.string(),
});

export const POST = withRoute(async (req) => {
  rateLimit(req, 4, 15_000);
  const b = parse(analyzeBody, await body(req));
  const file = uploadPath(b.uploadId);
  if (!file.mime.startsWith("video/") && !file.mime.startsWith("audio/")) throw new ApiError("VALIDATION_FAILED", 400, "Only video or audio can be analysed");

  const prompt = `You are a social video editor. Watch this ${b.format === "short" ? "clip and plan a vertical 9:16 short (Reels/Shorts/Stories), 15-60 s total" : "video and plan a long-form edit with chapters"}.
Return ONLY JSON with: title; summary (1-2 sentences of what really happens); hook (a scroll-stopping first line); highlights (best moments to keep, each {start,end} in seconds from the start of the video, label, reason; no overlaps, ordered); captions (spoken words or on-screen text as {start,end,text}, short lines, only what is really said or shown); hashtags (without #, relevant); thumbnailText (max 4 words); thumbnailMoment (second of the best still frame); thumbnailPrompt (one sentence describing an eye-catching thumbnail image for this video).
Base everything on what is actually in the video. Do not invent content.${b.durationSec ? ` The video is ${b.durationSec.toFixed(1)} seconds long.` : ""}`;

  const { json, model } = await generateContent({
    contents: [{ parts: [{ inline_data: { mime_type: file.mime, data: fs.readFileSync(file.path).toString("base64") } }, { text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  }, 120_000);
  const j = json as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

  const text = (j.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  let parsed;
  try { parsed = analysis.safeParse(JSON.parse(text)); } catch { parsed = null; }
  if (!parsed?.success) throw new ApiError("UPSTREAM_ERROR", 502, "Gemini returned an analysis we could not read, try again");

  const max = b.durationSec ?? Infinity;
  const clamp = (n: number) => Math.min(Math.max(0, n), max);
  const d = parsed.data;
  return ok({
    ...d,
    highlights: d.highlights.map((h) => ({ ...h, start: clamp(h.start), end: clamp(h.end) })).filter((h) => h.end > h.start),
    captions: d.captions.map((c) => ({ ...c, start: clamp(c.start), end: clamp(c.end) })).filter((c) => c.end > c.start),
    hashtags: [...new Set(d.hashtags.map((t) => t.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean))],
    thumbnailMoment: clamp(d.thumbnailMoment),
    model,
  });
});
