import { z } from "zod";

export type PlatformId = "ig_reel" | "yt_short" | "yt_video" | "linkedin" | "x" | "facebook";
export type Aspect = "9:16" | "1:1" | "16:9" | "4:5";
export type ProjectStatus = "Generated" | "Editing" | "In review" | "Scheduled" | "Published";

export interface InputRole { role: string; filenames: string[]; sha256_first_1mb: string; durationSec: number }
export interface Segment {
  id?: string;
  at: number; dur: number;
  src?: string; in?: number; out?: number; photo?: string; anim?: string;
  kind: string; caption?: string; zoom?: number;
  /** set when the creator changes it, so the UI can tint AI vs user edits */
  touched?: boolean;
  /** original AI values, for "Reset AI suggestion" */
  ai?: { dur: number; caption?: string; in?: number; out?: number };
}
export interface Group {
  id: string; title: string; topic: string; format: "short" | "video"; type: string; preset: string;
  media: boolean; hue: number;
  inputs: InputRole[];
  photos: { id: string; filenames: string[]; sha256: string }[];
  audio: { id: string; src: string; risk: string };
  timeline: Segment[]; hashtags: string[]; chapters: { t: number; title: string }[];
}
export interface ThumbSpec { frame: number; text: string; template: "brand" | "blur" | "bold"; score: number; id: string }
export interface Project {
  id: string; title: string; type: "Short" | "Video"; groupId: string; hue: number;
  createdAt: string; updatedAt: string; status: ProjectStatus;
  platforms: PlatformId[]; aspect: Aspect; timeline: Segment[]; audioId: string;
  files: string[]; photos: number; hashtags: string[];
  caption?: { id: string; caption: string; cta: string; tone: string; hashtags: string[] };
  thumb?: ThumbSpec; clipId?: string; version: number; media: boolean; scheduledAt?: string;
}
export interface FileFingerprint { name: string; size: number; sha: string; durationSec: number; kind: "video" | "image" | "audio" | "other" }
export interface MatchResult {
  groupId?: string; matched: { role: string; fileName: string }[]; missingRoles: string[];
  photosMatched: string[]; unused: string[]; confidence: number; candidates: { groupId: string; score: number }[];
  isDefault: boolean; duplicates: string[];
}
export type CalType = "collab" | "post" | "reminder" | "deadline" | "event";
export interface CalendarItem {
  id: string; type: CalType; title: string; startsAt: string; stage?: string;
  withHandle?: string; projectId?: string; platform?: string; notes?: string;
  remindMin?: number; sound?: boolean; fired?: boolean; missed?: boolean; done?: boolean;
}
export interface Notice { id: string; title: string; body: string; at: string; read: boolean }

export const leadSchema = z.object({
  first: z.string().min(1, "First name is required"),
  last: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  handle: z.string().min(2, "Add your @handle"),
  platforms: z.array(z.string()).min(1, "Pick at least one platform"),
  creating: z.enum(["Shorts/Reels", "Long-form", "Both"], { message: "Choose one" }),
  workflow: z.string().min(1, "Pick the one that sounds like you"),
  team: z.enum(["Solo", "2-5", "6+"], { message: "Choose team size" }),
  soon: z.enum(["Yesterday", "In a few weeks", "Just exploring"], { message: "Choose one" }),
  heard: z.string().min(1, "Tell us how you found us"),
  heardOther: z.string().optional(),
  website: z.string().max(0).optional(), // honeypot
}).refine((v) => v.heard !== "Other" || (v.heardOther ?? "").trim().length > 1, { path: ["heardOther"], message: "Please tell us where" });
export type Lead = z.infer<typeof leadSchema>;

export const captionOptionSchema = z.object({ id: z.string(), caption: z.string(), cta: z.string() });
export const captionResponseSchema = z.object({ options: z.array(captionOptionSchema).min(1) });

/** The creator's current distilled style profile. Feedback below is the persistent history it was learned from. */
export interface CreatorDNA {
  creatorId: string; version: number; updatedAt: string;
  tone: { energy: number; humour: number; formality: number; seriousness: number };            // 0-100
  writing: { sentenceLength: "short" | "medium" | "long"; vocabulary: "simple" | "balanced" | "rich"; directness: number; humour: "none" | "dry" | "playful" | "sarcastic" };
  hooks: string[];                                                                                // preferred opening types
  storytelling: { structure: string };
  editing: { pacing: number; cuts: "tight" | "natural" | "relaxed"; zooms: "none" | "subtle" | "punchy"; broll: "rare" | "balanced" | "frequent"; silence: "trim" | "keep" };
  captions: { style: "clean" | "bold" | "minimal"; emphasis: "none" | "keywords" | "emoji"; position: "top" | "centre" | "bottom" };
  cta: { style: "soft" | "direct" | "question"; frequency: "rare" | "sometimes" | "often" | "always" };
}
export type FeedbackType = "caption" | "hook" | "pacing" | "style" | "cta" | "edit";
export interface CreatorFeedback { id: string; creatorId: string; type: FeedbackType; originalValue: string; newValue: string; context: string; createdAt: string }
