import crypto from "node:crypto";
import { z } from "zod";
import { ApiError } from "./http";

/** One overall budget for a live call, retry included. After this the fixture answers. */
export const LLM_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60_000;

export type Sourced<T> = T & { source: "live" | "demo" };

const g = globalThis as unknown as { __llmCache?: Map<string, { at: number; v: unknown }>; __llmBuckets?: Map<string, { tokens: number; at: number }> };
const cache = () => (g.__llmCache ??= new Map());
const buckets = () => (g.__llmBuckets ??= new Map());

/** Token bucket: 10 requests burst, refilling 1 per 3 s, per client IP. */
export function rateLimit(req: Request, cap = 10, refillMs = 3000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const t = Date.now();
  const b = buckets().get(ip) ?? { tokens: cap, at: t };
  b.tokens = Math.min(cap, b.tokens + (t - b.at) / refillMs); b.at = t;
  if (b.tokens < 1) { buckets().set(ip, b); throw new ApiError("RATE_LIMITED", 429, "Too many requests, slow down"); }
  b.tokens -= 1; buckets().set(ip, b);
}

async function callGemini(prompt: string, signal: AbortSignal): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key as string },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = await r.json();
  return JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text);
}

/**
 * Gemini JSON mode -> Zod validation -> `shape` (truncation to platform limits) -> retry once -> fixture.
 * Never throws and never returns a 5xx: any failure answers with the fixture and source "demo".
 */
export async function generateJson<S extends z.ZodType, R>(opts: {
  route: string; input: unknown; prompt: string; schema: S;
  shape: (out: z.infer<S>) => R; fixture: () => R;
}): Promise<Sourced<{ data: R }>> {
  const cacheKey = crypto.createHash("sha256").update(JSON.stringify([opts.route, opts.input])).digest("hex");
  const hit = cache().get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.v as Sourced<{ data: R }>;

  let result: Sourced<{ data: R }> = { data: opts.fixture(), source: "demo" };
  if (process.env.GEMINI_API_KEY && process.env.SERVICE_LLM !== "demo") {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const parsed = opts.schema.safeParse(await callGemini(opts.prompt, ctrl.signal));
          if (parsed.success) { result = { data: opts.shape(parsed.data), source: "live" }; break; }
        } catch { if (ctrl.signal.aborted) break; }
      }
    } finally { clearTimeout(timer); }
  }
  // Only live answers are worth reusing; a fixture fallback should retry live next time.
  if (result.source === "live") cache().set(cacheKey, { at: Date.now(), v: result });
  return result;
}

export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
export const tidyTags = (tags: string[], max = 8) => [...new Set(tags.map((t) => "#" + t.replace(/^#+/, "").replace(/\s+/g, "")).filter((t) => t.length > 1))].slice(0, max);
