import { captionResponseSchema } from "../types";
import type { CaptionService } from "./types";

/** Real LLM path: POST /api/v1/captions/generate (Gemini when GEMINI_API_KEY is set, else the route itself answers from fixtures). */
export const liveCaptionService: CaptionService = {
  async suggest(input) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000); // >4 s → caller falls back to the fixture
    try {
      const res = await fetch("/api/v1/captions/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const parsed = captionResponseSchema.parse(json);
      return { options: parsed.options, source: json.source === "live" ? "live" : "demo" };
    } finally {
      clearTimeout(t);
    }
  },
};
