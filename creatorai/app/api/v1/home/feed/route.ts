import { ok, withRoute } from "@/lib/server/http";
import home from "@/fixtures/home.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { return ok({ user: home.user, brandKit: home.brandKit, ideas: home.ideas, events: home.events, seasonal: home.seasonal }); });
