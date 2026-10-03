import { ok, withRoute } from "@/lib/server/http";
import { demandFixture, type DemandPlatform } from "@/lib/audience/data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORMS = ["youtube", "twitch", "reddit"];
export const GET = withRoute((req: Request) => {
  const p = new URL(req.url).searchParams.get("platform") ?? "youtube";
  return ok({ platform: p, items: demandFixture((PLATFORMS.includes(p) ? p : "youtube") as DemandPlatform) });
});
