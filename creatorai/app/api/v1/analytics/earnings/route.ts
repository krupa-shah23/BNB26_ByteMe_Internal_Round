import { ok, withRoute } from "@/lib/server/http";
import analytics from "@/fixtures/analytics.json";
import { requirePermission } from "@/lib/server/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { requirePermission("earnings"); return ok({ monthly: analytics.earningsMonthly, collabIncome: analytics.collabIncome }); });
