import frames from "@/fixtures/thumbnails.json";
import { totalDur } from "./projects";
import type { Project } from "./types";

export interface FrameCandidate {
  id: string; i: number; t: number; face: number; sharp: number; eyesOpen: boolean; emotion: string;
  /** pre-extracted still. Only real when the group's media is in public/demo; the UI falls back to a graded storyboard frame */
  url: string; mediaAvailable: boolean;
}

/** Six candidate frames spread over the cut (same spacing the Studio modal uses). */
export function frameCandidates(p: Project): FrameCandidate[] {
  const dur = totalDur(p.timeline);
  return frames.frames.map((f) => ({
    id: `${p.id}_f${f.i}`, i: f.i, t: +((dur / frames.frames.length) * f.i + 0.5).toFixed(1),
    face: f.face, sharp: f.sharp, eyesOpen: f.eyesOpen, emotion: f.emotion,
    url: `/demo/${p.groupId}/thumbs/frame_${f.i}.jpg`, mediaAvailable: p.media,
  }));
}
