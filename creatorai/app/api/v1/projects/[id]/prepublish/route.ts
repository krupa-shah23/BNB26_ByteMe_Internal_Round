import { prepublishBody } from "@/lib/schemas/publish";
import { findProject } from "@/lib/server/guards";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { runPrepublish } from "@/lib/server/publish";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const ctx = parse(prepublishBody, await body(req));
  return ok(runPrepublish(findProject(params.id), ctx));
});
