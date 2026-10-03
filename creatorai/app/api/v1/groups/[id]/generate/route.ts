import { groupById, groups } from "@/lib/match";
import { generationSteps } from "@/lib/jobSteps";
import { uid } from "@/lib/projects";
import { generateBody } from "@/lib/schemas/groups";
import { now, slowMultiplier } from "@/lib/server/demo";
import { ApiError, body, ok, parse, withRoute } from "@/lib/server/http";
import { createJob, type GeneratePayload } from "@/lib/server/jobs";
import { jobStore, once } from "@/lib/server/jobStore";
import { projects } from "@/lib/server/projectRepo";
export const runtime = "nodejs";

// BACKEND-SLOT(groups-generate): a real pipeline (transcribe, score, reframe, compose) replaces the fixed step timeline.
export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const b = parse(generateBody, await body(req));
  const id = params.id;
  if (id !== "_default" && !groups.some((g) => g.id === id)) throw new ApiError("NOT_FOUND", 404, `Unknown group ${id}`);
  const group = groupById(id);

  const res = await once(`generate:${id}`, req.headers.get("idempotency-key"), async () => {
    // already generated this group and not forcing: send the creator to the existing project
    const prior = jobStore.generations().filter((x) => x.groupId === id).map((x) => projects.get(x.projectId)).find(Boolean);
    if (prior && !b.force && id !== "_default") return { status: 200, body: { alreadyGenerated: true, projectId: prior.id, jobId: null } };

    const at = now(req);
    const projectId = uid("p");
    const payload: GeneratePayload = { projectId, groupId: group.id, at: at.toISOString(), title: b.title, platforms: b.platforms };
    const job = createJob("generate", generationSteps(group), payload as unknown as Record<string, unknown>, slowMultiplier(req));
    return { status: 202, body: { alreadyGenerated: false, jobId: job.id, projectId } };
  });
  return ok(res.body, res.status);
});
