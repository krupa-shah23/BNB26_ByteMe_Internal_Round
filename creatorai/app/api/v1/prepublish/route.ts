import { clipPrepublishBody } from "@/lib/schemas/publish";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { findByClip, runPrepublish } from "@/lib/server/publish";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Alias of POST /projects/:id/prepublish for callers that route by clipId (PDF section 6). */
export const POST = withRoute(async (req) => {
  const { clipId, ...ctx } = parse(clipPrepublishBody, await body(req));
  return ok(runPrepublish(findByClip(clipId), ctx));
});
