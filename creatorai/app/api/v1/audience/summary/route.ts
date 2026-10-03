import { ok, withRoute } from "@/lib/server/http";
import audience from "@/fixtures/audience.json";
import { requirePermission } from "@/lib/server/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { requirePermission("audience"); return ok(audience); });
