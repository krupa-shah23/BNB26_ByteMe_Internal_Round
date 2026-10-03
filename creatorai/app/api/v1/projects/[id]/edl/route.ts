import { ok, parse, body, withRoute } from "@/lib/server/http";
import { patchEdlBody } from "@/lib/schemas/project";
import { projects } from "@/lib/server/projectRepo";
import { findProject, conflict } from "@/lib/server/guards";
import { toEdl } from "@/lib/server/edl";
import { normalize } from "@/lib/projects";
import { now } from "@/lib/server/demo";
export const runtime = "nodejs";

export const PATCH = withRoute<{ id: string }>(async (req, { params }) => {
  const { version, timeline } = parse(patchEdlBody, await body(req));
  const cur = findProject(params.id);
  if (version !== cur.version) throw conflict(cur);
  const project = projects.save({ ...cur, timeline: normalize(timeline) }, now(req));
  return ok({ project, edl: toEdl(project) });
});
