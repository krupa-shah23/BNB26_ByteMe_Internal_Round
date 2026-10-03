import captions from "@/fixtures/captions.json";
import type { CaptionService, ClipService, JobStep, JobListener } from "./types";
import type { Group } from "../types";
import { useStore } from "../store";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms * (useStore.getState().slowNetwork ? 2.5 : 1)));

/** "Latency theatre": a deterministic job that replays a fixed step timeline. */
export async function runJob(steps: JobStep[], onProgress: JobListener) {
  const total = steps.reduce((a, s) => a + s.ms, 0);
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    onProgress({ stepIndex: i, progress: acc / total, steps, done: false });
    await sleep(steps[i].ms);
    acc += steps[i].ms;
  }
  onProgress({ stepIndex: steps.length, progress: 1, steps, done: true });
}

export function generationSteps(g: Group): JobStep[] {
  const hook = g.timeline[0];
  const hookRange = hook?.in != null ? `${Math.floor((hook.in ?? 0) / 60)}:${String(Math.floor((hook.in ?? 0) % 60)).padStart(2, "0")}–${Math.floor((hook.out ?? 0) / 60)}:${String(Math.floor((hook.out ?? 0) % 60)).padStart(2, "0")}` : "0:00–0:04";
  return [
    { label: "Uploading", ms: 900 },
    { label: "Reading clips", ms: 1100 },
    { label: "Aligning timestamps", ms: 1200 },
    { label: `Picking hook (${hookRange})`, ms: 1200 },
    { label: "Cutting", ms: 1100 },
    { label: "Adding captions + photo", ms: 1200 },
    { label: "Mixing audio", ms: 900 },
    { label: "Rendering", ms: 1300 },
  ];
}

export const demoClipService: ClipService = {
  generate: (g, onProgress) => runJob(generationSteps(g), onProgress),
};

export const demoCaptionService: CaptionService = {
  async suggest({ tone }) {
    await sleep(700);
    const map = captions.options as Record<string, { id: string; caption: string; cta: string }[]>;
    return { options: map[tone] ?? map.witty, source: "demo" };
  },
};
