import { ok, parse, body, withRoute, ApiError } from "@/lib/server/http";
import { calendarPatch } from "@/lib/schemas/calendar";
import { calendar } from "@/lib/server/b7Repo";
export const runtime = "nodejs";

const missing = (id: string) => new ApiError("NOT_FOUND", 404, `Calendar item ${id} not found`);
export const PATCH = withRoute<{ id: string }>(async (req, { params }) => {
  const item = calendar.patch(params.id, parse(calendarPatch, await body(req)));
  if (!item) throw missing(params.id);
  return ok({ item });
});
export const DELETE = withRoute<{ id: string }>((_req, { params }) => {
  if (!calendar.remove(params.id)) throw missing(params.id);
  return ok({ ok: true });
});
