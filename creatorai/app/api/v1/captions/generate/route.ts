import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { captionsBody } from "@/lib/schemas/ai";
import { suggestCaptions } from "@/lib/server/ai";
export const runtime = "nodejs";

/** Lenient on purpose: the existing client sends loose bodies, so unknown keys are dropped rather than rejected. */
export const POST = withRoute(async (req) => {
  rateLimit(req);
  const raw = (await body(req)) as Record<string, unknown>;
  const input = parse(captionsBody, Object.fromEntries(Object.entries(raw).filter(([k]) => k in captionsBody.shape)));
  return ok(await suggestCaptions(input));
});
