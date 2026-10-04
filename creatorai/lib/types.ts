import { z } from "zod";
import type { Compliance } from "./compliance/types";

export type PlatformId = "ig_reel" | "yt_short" | "yt_video" | "linkedin" | "x" | "facebook";
export type Aspect = "9:16" | "1:1" | "16:9" | "4:5";
export type ProjectStatus = "Generated" | "Editing" | "In review" | "Scheduled" | "Published";

export interface InputRole {
  role: string; filenames: string[]; sha256_first_1mb: string; durationSec: number;
  /** photo-reel roles (p1…p18) are images; size/width/height come from `npm run hash-demo -- <folder>` */
  kind?: "video" | "image"; size?: number; width?: number; height?: number;
}
/** A finished, pre-baked video a group delivers instead of an edit (the "Photo Dump → Reel" scenario). */
export interface ReelOutput { video: string; poster: string; durationSec: number; width: number; height: number; fps?: number; codec?: string; hasAudio?: boolean }
/** Free text the creator adds on top of the video (never burned into the file). */
export interface TextOverlay { id: string; text: string; at: number; dur: number; pos: "top" | "middle" | "bottom"; size: "s" | "m" | "l" }
/** A file in the Library. */
export interface Asset { id: string; name: string; kind: "image" | "video" | "audio"; url: string; thumbUrl: string; groupId?: string; createdAt: string; size?: number; width?: number; height?: number }
export interface Segment {
  id?: string;
  at: number; dur: number;
  src?: string; in?: number; out?: number; photo?: string; anim?: string;
  kind: string; caption?: string; zoom?: number;
  /** full media URL; takes precedence over the group's /demo/<group>/<src>.mp4 convention */
  url?: string;
  /** set when the creator changes it, so the UI can tint AI vs user edits */
  touched?: boolean;
  /** playback speed (1 = normal) and original-audio volume (0-100) */
  speed?: number; vol?: number;
  /** creator-facing name for suggested sections ("Best moment", "Reaction"…) */
  label?: string;
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
  /** "photo-reel": matched by photo names/hashes; delivers `output` unchanged */
  kind?: "photo-reel" | "lecture-merge" | "vlog-merge" | "legal-check";
  output?: ReelOutput;
}
export interface ThumbSpec { frame: number; text: string; template: "brand" | "blur" | "bold"; score: number; id: string; /** a real still (data URL or /demo path) instead of the storyboard frame */ url?: string; source?: "video" | "photo" }
/** A Banuba effect the creator applied in Studio; baked in when the fixed video is exported. */
export interface AppliedFilter { file: string; label: string }
export interface Project {
  filter?: AppliedFilter;
  id: string; title: string; type: "Short" | "Video"; groupId: string; hue: number;
  createdAt: string; updatedAt: string; status: ProjectStatus;
  platforms: PlatformId[]; aspect: Aspect; timeline: Segment[]; audioId: string;
  files: string[]; photos: number; hashtags: string[];
  caption?: { id: string; caption: string; cta: string; tone: string; hashtags: string[] };
  thumb?: ThumbSpec; clipId?: string;
  /** Studio review lanes (ad-safety, PII, claims, consent). Created on first open of the editor. */
  compliance?: Compliance;
  /** Set by Audience → "Create response"; the editor consumes it once to pre-fill hook + script. */
  prefill?: { question: string; hook: string; script: string[]; source: string; applied?: boolean };
  version: number; media: boolean; scheduledAt?: string;
  /** poster still shown on cards and lists */
  cover?: string;
  /** set for projects whose video is a fixed, pre-baked file */
  reel?: ReelOutput;
  /** the project has no music/audio layer: audio UI is hidden and the pre-publish check passes the audio row */
  noAudio?: boolean;
  overlays?: TextOverlay[];
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
export interface Notice { id: string; title: string; body: string; at: string; read: boolean; kind?: "calendar" | "collab" | "system"; href?: string }
/** A direct message in a collab thread (thread key = creator id). */
export interface Msg { id: string; from: "me" | "them"; text: string; at: string; read?: boolean }

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

export const captionOptionSchema = z.object({ id: z.string(), caption: z.string(), cta: z.string(), hashtags: z.array(z.string()).optional() });
export const captionResponseSchema = z.object({ options: z.array(captionOptionSchema).min(1) });

