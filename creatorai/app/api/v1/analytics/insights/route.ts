import { ok, withRoute } from "@/lib/server/http";
import { contentRows, requirePermission } from "@/lib/server/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { requirePermission("reach"); return ok({ insights: contentRows().flatMap((r) => ("insight" in r ? [{ id: r.id, title: r.title, ...r.insight }] : [])) }); });
