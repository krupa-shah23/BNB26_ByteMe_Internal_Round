import { ApiError } from "./http";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

type ModelEnv = "GEMINI_CHAT_MODEL" | "GEMINI_IMAGE_MODEL" | "GEMINI_VIDEO_MODEL";

/** Server-only config. Model names come from env so they can change without a code change. */
export function geminiConfig(modelVar: ModelEnv) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env[modelVar];
  if (!key) throw new ApiError("NOT_CONFIGURED", 503, "GEMINI_API_KEY is not set");
  if (!model) throw new ApiError("NOT_CONFIGURED", 503, `${modelVar} is not set`);
  return { key, model };
}

/** Calls the Gemini REST API with the key in a header (never in the URL, never sent to the browser). */
export async function geminiFetch(path: string, key: string, init: { method?: string; body?: unknown; timeoutMs: number }, attempt = 0): Promise<unknown> {
  let r: Response;
  try {
    r = await fetch(path.startsWith("http") ? path : `${BASE}/${path}`, {
      method: init.method ?? "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ApiError("UPSTREAM_TIMEOUT", 504, timedOut ? "Gemini took too long to answer" : "Could not reach Gemini");
  }
  const text = await r.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (r.status === 503 && attempt < 2) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); return geminiFetch(path, key, init, attempt + 1); } // Gemini "high demand" spikes are short
  if (!r.ok) {
    const msg = (json as { error?: { message?: string } } | null)?.error?.message ?? `Gemini returned ${r.status}`;
    throw new ApiError("UPSTREAM_ERROR", r.status === 429 ? 429 : 502, msg, [], { upstreamStatus: r.status });
  }
  return json;
}

/**
 * generateContent on the chat model; if Google is overloaded (503) or rate limited (429), tries GEMINI_CHAT_FALLBACK_MODEL once.
 * The fallback is optional and read from env like every other model name.
 */
export async function generateContent(body: unknown, timeoutMs: number) {
  const { key, model } = geminiConfig("GEMINI_CHAT_MODEL");
  const fallback = process.env.GEMINI_CHAT_FALLBACK_MODEL;
  try {
    return { json: await geminiFetch(`models/${model}:generateContent`, key, { body, timeoutMs }), model };
  } catch (e) {
    const status = e instanceof ApiError ? e.extra?.upstreamStatus : undefined;
    if (!fallback || fallback === model || (status !== 503 && status !== 429)) throw e;
    return { json: await geminiFetch(`models/${fallback}:generateContent`, key, { body, timeoutMs }), model: fallback };
  }
}

export { BASE as GEMINI_BASE };
