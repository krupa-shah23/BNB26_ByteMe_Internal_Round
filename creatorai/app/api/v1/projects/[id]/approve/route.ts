import { approveBody } from "@/lib/schemas/publish";
import { now } from "@/lib/server/demo";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { approve } from "@/lib/server/publish";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const b = parse(approveBody, await body(req));
  return ok(approve(params.id, b.version, now(req)));
});
