import { PROFILES } from "../projects";
import { approvalGaps, CLEARED_TRACKS, DISCLAIMER, precheck, trackById, type PrecheckContext } from "../precheck";
import type { Project } from "../types";
import { now, slowMultiplier } from "./demo";
import { conflict, findProject } from "./guards";
import { ApiError } from "./http";
import { createJob } from "./jobs";
import { jobStore, once } from "./jobStore";
import { projects } from "./projectRepo";
import type { PublishPayload } from "./publishPost";

/** The PDF routes by clipId; the UI routes by project (`clip_<projectId>`). Both resolve here. */
export function findByClip(clipId: string): Project {
  const p = projects.all().find((x) => x.clipId === clipId || `clip_${x.id}` === clipId);
  if (!p) throw new ApiError("NOT_FOUND", 404, `Clip ${clipId} not found`);
  return p;
}

// BACKEND-SLOT(prepublish): same JSON rules, now evaluated server-side. The Review screen can switch to this in live mode.
export function runPrepublish(project: Project, ctx: PrecheckContext = {}) {
  return { ...precheck(project, ctx), disclaimer: DISCLAIMER, version: project.version };
}

// BACKEND-SLOT(audio-swap): only a cleared track can be swapped in; the check re-runs against the new audio.
export function swapAudio(id: string, trackId: string, version: number, at: Date, ctx: PrecheckContext = {}) {
  const cur = findProject(id);
  if (!CLEARED_TRACKS.includes(trackId) || !trackById(trackId)) {
    throw new ApiError("VALIDATION_FAILED", 400, "That track is not one of the cleared options", [{ path: "trackId", message: `Choose one of ${CLEARED_TRACKS.join(", ")}` }]);
  }
  if (version !== cur.version) throw conflict(cur);
  const project = projects.save({ ...cur, audioId: trackId }, at);
  return { project, prepublish: runPrepublish(project, ctx) };
}

// BACKEND-SLOT(approve): the Perfect ✓ button. Same gaps the Studio tooltip lists.
export function approve(id: string, version: number | undefined, at: Date) {
  const cur = findProject(id);
  if (version !== undefined && version !== cur.version) throw conflict(cur);
  const gaps = approvalGaps(cur);
  if (gaps.length) throw new ApiError("VALIDATION_FAILED", 400, `Not ready yet: ${gaps.join(", ")}`, gaps.map((g) => ({ path: "project", message: `Missing ${g}` })), { missing: gaps });
  const clipId = cur.clipId ?? `clip_${cur.id}`;
  const project = projects.save({ ...cur, clipId, status: "In review" }, at);
  return { clipId, reviewUrl: `/review/${clipId}`, project };
}

export interface PublishOpts extends PrecheckContext { acceptWarnings?: boolean }

// BACKEND-SLOT(publish): a real platform call (or a scheduled send) replaces the simulated job.
export async function startPublish(req: Request, id: string, opts: PublishOpts) {
  const key = req.headers.get("idempotency-key");
  if (!key) throw new ApiError("VALIDATION_FAILED", 400, "Idempotency-Key header is required", [{ path: "Idempotency-Key", message: "Send a client-generated key so a double click publishes once" }]);

  return once(`publish:${id}`, key, async () => {
    const project = findProject(id);
    if (project.status === "Published") {
      return { status: 200, body: { alreadyPublished: true, jobId: null, projectId: id, posts: jobStore.posts().filter((p) => p.projectId === id) } };
    }
    const res = runPrepublish(project, opts);
    if (res.summary.fail > 0) {
      throw new ApiError("CONFLICT", 409, `${res.summary.fail} blocker${res.summary.fail > 1 ? "s" : ""} must be fixed before publishing`, res.items.filter((i) => i.severity === "fail"), { blockers: res.summary.fail });
    }
    if (res.summary.warn > 0 && !opts.acceptWarnings) {
      throw new ApiError("CONFLICT", 409, "Accept the warnings to publish anyway", res.items.filter((i) => i.severity === "warn"), { warnings: res.summary.warn, needsAcceptWarnings: true });
    }
    const at = now(req).toISOString();
    const steps = [
      { key: "upload", label: "Uploading video", ms: 900 },
      { key: "cover", label: "Setting cover + caption", ms: 800 },
      ...project.platforms.map((pl) => ({ key: `publish-${pl}`, label: `Publishing to ${PROFILES[pl].label}`, ms: 700 })),
    ];
    const payload: PublishPayload & { result: Record<string, unknown> } = { projectId: id, at, key, platforms: project.platforms, result: { projectId: id, platforms: project.platforms, publishedAt: at } };
    const job = createJob("publish", steps, payload as unknown as Record<string, unknown>, slowMultiplier(req));
    return { status: 202, body: { alreadyPublished: false, jobId: job.id, projectId: id } };
  });
}
