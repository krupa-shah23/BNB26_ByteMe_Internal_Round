import { z } from "zod";
import { api } from "../api/client";
import { watchJob } from "../api/jobs";
import { matchResult } from "../schemas/groups";
import { prepublishResult, publishStarted } from "../schemas/publish";
import { captionResponseSchema } from "../types";
import type { BioService, CaptionService, ClipService, GroupService, HookService, IdeaService, IdeaSet, PrecheckService, PublishService, ScriptService } from "./types";

/** Real LLM path: POST /api/v1/captions/generate (Gemini when GEMINI_API_KEY is set, else the route itself answers from fixtures). */
export const liveCaptionService: CaptionService = {
  async suggest(input) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000); // >4 s → caller falls back to the fixture
    try {
      const res = await fetch("/api/v1/captions/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const parsed = captionResponseSchema.parse(json);
      return { options: parsed.options, source: json.source === "live" ? "live" : "demo" };
    } finally {
      clearTimeout(t);
    }
  },
};

export const liveGroupService: GroupService = {
  match: (files, opts) =>
    api("/groups/match", matchResult, {
      method: "POST",
      json: { files: files.map((f) => ({ name: f.name, size: f.size, sha256First1MB: f.sha, durationSec: f.durationSec, kind: f.kind })) },
      headers: opts?.forceGroup ? { "x-demo-scenario": opts.forceGroup } : undefined,
    }) as never,
};

const generated = z.object({ alreadyGenerated: z.boolean(), jobId: z.string().nullable(), projectId: z.string() });

export const liveClipService: ClipService = {
  async generate(group, onProgress) {
    // BACKEND-SLOT(groups-generate): the server creates its own project row; B3 moves project ownership server-side
    const key = `gen-${group.id}-${Date.now()}`;
    const r = await api(`/groups/${group.id}/generate`, generated, { method: "POST", json: { force: true }, idempotencyKey: key });
    if (r.jobId) await watchJob(r.jobId, onProgress);
    return { projectId: r.projectId };
  },
};

const src = z.enum(["live", "demo"]);
export const liveHookService: HookService = { suggest: (i) => api("/ai/hooks", z.object({ hooks: z.array(z.string()), source: src }), { method: "POST", json: i }) };
export const liveScriptService: ScriptService = { write: (i) => api("/ai/script", z.object({ lines: z.array(z.string()), source: src }), { method: "POST", json: i }) };
export const liveBioService: BioService = { write: (i) => api("/profile/bio", z.object({ bios: z.array(z.string()), source: src }), { method: "POST", json: i }) };
const ideaKinds = { meme: "meme", reel: "reel", hooks: "hook", formats: "format", story: "story" } as const;
export const liveIdeaService: IdeaService = {
  async generate(topic) {
    const ideas = z.object({ ideas: z.array(z.object({ title: z.string() })), source: src });
    const entries = await Promise.all(Object.entries(ideaKinds).map(async ([k, kind]) => {
      const r = await api("/trends/ideas", ideas, { method: "POST", json: { niche: topic, kind, count: 3 } });
      return [k, r.ideas.map((x) => x.title), r.source] as const;
    }));
    const set = Object.fromEntries(entries.map(([k, v]) => [k, v])) as unknown as Omit<IdeaSet, "topic">;
    return { ideas: { topic, ...set }, source: entries.every((e) => e[2] === "live") ? "live" : "demo" };
  },
};

export const livePrecheckService: PrecheckService = {
  async run(project, ctx) {
    const r = await api(`/projects/${project.id}/prepublish`, prepublishResult, { method: "POST", json: ctx ?? {} });
    return { summary: r.summary, items: r.items, score: r.score, source: "live" };
  },
};

export const livePublishService: PublishService = {
  async publish(project, opts, key, onProgress) {
    const r = await api(`/projects/${project.id}/publish`, publishStarted, { method: "POST", json: opts, idempotencyKey: key });
    if (r.jobId) await watchJob(r.jobId, onProgress);
  },
};
