import { ok, withRoute } from "@/lib/server/http";
import { contentRows, requirePermission } from "@/lib/server/analytics";
import { permissions } from "@/lib/server/b7Repo";
import { settleJobs } from "@/lib/server/jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fixture rows merged with real published posts. Needs reach access; earnings are stripped unless granted. */
export const GET = withRoute(() => {
  settleJobs();
  requirePermission("reach");
  const earnings = permissions.get().earnings;
  return ok({ rows: contentRows().map((r) => (earnings ? r : { ...r, earnings: null })) });
});
