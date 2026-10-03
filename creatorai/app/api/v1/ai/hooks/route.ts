import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { hooksBody } from "@/lib/schemas/ai";
import { generateHooks } from "@/lib/server/ai";
export const runtime = "nodejs";

export const POST = withRoute(async (req) => { rateLimit(req); return ok(await generateHooks(parse(hooksBody, await body(req)))); });
