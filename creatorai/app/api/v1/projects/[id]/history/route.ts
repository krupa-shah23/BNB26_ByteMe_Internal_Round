import { ok, withRoute } from "@/lib/server/http";
import { projects } from "@/lib/server/projectRepo";
import { findProject } from "@/lib/server/guards";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute<{ id: string }>((_req, { params }) => {
  findProject(params.id);
  return ok({ snapshots: projects.history(params.id) });
});
