import { useStore } from "../store";
import { demoCaptionService, demoClipService } from "./demo";
import { liveCaptionService } from "./live";
import type { CaptionService, ClipService } from "./types";

/**
 * One interface, two implementations. UI only calls these; it never knows if the answer is real.
 * Choice: Demo Panel toggle (persisted) → NEXT_PUBLIC_SERVICE_<NAME> → NEXT_PUBLIC_DEMO_MODE (default demo).
 * A failing / slow live call silently falls back to the demo implementation.
 */
function mode(name: string): "live" | "demo" {
  const fromPanel = useStore.getState().services[name];
  const env = (process.env[`NEXT_PUBLIC_SERVICE_${name.toUpperCase()}`] as "live" | "demo" | undefined) ?? (process.env.NEXT_PUBLIC_DEMO_MODE === "false" ? "live" : "demo");
  return fromPanel ?? env;
}

export const clipService: ClipService = {
  generate: (g, cb) => demoClipService.generate(g, cb), // live media worker is optional; demo is the default
};

export const captionService: CaptionService = {
  async suggest(input) {
    if (mode("captions") === "live") {
      try { return await liveCaptionService.suggest(input); } catch { /* fall through to fixture */ }
    }
    return demoCaptionService.suggest(input);
  },
};

export const clipServiceMode = () => mode("clips");
