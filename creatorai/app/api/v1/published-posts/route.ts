import { ok, withRoute } from "@/lib/server/http";
import { settleJobs } from "@/lib/server/jobs";
import { jobStore } from "@/lib/server/jobStore";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Newest first. Metrics are null with metricsAvailable:false until a platform reports them: render "Not available", never 0. */
export const GET = withRoute(async (req) => {
  settleJobs();
  const project = new URL(req.url).searchParams.get("projectId");
  return ok({ posts: jobStore.posts().filter((p) => !project || p.projectId === project) });
});
