import { ok, parse, body, withRoute, ApiError } from "@/lib/server/http";
import { snoozeBody } from "@/lib/schemas/calendar";
import { calendar } from "@/lib/server/b7Repo";
import { now } from "@/lib/server/demo";
export const runtime = "nodejs";

/** Pushes the reminder out: the next alarm fires `minutes` from the (demo) clock. */
export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const { minutes } = parse(snoozeBody, await body(req));
  const cur = calendar.get(params.id);
  if (!cur) throw new ApiError("NOT_FOUND", 404, `Calendar item ${params.id} not found`);
  const startsAt = new Date(now(req).getTime() + (minutes + (cur.remindMin ?? 0)) * 60_000).toISOString();
  return ok({ item: calendar.patch(params.id, { startsAt, fired: false, missed: false }) });
});
