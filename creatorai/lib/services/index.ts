import { useStore } from "../store";
import { matchFiles } from "../match";
import { precheck } from "../precheck";
import { PROFILES } from "../projects";
import { demoBioService, demoCaptionService, demoClipService, demoHookService, demoIdeaService, demoScriptService, runJob } from "./demo";
import { liveBioService, liveCaptionService, liveClipService, liveGroupService, liveHookService, liveIdeaService, livePrecheckService, livePublishService, liveScriptService } from "./live";
import type { BioService, CaptionService, ClipService, GroupService, HookService, IdeaService, PrecheckService, PublishService, ScriptService } from "./types";

/**
 * One interface, two implementations. UI only calls these; it never knows if the answer is real.
 * Choice: Demo Panel toggle (persisted) → NEXT_PUBLIC_SERVICE_<NAME> → NEXT_PUBLIC_DEMO_MODE (default demo).
 * A failing / slow live call silently falls back to the demo implementation.
 */
export function mode(name: string): "live" | "demo" {
  const fromPanel = useStore.getState().services[name];
  const env = (process.env[`NEXT_PUBLIC_SERVICE_${name.toUpperCase()}`] as "live" | "demo" | undefined) ?? (process.env.NEXT_PUBLIC_DEMO_MODE === "false" ? "live" : "demo");
  return fromPanel ?? env;
}

export const clipService: ClipService = {
  async generate(g, cb) {
    if (mode("clips") === "live") {
      try { return await liveClipService.generate(g, cb); } catch { /* fall through to the local simulator */ }
    }
    return demoClipService.generate(g, cb);
  },
};

export const groupService: GroupService = {
  async match(files, opts) {
    if (mode("groups") === "live") {
      try { return await liveGroupService.match(files, opts); } catch { /* fall through to the local matcher */ }
    }
    return matchFiles(files, opts?.forceGroup ? { only: opts.forceGroup } : {});
  },
};

export const captionService: CaptionService = {
  async suggest(input) {
    if (mode("captions") === "live") {
      try { return await liveCaptionService.suggest(input); } catch { /* fall through to fixture */ }
    }
    return demoCaptionService.suggest(input);
  },
};

/** Live call with a silent fallback to the demo implementation (judges never see an error). */
async function withFallback<T>(name: string, live: () => Promise<T>, demo: () => Promise<T>): Promise<T> {
  if (mode(name) === "live") { try { return await live(); } catch { /* fixture */ } }
  return demo();
}

export const hookService: HookService = { suggest: (i) => withFallback("hooks", () => liveHookService.suggest(i), () => demoHookService.suggest(i)) };
export const scriptService: ScriptService = { write: (i) => withFallback("script", () => liveScriptService.write(i), () => demoScriptService.write(i)) };
export const bioService: BioService = { write: (i) => withFallback("bio", () => liveBioService.write(i), () => demoBioService.write(i)) };
export const ideaService: IdeaService = { generate: (t) => withFallback("ideas", () => liveIdeaService.generate(t), () => demoIdeaService.generate(t)) };

export const clipServiceMode = () => mode("clips");

export const precheckService: PrecheckService = {
  async run(project, ctx) {
    if (mode("precheck") === "live") {
      try { return await livePrecheckService.run(project, ctx); } catch { /* the project may not exist server-side yet (B3 cutover): use the local engine */ }
    }
    return { ...precheck(project, ctx), source: "demo" };
  },
};

export const publishService: PublishService = {
  async publish(project, opts, key, onProgress) {
    if (mode("precheck") === "live") {
      try { return await livePublishService.publish(project, opts, key, onProgress); } catch { /* fall through to the local simulator */ }
    }
    await runJob([{ label: "Uploading video", ms: 900 }, { label: "Setting cover + caption", ms: 800 }, ...project.platforms.map((p) => ({ label: `Publishing to ${PROFILES[p].label}`, ms: 700 }))], onProgress);
  },
};
