import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/types";

// In-memory stand-in for the B3 project repository (the real one writes .data/db.json). `save` mirrors its version bump.
vi.mock("@/lib/server/projectRepo", () => {
  let rows: Project[] = [];
  return {
    projects: {
      all: () => rows,
      get: (id: string) => rows.find((p) => p.id === id),
      insert: (p: Project) => { rows.unshift(p); return p; },
      save: (p: Project, now: Date) => { const next = { ...p, version: p.version + 1, updatedAt: now.toISOString() }; rows = rows.map((x) => (x.id === p.id ? next : x)); return next; },
    },
    reset: () => { rows = []; },
  };
});

import { POST as prepublish } from "@/app/api/v1/projects/[id]/prepublish/route";
import { POST as swap } from "@/app/api/v1/projects/[id]/audio/swap/route";
import { POST as approveRoute } from "@/app/api/v1/projects/[id]/approve/route";
import { POST as publish } from "@/app/api/v1/projects/[id]/publish/route";
import { POST as clipPublish } from "@/app/api/v1/publish/route";
import { POST as clipPrepublish } from "@/app/api/v1/prepublish/route";
import { GET as posts } from "@/app/api/v1/published-posts/route";
import { GET as getJobRoute } from "@/app/api/v1/jobs/[id]/route";
import { GET as thumbs } from "@/app/api/v1/projects/[id]/thumbnails/route";
import { POST as score } from "@/app/api/v1/thumbnails/score/route";
import { POST as align } from "@/app/api/v1/projects/[id]/align/route";
import { POST as clips } from "@/app/api/v1/projects/[id]/clips/generate/route";
import { POST as render } from "@/app/api/v1/clips/[id]/render/route";
import { POST as resetRoute } from "@/app/api/v1/demo/reset/route";
import { clickReadiness } from "@/lib/thumbScore";
import { groups } from "@/lib/match";
import { makeProject } from "@/lib/projects";
import { projects } from "@/lib/server/projectRepo";

const post = (json?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://t/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: json === undefined ? undefined : JSON.stringify(json) });
const ctx = (id: string) => ({ params: { id } });
const none = { params: {} };
const job = (id: string) => getJobRoute(new Request("http://t/j"), ctx(id)).then((r) => r.json());
const caption = { id: "c", caption: "hi", cta: "", tone: "witty", hashtags: ["#a"] };
const thumb = { id: "t", frame: 1, text: "SHORT", template: "brand" as const, score: 70 };

/** A ready-to-publish Short on YouTube + Instagram with the high-risk track from g1. */
function seed(over: Partial<Project> = {}): Project {
  const p = makeProject(groups[0], { id: "p_test", platforms: ["yt_short", "ig_reel"], caption, thumb, ...over });
  projects.insert(p);
  return p;
}

beforeEach(async () => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-03T10:00:00Z")); await resetRoute(post(), none); });
afterEach(() => vi.useRealTimers());

describe("prepublish + audio swap", () => {
  it("g1's commercial track blocks YouTube; swapping to a cleared track re-runs the check and the score rises", async () => {
    const p = seed();
    const before = await (await prepublish(post({}), ctx(p.id))).json();
    expect(before.summary.fail).toBe(1);
    expect(before.disclaimer).toContain("not legal advice");

    const res = await swap(post({ trackId: "alt1", version: p.version }), ctx(p.id));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.project.audioId).toBe("alt1");
    expect(j.project.version).toBe(p.version + 1);
    expect(j.prepublish.summary.fail).toBe(0);
    expect(j.prepublish.score).toBeGreaterThan(before.score);
  });

  it("rejects a track that is not cleared, and a stale version", async () => {
    const p = seed();
    const bad = await swap(post({ trackId: "bgm3", version: p.version }), ctx(p.id));
    expect(bad.status).toBe(400);
    const stale = await swap(post({ trackId: "alt1", version: 99 }), ctx(p.id));
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("CONFLICT");
  });

  it("the clipId alias resolves the same project", async () => {
    const p = seed({ clipId: "clip_p_test" });
    const j = await (await clipPrepublish(post({ clipId: "clip_p_test" }), none)).json();
    expect(j.version).toBe(p.version);
    expect((await clipPrepublish(post({ clipId: "nope" }), none)).status).toBe(404);
  });
});

describe("approve (Perfect ✓)", () => {
  it("400 lists what is missing, then succeeds and moves the project to In review", async () => {
    const p = seed({ caption: undefined, thumb: undefined });
    const miss = await approveRoute(post({}), ctx(p.id));
    expect(miss.status).toBe(400);
    expect((await miss.json()).error.missing).toEqual(["caption", "thumbnail"]);

    const ready = seed({ id: "p_ready" });
    const j = await (await approveRoute(post({ version: ready.version }), ctx("p_ready"))).json();
    expect(j.clipId).toBe("clip_p_ready");
    expect(j.reviewUrl).toBe("/review/clip_p_ready");
    expect(projects.get("p_ready")?.status).toBe("In review");
  });
});

describe("publish", () => {
  const fixAudio = async (p: Project) => { await swap(post({ trackId: "alt1", version: p.version }), ctx(p.id)); };

  it("requires an Idempotency-Key", async () => {
    const p = seed();
    const res = await publish(post({}), ctx(p.id));
    expect(res.status).toBe(400);
    expect((await res.json()).error.details[0].path).toBe("Idempotency-Key");
  });

  it("is blocked while a blocker remains", async () => {
    const p = seed();
    const res = await publish(post({ acceptWarnings: true }, { "idempotency-key": "k" }), ctx(p.id));
    expect(res.status).toBe(409);
    const j = await res.json();
    expect(j.error.blockers).toBe(1);
    expect(j.error.details[0].id).toBe("aud-yt_short");
  });

  it("with warnings, needs acceptWarnings", async () => {
    const p = seed({ platforms: ["ig_reel"] }); // g1 on Instagram: audio is a warning, not a blocker
    const res = await publish(post({}, { "idempotency-key": "w" }), ctx(p.id));
    expect(res.status).toBe(409);
    expect((await res.json()).error.needsAcceptWarnings).toBe(true);
    expect((await publish(post({ acceptWarnings: true }, { "idempotency-key": "w2" }), ctx(p.id))).status).toBe(202);
  });

  it("publishes once per key: job runs, project becomes Published, one post per platform, timestamp from the demo clock", async () => {
    const p = seed();
    await fixAudio(p);
    const opts = { acceptWarnings: true };
    const a = await publish(post(opts, { "idempotency-key": "same", "x-demo-now": "2026-12-25T08:30:00Z" }), ctx(p.id));
    expect(a.status).toBe(202);
    const first = await a.json();
    const b = await (await publish(post(opts, { "idempotency-key": "same" }), ctx(p.id))).json();
    expect(b.jobId).toBe(first.jobId); // double click publishes once

    expect(projects.get(p.id)?.status).not.toBe("Published"); // not until the job finishes
    vi.advanceTimersByTime(4000);
    const done = await job(first.jobId);
    expect(done.status).toBe("done");
    expect(done.steps.map((s: { label: string }) => s.label)).toEqual(["Uploading video", "Setting cover + caption", "Publishing to YouTube Short", "Publishing to Instagram Reel"]);
    expect(projects.get(p.id)?.status).toBe("Published");

    await job(first.jobId); // polling again must not duplicate posts
    const list = await (await posts(new Request("http://t/published-posts"), none)).json();
    expect(list.posts).toHaveLength(2);
    expect(list.posts.map((x: { platform: string }) => x.platform).sort()).toEqual(["ig_reel", "yt_short"]);
    expect(list.posts[0]).toMatchObject({ projectId: p.id, metrics: null, metricsAvailable: false, publishedAt: "2026-12-25T08:30:00.000Z" });
  });

  it("publishing an already-published project is a no-op even with a new key", async () => {
    const p = seed();
    await fixAudio(p);
    const first = await (await publish(post({ acceptWarnings: true }, { "idempotency-key": "a" }), ctx(p.id))).json();
    vi.advanceTimersByTime(4000);
    await job(first.jobId);
    const again = await publish(post({ acceptWarnings: true }, { "idempotency-key": "b" }), ctx(p.id));
    expect(again.status).toBe(200);
    expect((await again.json()).alreadyPublished).toBe(true);
    expect((await (await posts(new Request("http://t/published-posts"), none)).json()).posts).toHaveLength(2);
  });

  it("the clipId alias publishes the same project", async () => {
    const p = seed({ clipId: "clip_p_test" });
    await fixAudio(p);
    expect((await clipPublish(post({ clipId: "clip_p_test", acceptWarnings: true }, { "idempotency-key": "z" }), none)).status).toBe(202);
  });
});

describe("thumbnails (B6)", () => {
  it("returns six frame candidates with stats and honest media availability", async () => {
    const p = seed();
    const j = await (await thumbs(new Request("http://t/t"), ctx(p.id))).json();
    expect(j.candidates).toHaveLength(6);
    expect(j.candidates[0]).toMatchObject({ i: 0, face: 92, eyesOpen: true, mediaAvailable: p.media });
    expect(j.candidates[3].eyesOpen).toBe(false);
  });

  it("score equals the shared browser heuristic and is flagged as an estimate", async () => {
    const input = { text: "TERM SHEET IN THREE DAYS", template: "brand" as const, cutout: true, frameFace: 92 };
    const j = await (await score(post(input), none)).json();
    expect(j.score).toBe(clickReadiness(input).score);
    expect(j.estimated).toBe(true);
    expect(j.checks.find((c: { id: string }) => c.id === "words").pass).toBe(false); // 5 words
    const p = seed();
    const viaProject = await (await score(post({ text: "SHORT", template: "brand", cutout: true, projectId: p.id, frame: 0 }), none)).json();
    expect(viaProject.score).toBe(clickReadiness({ text: "SHORT", template: "brand", cutout: true, frameFace: 92 }).score);
  });

  it("score needs frameFace or projectId + frame", async () => {
    expect((await score(post({ text: "a", template: "brand", cutout: true }), none)).status).toBe(400);
  });
});

describe("align, clips, render jobs (B6)", () => {
  it("align flags lines with no footage instead of inventing a match", async () => {
    const p = seed();
    const { jobId } = await (await align(post(), ctx(p.id))).json();
    expect((await job(jobId)).status).toBe("queued");
    vi.advanceTimersByTime(3000);
    const done = await job(jobId);
    expect(done.status).toBe("done");
    const lines = done.result.alignments as { text: string; matched: boolean }[];
    expect(lines.find((l) => /^Add a customer testimonial/.test(l.text))?.matched).toBe(false);
    expect(done.result.unmatchedLines).toHaveLength(lines.filter((l) => !l.matched).length);
    expect(done.result.source).toBe("demo");
  });

  it("clips returns scored suggestions including the unused one", async () => {
    const p = seed();
    const { jobId } = await (await clips(post({}), ctx(p.id))).json();
    vi.advanceTimersByTime(3000);
    const done = await job(jobId);
    const list = done.result.clips as { id: string; score: number; unused?: boolean }[];
    expect(list[0].score).toBe(0.93);
    expect(list.at(-1)).toMatchObject({ id: "cx", unused: true });
  });

  it("render returns the pre-baked file for the aspect and says when edits were not rendered", async () => {
    const p = seed({ clipId: "clip_p_test" });
    const a = await (await render(post({ aspect: "9:16" }), ctx("clip_p_test"))).json();
    vi.advanceTimersByTime(4000);
    const r1 = (await job(a.jobId)).result;
    expect(r1).toMatchObject({ url: "/demo/g1/output_9x16.mp4", prebaked: true, edited: false });
    expect(r1.specReport.every((s: { withinLimit: boolean }) => s.withinLimit)).toBe(true);

    projects.save({ ...projects.get(p.id)!, timeline: projects.get(p.id)!.timeline.map((s) => ({ ...s, touched: true })) }, new Date());
    const b = await (await render(post({ aspect: "16:9" }), ctx("clip_p_test"))).json();
    vi.advanceTimersByTime(4000);
    const r2 = (await job(b.jobId)).result;
    expect(r2).toMatchObject({ url: "/demo/g1/output.mp4", edited: true });
    expect(r2.note).toContain("pre-rendered");
  });
});
