import { z } from "zod";
import { ApiError, body, ok, parse, withRoute } from "@/lib/server/http";
import { GEMINI_BASE, geminiConfig, geminiFetch } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/llm";
export const runtime = "nodejs";

/**
 * Video generation is a long-running operation, so it is three calls, all server-side:
 *   POST /api/video/generate                 { prompt, aspect? }  -> { operation }
 *   GET  /api/video/generate?operation=...                         -> { done, error? }
 *   GET  /api/video/generate?operation=...&download=1              -> the mp4 (proxied so the key never reaches the browser)
 */
const generateBody = z.strictObject({
  prompt: z.string().min(3).max(1000),
  aspect: z.enum(["16:9", "9:16"]).optional(),
});

const OP_RE = /^models\/[\w.-]+\/operations\/[\w-]+$/;
type Op = { done?: boolean; error?: { message?: string }; response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } } };

export const POST = withRoute(async (req) => {
  rateLimit(req, 3, 20_000);
  const b = parse(generateBody, await body(req));
  const { key, model } = geminiConfig("GEMINI_VIDEO_MODEL");
  const j = (await geminiFetch(`models/${model}:predictLongRunning`, key, {
    timeoutMs: 20_000,
    body: { instances: [{ prompt: b.prompt }], parameters: { aspectRatio: b.aspect ?? "16:9" } },
  })) as { name?: string };
  if (!j.name) throw new ApiError("UPSTREAM_ERROR", 502, "Gemini did not start a video job");
  return ok({ operation: j.name, model }, 202);
});

export const GET = withRoute(async (req) => {
  const url = new URL(req.url);
  const operation = url.searchParams.get("operation") ?? "";
  if (!OP_RE.test(operation)) throw new ApiError("VALIDATION_FAILED", 400, "Missing or invalid operation");
  const { key } = geminiConfig("GEMINI_VIDEO_MODEL");
  const op = (await geminiFetch(operation, key, { method: "GET", timeoutMs: 15_000 })) as Op;
  if (!op.done) return ok({ done: false, operation });
  if (op.error) return ok({ done: true, operation, error: op.error.message ?? "Video generation failed" });

  const gen = op.response?.generateVideoResponse;
  const uri = gen?.generatedSamples?.[0]?.video?.uri;
  if (!uri) return ok({ done: true, operation, error: gen?.raiMediaFilteredReasons?.[0] ?? "No video was returned (the prompt may have been blocked)" });
  if (url.searchParams.get("download") !== "1") return ok({ done: true, operation, videoUrl: `/api/video/generate?operation=${encodeURIComponent(operation)}&download=1` });

  if (!uri.startsWith(`${GEMINI_BASE}/`) && !uri.startsWith("https://generativelanguage.googleapis.com/")) throw new ApiError("UPSTREAM_ERROR", 502, "Unexpected video location");
  const r = await fetch(uri, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok || !r.body) throw new ApiError("UPSTREAM_ERROR", 502, `Could not download the video (${r.status})`);
  return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") ?? "video/mp4", "Cache-Control": "private, max-age=3600" } });
});
