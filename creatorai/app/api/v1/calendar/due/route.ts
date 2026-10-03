import { ok, withRoute } from "@/lib/server/http";
import { calendar } from "@/lib/server/b7Repo";
import { now } from "@/lib/server/demo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reminders whose alert time has passed. `now` comes from ?now= or x-demo-now (Demo Panel fast-forward), never the wall clock alone. */
export const GET = withRoute((req) => {
  const q = new URL(req.url).searchParams.get("now");
  const at = (q && !isNaN(Date.parse(q)) ? new Date(q) : now(req)).getTime();
  const due = calendar.all().filter((c) => !c.fired && !c.done && c.remindMin !== undefined && new Date(c.startsAt).getTime() - c.remindMin * 60_000 <= at);
  return ok({ now: new Date(at).toISOString(), due });
});
