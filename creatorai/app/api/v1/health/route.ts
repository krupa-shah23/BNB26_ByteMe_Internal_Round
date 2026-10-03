import { ok, withRoute } from "@/lib/server/http";
import { isDemo } from "@/lib/server/demo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(async () => ok({ ok: true, demoMode: isDemo("default"), llm: Boolean(process.env.GEMINI_API_KEY), at: new Date().toISOString() }));
