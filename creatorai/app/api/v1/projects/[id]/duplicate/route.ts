import { ok, withRoute } from "@/lib/server/http";
import { projects } from "@/lib/server/projectRepo";
import { findProject } from "@/lib/server/guards";
import { uid } from "@/lib/projects";
import { now } from "@/lib/server/demo";
export const runtime = "nodejs";

export const POST = withRoute<{ id: string }>((req, { params }) => {
  const src = findProject(params.id);
  const at = now(req).toISOString();
  const copy = { ...structuredClone(src), id: uid("p"), title: `${src.title} (copy)`, status: "Generated" as const, createdAt: at, updatedAt: at, version: 1, clipId: undefined, scheduledAt: undefined };
  return ok({ project: projects.insert(copy) }, 201);
});
