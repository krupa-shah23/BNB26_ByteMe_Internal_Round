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
  const reel = g.output ? { reel: g.output, cover: g.output.poster, noAudio: g.kind === "photo-reel", overlays: [], photos: g.kind === "photo-reel" ? g.inputs.length : 0 } : {};
  return {
    id: uid("p"), title: g.title, type: isShort ? "Short" : "Video", groupId: g.id, hue: g.hue,
    createdAt: now, updatedAt: now, status: "Generated",
    platforms: isShort ? ["ig_reel", "yt_short"] : ["yt_video", "linkedin"],
    aspect: isShort ? "9:16" : "16:9", timeline: seedTimeline(g), audioId: g.audio.id,
    files: g.inputs.map((i) => i.filenames[0]), photos: g.photos.length, hashtags: g.hashtags,
    version: 1, media: g.media, ...reel, ...over,
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

/** Creator-facing name: drops "Quick edit —", the file extension and camera/WhatsApp timestamps. */
export function friendlyTitle(raw: string) {
  let t = raw.replace(/^Quick edit\s*[—-]\s*/i, "").replace(/\.(mp4|mov|mkv|webm|m4v|avi)$/i, "");
  t = t.replace(/[\s_-]*\d{4}-\d{2}-\d{2}.*$/, "").replace(/[_]+/g, " ").trim();
  return t || "Untitled video";
}

const SEGMENT_NAMES: Record<string, string> = { hook: "Opening", cta: "Ending", demo: "Main point", explain: "Main point", story: "Main point", quote: "Quote", punch: "Punchline", photo: "Photo" };
/** Plain-language name for a timeline section. */
export function segmentName(kind: string, index: number, count: number) {
  if (index === 0) return "Opening";
  if (index === count - 1 && count > 1) return "Ending";
  return SEGMENT_NAMES[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}
