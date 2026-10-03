import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { ideasBody } from "@/lib/schemas/ai";
import { trendIdeas } from "@/lib/server/ai";
export const runtime = "nodejs";

export const POST = withRoute(async (req) => { rateLimit(req); return ok(await trendIdeas(parse(ideasBody, await body(req)))); });
