import audio from "@/fixtures/audioCatalog.json";
import rules from "@/fixtures/rules.json";
import igRules from "@/fixtures/rules/ig.json";
import ytRules from "@/fixtures/rules/yt.json";
import linkedinRules from "@/fixtures/rules/linkedin.json";
import xRules from "@/fixtures/rules/x.json";
import { PROFILES, totalDur } from "./projects";
import type { PlatformId, Project } from "./types";

export type Severity = "pass" | "warn" | "fail";
export interface PrecheckItem {
  id: string; platform: PlatformId | "all"; severity: Severity; title: string; detail: string; policyUrl?: string;
  fix?: { label: string; action: "swap-audio" | "add-cta" | "shorten-thumb" };
}
export interface PrecheckResult { summary: Record<Severity, number>; items: PrecheckItem[]; score: number }
/** Facts the project itself does not carry. Sent by the Review screen (BACKEND-SLOT(prepublish)). */
export interface PrecheckContext { containsAi?: boolean; aiDisclosed?: boolean }

export type Track = { id: string; title: string; artist: string; source: string; risk: "low" | "medium" | "high"; notes: string; image?: string; previewUrl?: string };
export const tracks = audio.tracks as Track[];

/** Songs searched from the song API join the catalogue at runtime, so a project's audioId keeps resolving after a reload. */
const SAVED_SONGS = "creatorai-songs";
export function registerTrack(t: Track): Track {
  if (!tracks.some((x) => x.id === t.id)) {
    tracks.push(t);
    try { localStorage.setItem(SAVED_SONGS, JSON.stringify(tracks.filter((x) => x.id.startsWith("saavn_")).slice(-30))); } catch { /* storage unavailable */ }
  }
  return tracks.find((x) => x.id === t.id) ?? t;
}
if (typeof window !== "undefined") {
  try { for (const t of JSON.parse(localStorage.getItem(SAVED_SONGS) ?? "[]") as Track[]) if (!tracks.some((x) => x.id === t.id)) tracks.push(t); } catch { /* ignore */ }
}
export const trackById = (id: string) => tracks.find((t) => t.id === id);
export const DISCLAIMER = rules.disclaimer;
/** The cleared tracks offered by "Fix it". Only these may be swapped in. */
export const CLEARED_TRACKS = rules.swapAudio;

// One JSON file per platform family (fixtures/rules/*.json): policy link plus how that platform's rights system is described and how severe a high-risk track is.
type RuleFile = { id: string; platforms: string[]; policy: keyof typeof rules.policy; audio: { system: string; platformName: string; policy: keyof typeof rules.policy; highSeverity: "warn" | "fail" } };
const RULE_FILES = [igRules, ytRules, linkedinRules, xRules] as RuleFile[];
const ruleFor = (pl: PlatformId): RuleFile => RULE_FILES.find((r) => r.platforms.includes(pl)) ?? RULE_FILES[0];

export function precheck(p: Project, ctx: PrecheckContext = {}): PrecheckResult {
  const items: PrecheckItem[] = [];
  const dur = totalDur(p.timeline);
  const track = trackById(p.audioId);
  const add = (i: PrecheckItem) => items.push(i);

  for (const pl of p.platforms) {
    const prof = PROFILES[pl];
    const rf = ruleFor(pl);
    const policy = rules.policy[rf.policy];

    add(dur > prof.maxSec
      ? { id: `dur-${pl}`, platform: pl, severity: "fail", title: "Too long for this platform", detail: `${dur.toFixed(0)} s exceeds the ${prof.maxSec} s cap. ${prof.notes}.`, policyUrl: policy }
      : dur < prof.minSec
        ? { id: `dur-${pl}`, platform: pl, severity: "warn", title: "Very short", detail: `Under ${prof.minSec} s can reduce distribution.`, policyUrl: policy }
        : { id: `dur-${pl}`, platform: pl, severity: "pass", title: "Duration within limits", detail: `${dur.toFixed(0)} s of ${prof.maxSec} s allowed.`, policyUrl: policy });

    add(p.aspect !== prof.aspect
      ? { id: `asp-${pl}`, platform: pl, severity: "warn", title: `Aspect ${p.aspect} ≠ recommended ${prof.aspect}`, detail: `We'll reframe to ${prof.res} on export; check the safe zone in Studio → Platforms.`, policyUrl: policy }
      : { id: `asp-${pl}`, platform: pl, severity: "pass", title: "Aspect ratio matches", detail: `${prof.aspect} · ${prof.res}`, policyUrl: policy });

    if (prof.muted) {
      const hasCaps = p.timeline.some((s) => s.caption);
      add(hasCaps
        ? { id: `cap-${pl}`, platform: pl, severity: "pass", title: "Burned-in captions present", detail: "Muted autoplay is covered.", policyUrl: policy }
        : { id: `cap-${pl}`, platform: pl, severity: "warn", title: "No captions on screen", detail: "This platform autoplays muted, add captions.", policyUrl: policy });
    }

    const tags = p.caption?.hashtags ?? p.hashtags;
    const banned = tags.filter((t) => rules.bannedHashtags.includes(t.toLowerCase()));
    add(tags.length > prof.hashtagMax
      ? { id: `tag-${pl}`, platform: pl, severity: "warn", title: "Too many hashtags", detail: `${tags.length} used; ${prof.label} works best with ≤ ${prof.hashtagMax}.`, policyUrl: policy }
      : banned.length
        ? { id: `tag-${pl}`, platform: pl, severity: "warn", title: "Spammy hashtag", detail: `Avoid ${banned.join(", ")}.`, policyUrl: policy }
        : { id: `tag-${pl}`, platform: pl, severity: "pass", title: "Hashtags look fine", detail: `${tags.length} of ${prof.hashtagMax}.`, policyUrl: policy });

    // Copyright, honest wording: a claim is not a strike, royalty-free is not claim-free, Content ID is YouTube-only. Never "safe".
    if (track) {
      const { system, platformName, policy: audioPolicy, highSeverity } = rf.audio;
      const audioUrl = rules.policy[audioPolicy];
      if (track.risk === "high") {
        add({ id: `aud-${pl}`, platform: pl, severity: highSeverity, title: `High risk of a claim on ${platformName}`,
          detail: `“${track.title}” is a commercial track and likely fingerprinted by ${system}. Likely effect: revenue goes to the rights holder, or the video is muted/blocked. This is a claim, not a strike. Swap in a platform-library or owned track.`,
          policyUrl: audioUrl, fix: { label: "Fix it, swap audio", action: "swap-audio" } });
      } else if (track.risk === "medium") {
        add({ id: `aud-${pl}`, platform: pl, severity: "warn", title: "Possible claim on library music",
          detail: `“${track.title}” (${track.source}). Royalty-free does not mean claim-free; ${system} can still match it. Keep the license receipt handy.`,
          policyUrl: audioUrl, fix: { label: "Swap to a safer track", action: "swap-audio" } });
      } else {
        add({ id: `aud-${pl}`, platform: pl, severity: "pass", title: "Low audio risk", detail: `“${track.title}”, ${track.notes}.`, policyUrl: audioUrl });
      }
    }

    // A fixed video file (photo reel): CreatorAi adds no music. Say what the file really contains.
    if (p.noAudio) {
      const audioUrl = rules.policy[rf.audio.policy];
      add(p.reel?.hasAudio
        ? { id: `aud-${pl}`, platform: pl, severity: "warn", title: "The video carries its own sound", detail: "CreatorAi added no music and plays the file muted in the editor. The sound inside the file isn't edited or assessed here, so its claim risk is unknown.", policyUrl: audioUrl }
        : { id: `aud-${pl}`, platform: pl, severity: "pass", title: "No audio track", detail: "Nothing to claim.", policyUrl: audioUrl });
    }
    if (p.reel) {
      const { width, height } = p.reel;
      add(width < 720
        ? { id: `res-${pl}`, platform: pl, severity: "warn", title: `Low resolution (${width}×${height})`, detail: "Under 720 px wide can look soft on phones.", policyUrl: policy }
        : { id: `res-${pl}`, platform: pl, severity: "pass", title: `Resolution ${width}×${height}`, detail: width >= height ? "Shown 9:16 with a blurred background in the editor; the exported file keeps its original frame." : "Matches the platform frame.", policyUrl: policy });
    }
  }

  // platform-independent checks
  const first = p.timeline[0];
  add(first?.kind === "hook" && first.dur <= 6
    ? { id: "hook", platform: "all", severity: "pass", title: "Hook in the first seconds", detail: `“${first.caption ?? "hook"}” opens the video.` }
    : { id: "hook", platform: "all", severity: "warn", title: "No hook in the first 3 s", detail: "Open with the strongest line or visual." });
  add(p.timeline.some((s) => s.kind === "cta")
    ? { id: "cta", platform: "all", severity: "pass", title: "Call to action present", detail: "Viewers are told what to do next." }
    : { id: "cta", platform: "all", severity: "warn", title: "No call to action", detail: "End with a follow / save / comment prompt.", fix: { label: "Add CTA slate", action: "add-cta" } });

  if (!p.caption) add({ id: "cap-chosen", platform: "all", severity: "fail", title: "No caption chosen", detail: "Use Suggest captions in Studio." });
  if (!p.thumb) add({ id: "thumb", platform: "all", severity: "fail", title: "No thumbnail chosen", detail: "Use Generate thumbnail in Studio." });
  else {
    const words = p.thumb.text.trim().split(/\s+/).length;
    add(words > 4
      ? { id: "thumb-words", platform: "all", severity: "warn", title: "Thumbnail text over 4 words", detail: `${words} words are hard to read at 120 px.`, fix: { label: "Shorten text", action: "shorten-thumb" } }
      : { id: "thumb-words", platform: "all", severity: "pass", title: "Thumbnail text is short", detail: `${words} words · click-readiness ${p.thumb.score}/100 (heuristic).` });
  }

  // AI disclosure: the creator says whether the post contains realistic synthetic media; we only ask for the label, we never judge it.
  add(ctx.containsAi && !ctx.aiDisclosed
    ? { id: "ai", platform: "all", severity: "warn", title: "Disclose AI-generated content", detail: "You marked this post as containing AI-generated content. Set YouTube's “altered or synthetic” flag and Meta's AI label before publishing." }
    : ctx.containsAi
      ? { id: "ai", platform: "all", severity: "pass", title: "AI-generated content disclosed", detail: "Remember to keep the platform label switched on when you publish." }
      : { id: "ai", platform: "all", severity: "pass", title: "No synthetic realistic media", detail: "Real frames from your video; AI only touches suggestions. If that changes, set YouTube's “altered or synthetic” flag and Meta's AI label." });

  const summary = { pass: 0, warn: 0, fail: 0 } as Record<Severity, number>;
  items.forEach((i) => summary[i.severity]++);
  const score = Math.max(0, Math.min(100, 100 - summary.fail * 22 - summary.warn * 6));
  return { summary, items, score };
}

/** What Perfect ✓ needs before the Review screen opens. Same list the Studio tooltip shows. */
export function approvalGaps(p: Project): string[] {
  const gaps: string[] = [];
  if (!p.caption) gaps.push("caption");
  if (!p.thumb) gaps.push("thumbnail");
  const dur = totalDur(p.timeline);
  const over = p.platforms.filter((pl) => dur > PROFILES[pl].maxSec).map((pl) => PROFILES[pl].label);
  if (over.length) gaps.push(`duration within the limit for ${over.join(", ")}`);
  return gaps;
}
