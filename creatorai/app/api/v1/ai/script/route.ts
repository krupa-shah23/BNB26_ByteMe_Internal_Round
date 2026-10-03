import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { scriptBody } from "@/lib/schemas/ai";
import { generateScript } from "@/lib/server/ai";
export const runtime = "nodejs";

export const POST = withRoute(async (req) => { rateLimit(req); return ok(await generateScript(parse(scriptBody, await body(req)))); });
