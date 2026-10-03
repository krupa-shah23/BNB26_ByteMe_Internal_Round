import { z } from "zod";
import type { Project } from "../types";
import { api, ApiError } from "./client";

const project = z.custom<Project>((v) => !!v && typeof v === "object" && typeof (v as Project).id === "string" && typeof (v as Project).version === "number");
const one = z.object({ project });
const detail = z.object({ project, edl: z.unknown(), renders: z.array(z.unknown()) });
const items = z.object({ items: z.array(z.object({ projectId: z.string() })), total: z.number() });
const ok = z.object({ ok: z.boolean() });

/** Fields PATCH /projects/:id accepts. Everything else on a Project is server-owned or local-only. */
export const META_FIELDS = ["title", "caption", "thumb", "platforms", "aspect", "audioId", "hashtags", "status", "scheduledAt"] as const;

/** BACKEND-SLOT(project-patch): thin typed wrappers over /api/v1/projects and /studio/items. */
export const projectApi = {
  async list(): Promise<Project[]> {
    const { items: rows } = await api("/studio/items?sort=createdAt&order=desc", items);
    const all = await Promise.all(rows.map((r) => api(`/projects/${r.projectId}`, detail).then((d) => d.project)));
    return all;
  },
  get: (id: string) => api(`/projects/${id}`, detail).then((d) => d.project),
  create: (p: Project) =>
    api("/projects", one, { method: "POST", json: { groupId: p.groupId, id: p.id, title: p.title, platforms: p.platforms, aspect: p.aspect, status: p.status, files: p.files, photos: p.photos, hashtags: p.hashtags, audioId: p.audioId } }).then((d) => d.project),
  patchMeta: (id: string, version: number, patch: Record<string, unknown>) => api(`/projects/${id}`, one, { method: "PATCH", json: { version, ...patch } }).then((d) => d.project),
  patchTimeline: (id: string, version: number, timeline: Project["timeline"]) => api(`/projects/${id}/edl`, z.object({ project }), { method: "PATCH", json: { version, timeline } }).then((d) => d.project),
  remove: (id: string) => api(`/projects/${id}`, ok, { method: "DELETE" }),
};

export const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409;
export const isMissing = (e: unknown) => e instanceof ApiError && e.status === 404;
