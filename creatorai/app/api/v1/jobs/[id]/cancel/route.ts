import { ApiError, ok, withRoute } from "@/lib/server/http";
import { cancelJob } from "@/lib/server/jobs";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>(async (_req, { params }) => {
  const j = cancelJob(params.id);
  if (!j) throw new ApiError("NOT_FOUND", 404, `Unknown job ${params.id}`);
  return ok(j);
});
