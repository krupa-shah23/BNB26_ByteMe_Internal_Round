import { swapBody } from "@/lib/schemas/publish";
import { now } from "@/lib/server/demo";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { swapAudio } from "@/lib/server/publish";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const b = parse(swapBody, await body(req));
  return ok(swapAudio(params.id, b.trackId, b.version, now(req)));
});
