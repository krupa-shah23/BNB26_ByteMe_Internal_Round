import { ok, parse, body, withRoute } from "@/lib/server/http";
import { patchProjectBody } from "@/lib/schemas/project";
import { projects } from "@/lib/server/projectRepo";
import { findProject, conflict } from "@/lib/server/guards";
import { toEdl } from "@/lib/server/edl";
import { settleJobs } from "@/lib/server/jobs";
import { now } from "@/lib/server/demo";
import type { Project } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type P = { id: string };

export const GET = withRoute<P>((_req, { params }) => {
  settleJobs();
  const project = findProject(params.id);
  return ok({ project, edl: toEdl(project), renders: [] });
});

export const PATCH = withRoute<P>(async (req, { params }) => {
  const { version, ...patch } = parse(patchProjectBody, await body(req));
  const cur = findProject(params.id);
  if (version !== cur.version) throw conflict(cur);
  const next = { ...cur } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k];
    else if (v !== undefined) next[k] = v;
  }
  return ok({ project: projects.save(next as unknown as Project, now(req)) });
});

export const DELETE = withRoute<P>((_req, { params }) => {
  findProject(params.id);
  projects.remove(params.id);
  return ok({ ok: true });
});
