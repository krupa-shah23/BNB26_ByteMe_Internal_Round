import { ok, parse, body, withRoute, ApiError } from "@/lib/server/http";
import { createProjectBody } from "@/lib/schemas/project";
import { groups } from "@/lib/match";
import { makeProject } from "@/lib/projects";
import { projects } from "@/lib/server/projectRepo";
import { now } from "@/lib/server/demo";
export const runtime = "nodejs";

export const POST = withRoute(async (req) => {
  const { groupId, ...over } = parse(createProjectBody, await body(req));
  const group = groups.find((x) => x.id === groupId);
  if (!group) throw new ApiError("NOT_FOUND", 404, `Unknown group ${groupId}`);
  const existing = over.id ? projects.get(over.id) : undefined;
  if (existing) throw new ApiError("CONFLICT", 409, `Project ${over.id} already exists`, [], { current: existing });
  const p = makeProject(group, Object.fromEntries(Object.entries(over).filter(([, v]) => v !== undefined)));
  p.createdAt = p.updatedAt = now(req).toISOString();
  return ok({ project: projects.insert(p) }, 201);
});
