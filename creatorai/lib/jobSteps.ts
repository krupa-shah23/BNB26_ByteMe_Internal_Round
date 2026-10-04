import type { Group } from "./types";

export interface JobStepDef { key: string; label: string; ms: number }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Fixed "latency theatre" timeline for a group generation. Pure: shared by the browser demo and the server job. */
/** A generation started from an upload always takes this long on screen. */
export const GENERATION_MS = 55_000;
export function generationSteps(g: Group, photoCount?: number): JobStepDef[] {
  const base = baseSteps(g, photoCount);
  const sum = base.reduce((a, s) => a + s.ms, 0);
  return base.map((s) => ({ ...s, ms: Math.round((s.ms * GENERATION_MS) / sum) }));
}

function baseSteps(g: Group, photoCount?: number): JobStepDef[] {
  if (g.kind === "vlog-merge") {
    return [
      { key: "read", label: "Reading video1, video2, video3", ms: 1000 },
      { key: "merge", label: "Joining the clips in order", ms: 1400 },
      { key: "scenes", label: "Detecting scenes", ms: 1400 },
      { key: "best", label: "Picking the best moments", ms: 1400 },
      { key: "grade", label: "Applying your look", ms: 1200 },
      { key: "captions", label: "Writing captions", ms: 1200 },
      { key: "render", label: "Rendering full video", ms: 1400 },
    ];
  }
  if (g.kind === "lecture-merge") {
    return [
      { key: "read", label: "Reading part1, part2, part3", ms: 1000 },
      { key: "merge", label: "Stitching the parts in order", ms: 1400 },
      { key: "speech", label: "Transcribing speech", ms: 1500 },
      { key: "slides", label: "Detecting slides, tables and equations", ms: 1500 },
      { key: "moments", label: "Finding moments", ms: 1300 },
      { key: "render", label: "Rendering full video", ms: 1400 },
    ];
  }
  if (g.kind === "photo-reel") {
    return [
      { key: "read", label: `Reading ${photoCount ?? g.inputs.length} photos`, ms: 1100 },
      { key: "faces", label: "Detecting faces", ms: 1300 },
      { key: "beats", label: "Grouping into story beats", ms: 1500 },
      { key: "rhythm", label: "Setting the cut rhythm", ms: 1300 },
      { key: "grade", label: "Applying film grade", ms: 1200 },
      { key: "captions", label: "Writing captions", ms: 1200 },
      { key: "render", label: "Rendering", ms: 1400 },
    ];
  }
  const hook = g.timeline[0];
  const hookRange = hook?.in != null ? `${mmss(hook.in ?? 0)}–${mmss(hook.out ?? 0)}` : "0:00–0:04";
  return [
    { key: "upload", label: "Uploading", ms: 900 },
    { key: "read", label: "Reading clips", ms: 1100 },
    { key: "align", label: "Aligning timestamps", ms: 1200 },
    { key: "hook", label: `Picking hook (${hookRange})`, ms: 1200 },
    { key: "cut", label: "Cutting", ms: 1100 },
    { key: "captions", label: "Adding captions + photo", ms: 1200 },
    { key: "audio", label: "Mixing audio", ms: 900 },
    { key: "render", label: "Rendering", ms: 1300 },
  ];
}
