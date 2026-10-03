import type { Project, Segment } from "../types";

/** The PDF's EDL shape, derived from the stored Segment[] timeline. */
export interface Edl {
  aspect: Project["aspect"];
  duration: number;
  tracks: {
    video: Segment[];
    captions: { at: number; dur: number; text: string }[];
    overlays: Segment[];
    audio: { id: string };
  };
}

export function toEdl(p: Project): Edl {
  return {
    aspect: p.aspect,
    duration: +p.timeline.reduce((a, s) => a + s.dur, 0).toFixed(2),
    tracks: {
      video: p.timeline.filter((s) => s.kind !== "photo"),
      captions: p.timeline.filter((s) => s.caption).map((s) => ({ at: s.at, dur: s.dur, text: s.caption as string })),
      overlays: p.timeline.filter((s) => s.kind === "photo"),
      audio: { id: p.audioId },
    },
  };
}

/** Rebuilds the stored timeline from an EDL (video + overlays, ordered by start time). */
export function fromEdl(edl: Edl): Segment[] {
  return [...edl.tracks.video, ...edl.tracks.overlays].sort((a, b) => a.at - b.at);
}
