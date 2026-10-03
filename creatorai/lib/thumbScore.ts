import type { ThumbSpec } from "./types";

export interface ThumbScoreInput { text: string; frameFace: number; cutout: boolean; template: ThumbSpec["template"] }
export interface ThumbCheck { id: string; pass: boolean; tip: string; pts: number }

/**
 * Click-readiness: a transparent heuristic, always labelled "Est." in the UI. It is not predicted reach.
 * Pure, so the browser (Studio modal) and POST /thumbnails/score give identical numbers.
 */
export function clickReadiness(o: ThumbScoreInput): { score: number; checks: ThumbCheck[] } {
  const words = o.text.trim().split(/\s+/).filter(Boolean).length;
  const checks: ThumbCheck[] = [
    { id: "face", pass: o.cutout, tip: "Cut out the subject, faces lift attention", pts: 18 },
    { id: "words", pass: words > 0 && words <= 4, tip: `Use ≤ 4 words (now ${words})`, pts: 22 },
    { id: "contrast", pass: o.template !== "blur", tip: "Blur template lowers text contrast", pts: 12 },
    { id: "frame", pass: o.frameFace >= 75, tip: "Pick a frame with an open-eyed, expressive face", pts: 16 },
    { id: "badge", pass: true, tip: "Duration badge zone is clear", pts: 8 },
    { id: "brand", pass: true, tip: "Brand template applied", pts: 8 },
  ];
  const score = 16 + checks.reduce((a, c) => a + (c.pass ? c.pts : 0), 0);
  return { score: Math.min(100, score), checks };
}
