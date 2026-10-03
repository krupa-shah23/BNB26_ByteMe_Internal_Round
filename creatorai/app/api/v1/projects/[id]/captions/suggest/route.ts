import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { captionsBody } from "@/lib/schemas/ai";
import { suggestCaptions } from "@/lib/server/ai";
import { findProject } from "@/lib/server/guards";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  rateLimit(req);
  const p = findProject(params.id);
  const raw = (await body(req)) as Record<string, unknown>;
  const input = parse(captionsBody, { topic: p.title, platform: p.platforms[0], ...raw });
  return ok(await suggestCaptions(input, p.hashtags));
});
