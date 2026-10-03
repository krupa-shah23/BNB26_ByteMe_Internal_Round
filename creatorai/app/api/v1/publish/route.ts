import { clipPublishBody } from "@/lib/schemas/publish";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { findByClip, startPublish } from "@/lib/server/publish";
export const runtime = "nodejs";

/** Alias of POST /projects/:id/publish for callers that route by clipId (PDF section 6). */
export const POST = withRoute(async (req) => {
  const { clipId, ...opts } = parse(clipPublishBody, await body(req));
  const res = await startPublish(req, findByClip(clipId).id, opts);
  return ok(res.body, res.status);
});
