import { ok, parse, body, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { bioBody } from "@/lib/schemas/ai";
import { writeBio } from "@/lib/server/ai";
export const runtime = "nodejs";

export const POST = withRoute(async (req) => { rateLimit(req); return ok(await writeBio(parse(bioBody, await body(req)))); });
