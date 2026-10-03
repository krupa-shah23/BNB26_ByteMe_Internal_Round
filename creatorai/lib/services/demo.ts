import captions from "@/fixtures/captions.json";
import scripts from "@/fixtures/scripts.json";
import type { BioService, CaptionService, ClipService, HookService, IdeaService, JobStep, JobListener, ScriptService } from "./types";
import type { Group } from "../types";
import { useStore } from "../store";
import { generationSteps } from "../jobSteps";

export { generationSteps };

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

export const demoHookService: HookService = {
  async suggest() { await sleep(400); return { hooks: captions.hooks.map((h) => h.text), source: "demo" }; },
};

export const demoScriptService: ScriptService = {
  async write({ groupId }) { const s = scripts as Record<string, string[]>; return { lines: s[groupId ?? "_default"] ?? s._default, source: "demo" }; },
};

export const demoBioService: BioService = {
  async write({ niche, tone }) {
    await sleep(400);
    const t = ({ friendly: ["Hey!", "✨"], pro: ["", "|"], witty: ["Professional overthinker.", "😅"] } as Record<string, string[]>)[tone] ?? ["", ""];
    return { bios: [
      `${t[0]} ${niche} · building in public · new post every week ${t[1]}`.trim(),
      `I turn ${niche} into short, useful videos. Daily lessons, zero fluff. ${t[1]}`,
      `Making ${niche} simple · Mumbai → everywhere · DM for collabs ${t[1]}`,
    ], source: "demo" };
  },
};

export const demoIdeaService: IdeaService = {
  async generate(x) {
    await sleep(900);
    return { source: "demo", ideas: { topic: x,
      meme: [`"Me explaining ${x} vs. what the algorithm heard"`, `Two-paths meme: ${x} edition`],
      reel: [`3 mistakes everyone makes with ${x}`, `${x} in 30 seconds, no jargon`],
      hooks: [`Nobody talks about this part of ${x}…`, `I tried ${x} for 7 days. Here's the truth.`, `Stop doing ${x} like this.`],
      formats: ["Green-screen explainer", "Split-screen reaction", "Carousel → Reel"],
      story: [`Poll: ${x}, yes or no?`, `Ask me anything about ${x}`] } };
  },
};
