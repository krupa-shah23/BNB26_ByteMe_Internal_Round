import { publishBody } from "@/lib/schemas/publish";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { startPublish } from "@/lib/server/publish";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const res = await startPublish(req, params.id, parse(publishBody, await body(req)));
  return ok(res.body, res.status);
});
