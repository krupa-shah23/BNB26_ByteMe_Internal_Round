import scripts from "@/fixtures/scripts.json";
import { groupById } from "./match";
import type { Group, Project, Segment } from "./types";

const REASONS: Record<string, string> = {
  hook: "Strong opening claim, self-contained", demo: "Visual payoff, high retention", cta: "Clear ask, clean ending",
  explain: "Concept lands without context", story: "Emotional beat with payoff", quote: "Quotable line, speaker-focused",
  punch: "Setup → punchline in 4 s", photo: "Still moment",
};

export interface ClipSuggestion { id: string; src: string; in: number; dur: number; caption: string; score: number; reason: string; unused?: boolean }

/** Scored clip suggestions. Hand-set scores for the demo set (no model); same output the Clips tab shows today. */
export function clipSuggestions(g: Group): ClipSuggestion[] {
  const base = g.timeline.map((s, i) => ({ id: `c${i}`, src: s.src ?? "A", in: s.in ?? 0, dur: s.dur, caption: s.caption ?? "Clip", score: +(0.93 - i * 0.05).toFixed(2), reason: REASONS[s.kind] ?? "Good segment" })).filter((c) => c.src);
  return [...base, { id: "cx", src: "A", in: 200, dur: 6, caption: "Unused: audience-favourite moment", score: 0.81, reason: "Unused clip · 3× above average replay", unused: true }];
}

export interface Alignment { lineId: string; text: string; matched: boolean; segmentId?: string; src?: string; startSec?: number; endSec?: number; confidence?: number }

const unmatchedLine = (l: string) => /^(add|show|insert)\b/i.test(l.trim());

/** Script line ↔ footage range. Lines with no footage are flagged, never invented. */
export function alignScript(p: Project): Alignment[] {
  const lines = ((scripts as Record<string, string[]>)[p.groupId] ?? (scripts as Record<string, string[]>)._default).filter(Boolean);
  const tl: Segment[] = p.timeline;
  return lines.map((text, i) => {
    const seg = unmatchedLine(text) || !tl.length ? undefined : tl[Math.min(i, tl.length - 1)];
    return seg
      ? { lineId: `l${i}`, text, matched: true, segmentId: seg.id, src: seg.src, startSec: seg.in, endSec: seg.out, confidence: +(0.95 - i * 0.03).toFixed(2) }
      : { lineId: `l${i}`, text, matched: false };
  });
}

export const groupOf = (p: Project) => groupById(p.groupId);
