import type { Aspect, Group, PlatformId, Project, Segment } from "./types";
import profiles from "@/fixtures/platformProfiles.json";

export const PROFILES = profiles as Record<PlatformId, { label: string; aspect: Aspect; res: string; maxSec: number; minSec: number; safe: { top: number; bottom: number; side: number }; captionStyle: string; cover: string; notes: string; hashtagMax: number; muted: boolean }>;

export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Re-flows `at` so segments stay contiguous after a trim. */
export function normalize(tl: Segment[]): Segment[] {
  let t = 0;
  return tl.map((s) => { const n = { ...s, at: +t.toFixed(2) }; t += s.dur; return n; });
}
export const totalDur = (tl: Segment[]) => tl.reduce((a, s) => a + s.dur, 0);

export function seedTimeline(g: Group): Segment[] {
  return normalize(g.timeline).map((s, i) => ({ ...s, id: `${g.id}_s${i}`, ai: { dur: s.dur, caption: s.caption, in: s.in, out: s.out } }));
}

export function makeProject(g: Group, over: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  const isShort = g.format === "short";
  return {
    id: uid("p"), title: g.title, type: isShort ? "Short" : "Video", groupId: g.id, hue: g.hue,
    createdAt: now, updatedAt: now, status: "Generated",
    platforms: isShort ? ["ig_reel", "yt_short"] : ["yt_video", "linkedin"],
    aspect: isShort ? "9:16" : "16:9", timeline: seedTimeline(g), audioId: g.audio.id,
    files: g.inputs.map((i) => i.filenames[0]), photos: g.photos.length, hashtags: g.hashtags,
    version: 1, media: g.media, ...over,
  };
}

export const aspectDims: Record<Aspect, { w: number; h: number; ratio: number }> = {
  "9:16": { w: 1080, h: 1920, ratio: 9 / 16 },
  "1:1": { w: 1080, h: 1080, ratio: 1 },
  "16:9": { w: 1920, h: 1080, ratio: 16 / 9 },
  "4:5": { w: 1080, h: 1350, ratio: 4 / 5 },
};

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const relTime = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  return `${Math.floor(d / 86400)} d ago`;
};
export const absTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
