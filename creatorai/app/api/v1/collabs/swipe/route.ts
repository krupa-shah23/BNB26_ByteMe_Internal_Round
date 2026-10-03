import creators from "@/fixtures/creators.json";
import { ok, parse, body, withRoute, ApiError } from "@/lib/server/http";
import { swipeBody } from "@/lib/schemas/calendar";
import { swipes } from "@/lib/server/b7Repo";
export const runtime = "nodejs";

/** The preference-vector re-rank stays in the browser. The server only records the swipe and answers "matched?" deterministically. */
export const POST = withRoute(async (req) => {
  const { creatorId, dir } = parse(swipeBody, await body(req));
  const idx = creators.creators.findIndex((c) => c.id === creatorId);
  if (idx < 0) throw new ApiError("NOT_FOUND", 404, `Creator ${creatorId} not found`);
  swipes.record(creatorId, dir);
  return ok({ creatorId, dir, matched: dir === "up" || (dir === "right" && idx % 2 === 0) });
});
