import { groupById } from "../match";
import { makeProject, uid } from "../projects";
import type { JobView } from "../schemas/job";
import type { PlatformId } from "../types";
import { jobStore, type JobRecord } from "./jobStore";
import { projects } from "./projectRepo";
import { finalizePublish, type PublishPayload } from "./publishPost";

export type StepDef = { key: string; label: string; ms: number };
export interface GeneratePayload { projectId: string; groupId: string; at: string; title?: string; platforms?: PlatformId[] }

/** Start a job whose result is known up front (render, align, clips). Shown as `result` once the steps finish. */
export function startResultJob(kind: string, steps: StepDef[], result: Record<string, unknown>, slow = 1, at = Date.now()) {
  return createJob(kind, steps, { result }, slow, at);
}

export function createJob(kind: string, steps: StepDef[], payload: Record<string, unknown> = {}, slow = 1, at = Date.now()): JobRecord {
  const job: JobRecord = { id: uid("job"), kind, createdAt: at, slow, steps, payload };
  jobStore.put(job);
  return job;
}

/** Derive the public job view from elapsed wall-clock time. */
export function view(job: JobRecord, at = Date.now()): JobView {
  const total = job.steps.reduce((a, s) => a + s.ms * job.slow, 0);
  const elapsed = Math.max(0, (job.cancelledAt ?? at) - job.createdAt);
  let acc = 0;
  const steps = job.steps.map((s) => {
    const dur = s.ms * job.slow;
    const status = elapsed >= acc + dur ? "done" : elapsed >= acc ? "running" : "queued";
    acc += dur;
    return { key: s.key, label: s.label, status } as const;
  });
  const finished = !job.cancelledAt && elapsed >= total;
  const status: JobView["status"] = job.cancelledAt ? "cancelled" : finished ? "done" : elapsed > 0 ? "running" : "queued";
  return { id: job.id, kind: job.kind, status, progress: total ? Math.min(1, elapsed / total) : 1, steps, ...(finished && job.result ? { result: job.result } : {}) };
}

/** Run a finished job's side effect exactly once: a generate job creates its project. */
function settle(job: JobRecord) {
  if (job.settled) return;
  if (job.kind === "generate") {
    const p = job.payload as unknown as GeneratePayload;
    const g = groupById(p.groupId);
    if (!projects.get(p.projectId)) {
      projects.insert(makeProject(g, { id: p.projectId, createdAt: p.at, updatedAt: p.at, ...(p.title ? { title: p.title } : {}), ...(p.platforms ? { platforms: p.platforms } : {}) }));
      jobStore.addGeneration({ groupId: g.id, projectId: p.projectId, at: p.at });
    }
    // BACKEND-SLOT(clip-render): outputs are pre-rendered files under public/demo until the Remotion CLI worker exists
    const dir = `/demo/${g.id}`;
    jobStore.patch(job.id, (j) => { j.result = { projectId: p.projectId, groupId: g.id, outputUrl: `${dir}/output.mp4`, verticalUrl: `${dir}/output_9x16.mp4`, posterUrl: `${dir}/poster.jpg` }; });
  }
  if (job.kind === "publish") finalizePublish(job.payload as unknown as PublishPayload);
  // render / align / clips jobs carry a precomputed, deterministic result
  const pre = job.payload.result as Record<string, unknown> | undefined;
  if (pre) jobStore.patch(job.id, (j) => { j.result = pre; });
  jobStore.patch(job.id, (j) => { j.settled = true; });
}

/** Settle every finished job. List endpoints call this so a job nobody polled still produces its project. */
export function settleJobs(at = Date.now()) {
  for (const j of jobStore.jobs()) if (!j.settled && view(j, at).status === "done") settle(j);
}

export function getJob(id: string, at = Date.now()): JobView | null {
  const job = jobStore.job(id);
  if (!job) return null;
  if (!job.settled && view(job, at).status === "done") settle(job);
  return view(jobStore.job(id), at);
}

export function cancelJob(id: string, at = Date.now()): JobView | null {
  const job = jobStore.job(id);
  if (!job) return null;
  const v = view(job, at);
  if (v.status === "done" || v.status === "cancelled") return v;
  jobStore.patch(id, (j) => { j.cancelledAt = at; });
  return view(jobStore.job(id), at);
}
