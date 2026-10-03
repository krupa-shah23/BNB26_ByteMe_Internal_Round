import { ok, parse, body, withRoute, ApiError } from "@/lib/server/http";
import { calendarCreate, calendarQuery } from "@/lib/schemas/calendar";
import { calendar } from "@/lib/server/b7Repo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute((req) => {
  const q = parse(calendarQuery, Object.fromEntries(new URL(req.url).searchParams));
  const items = calendar.all().filter((c) => (!q.type || c.type === q.type) && (!q.from || c.startsAt >= q.from) && (!q.to || c.startsAt <= q.to)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return ok({ items });
});
export const POST = withRoute(async (req) => {
  const input = parse(calendarCreate, await body(req));
  const existing = input.id ? calendar.get(input.id) : undefined;
  if (existing) throw new ApiError("CONFLICT", 409, `Calendar item ${input.id} already exists`, [], { current: existing });
  return ok({ item: calendar.add(input) }, 201);
});
