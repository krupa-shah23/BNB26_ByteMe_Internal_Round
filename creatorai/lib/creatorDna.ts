import dnaFx from "@/fixtures/creator-dna.json";
import type { CreatorDNA, CreatorFeedback } from "./types";

export const defaultDNA = dnaFx as CreatorDNA;

export const HOOK_LABEL: Record<string, string> = { story: "Story opener", contrarian: "Bold claim", curiosity: "Curiosity", numbers: "Numbers", direct: "Speaks to you" };
export const STRUCTURES = ["Problem → story → lesson", "Hook → payoff → ask", "Start to finish, in order", "A list of tips"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** A few plain-language traits for quick display. */
export function dnaTraits(d: CreatorDNA, max = 6): string[] {
  const t = d.tone;
  return [
    t.energy >= 66 ? "High energy" : t.energy <= 34 ? "Calm and steady" : "Balanced energy",
    t.formality <= 35 ? "Casual" : t.formality >= 65 ? "Professional" : "Friendly-professional",
    d.writing.humour === "none" ? "Little humour" : `${cap(d.writing.humour)} humour`,
    `${cap(d.writing.sentenceLength)} sentences`,
    d.editing.pacing >= 66 ? "Fast-paced edits" : d.editing.pacing <= 34 ? "Slow, relaxed edits" : "Steady edits",
    `${cap(d.captions.style)} captions`,
    `${cap(d.cta.style)} call to action`,
  ].slice(0, max);
}

/** One-line brief handed to the writing model. */
export function styleBrief(d: CreatorDNA) {
  return `${dnaTraits(d, 7).join(", ").toLowerCase()}; prefers ${d.hooks.map((h) => HOOK_LABEL[h] ?? h).join(" / ").toLowerCase()} openings; ${d.storytelling.structure}`;
}

export function preferredTone(d: CreatorDNA): "witty" | "pro" | "storytelling" {
  if (d.tone.formality >= 65) return "pro";
  if (d.tone.humour >= 55) return "witty";
  return "storytelling";
}

const CTA_TEXT = { soft: "Follow if this helped", direct: "Follow for more — link in bio", question: "What would you add?" } as const;

/** Adapts suggested captions to the creator's style. Pure and cheap. */
export function personaliseCaptions<T extends { id: string; caption: string; cta: string }>(opts: T[], d: CreatorDNA): T[] {
  const share = { rare: 0, sometimes: 0.34, often: 0.67, always: 1 }[d.cta.frequency];
  return opts.map((o, i) => {
    let caption = o.caption;
    if (d.writing.sentenceLength === "short" && caption.length > 90) {
      const first = caption.split(/(?<=[.!?])\s/)[0];
      if (first && first.length >= 30) caption = first;
    }
    if (d.captions.emphasis === "emoji" && !/\p{Extended_Pictographic}/u.test(caption)) caption += " ✨";
    const showCta = (i + 1) / opts.length <= share;
    return { ...o, caption, cta: showCta ? CTA_TEXT[d.cta.style] : "" };
  });
}

/** Opening ideas that match the creator's preferred hook types come first. */
export function sortHooksByDNA<T extends { style: string }>(hooks: T[], d: CreatorDNA) {
  const rank = (h: T) => { const i = d.hooks.indexOf(h.style); return i === -1 ? 99 : i; };
  return [...hooks].sort((a, b) => rank(a) - rank(b));
}

/**
 * Folds ONE new correction into the current DNA (incremental). The history is never re-read.
 * Explicit style edits are already applied by the Profile page, so they leave the DNA unchanged here.
 */
export function applyFeedback(d: CreatorDNA, f: Pick<CreatorFeedback, "type" | "originalValue" | "newValue" | "context">): CreatorDNA {
  const next: CreatorDNA = structuredClone(d);
  let changed = false;
  if (f.type === "hook" && f.context.startsWith("hook:")) {
    const style = f.context.slice(5);
    if (style && next.hooks[0] !== style) { next.hooks = [style, ...next.hooks.filter((h) => h !== style)].slice(0, 3); changed = true; }
  } else if (f.type === "pacing") {
    const was = parseFloat(f.originalValue), now = parseFloat(f.newValue);
    if (Number.isFinite(was) && Number.isFinite(now) && was !== now) { next.editing.pacing = clamp(next.editing.pacing + (now < was ? 4 : -4)); changed = true; }
  } else if (f.type === "caption") {
    const a = f.originalValue.length, b = f.newValue.length;
    if (a && b < a * 0.7 && next.writing.sentenceLength !== "short") { next.writing.sentenceLength = "short"; changed = true; }
    else if (a && b > a * 1.4 && next.writing.sentenceLength === "short") { next.writing.sentenceLength = "medium"; changed = true; }
  }
  if (!changed) return d;
  next.version = d.version + 1; next.updatedAt = new Date().toISOString();
  return next;
}
