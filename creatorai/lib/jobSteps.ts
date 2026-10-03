import type { Group } from "./types";

export interface JobStepDef { key: string; label: string; ms: number }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Fixed "latency theatre" timeline for a group generation. Pure: shared by the browser demo and the server job. */
export function generationSteps(g: Group): JobStepDef[] {
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
