import { ApiError, ok, withRoute } from "@/lib/server/http";
import { getJob } from "@/lib/server/jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute<{ id: string }>(async (_req, { params }) => {
  const j = getJob(params.id);
  if (!j) throw new ApiError("NOT_FOUND", 404, `Unknown job ${params.id}`);
  return ok(j);
});
