import { beforeEach, describe, expect, it } from "vitest";
import { GET as studio } from "@/app/api/v1/studio/items/route";
import { POST as create } from "@/app/api/v1/projects/route";
import { GET as getOne, PATCH as patch, DELETE as del } from "@/app/api/v1/projects/[id]/route";
import { PATCH as patchEdl } from "@/app/api/v1/projects/[id]/edl/route";
import { GET as history } from "@/app/api/v1/projects/[id]/history/route";
import { POST as duplicate } from "@/app/api/v1/projects/[id]/duplicate/route";
import { POST as suggest } from "@/app/api/v1/projects/[id]/captions/suggest/route";
import { POST as captions } from "@/app/api/v1/captions/generate/route";
import { POST as hooks } from "@/app/api/v1/ai/hooks/route";
import { POST as script } from "@/app/api/v1/ai/script/route";
import { POST as ideas } from "@/app/api/v1/trends/ideas/route";
import { POST as bio } from "@/app/api/v1/profile/bio/route";
import { reset } from "@/lib/server/projectRepo";

let n = 0;
const json = (url: string, method: string, body?: unknown, h: Record<string, string> = {}) =>
  new Request(`http://t/api/v1${url}`, { method, headers: { "content-type": "application/json", "x-forwarded-for": `ip-${n++}`, ...h }, body: body === undefined ? undefined : JSON.stringify(body) });
const call = async (h: (r: Request, c: never) => Promise<Response> | Response, r: Request, id?: string) => {
  const res = await h(r, { params: id ? { id } : {} } as never);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => { reset(); delete process.env.GEMINI_API_KEY; });

describe("B3 projects", () => {
  it("creates, lists newest first, filters and sorts", async () => {
    const c = await call(create, json("/projects", "POST", { groupId: "g2" }));
    expect(c.status).toBe(201);
    const list = await call(studio, json("/studio/items", "GET"));
    expect(list.body.items[0].projectId).toBe(c.body.project.id);
    expect(Object.keys(list.body.items[0])).toEqual(["projectId", "title", "type", "thumbUrl", "groupId", "generatedAt", "updatedAt", "status", "platforms"]);
    const pub = await call(studio, json("/studio/items?status=Published&q=hostel", "GET"));
    expect(pub.body.items.map((i: { projectId: string }) => i.projectId)).toEqual(["p_seed_g5"]);
    expect((await call(studio, json("/studio/items?sort=bogus", "GET"))).status).toBe(400);
  });

  it("persists a patch, bumps version and rejects a stale version with 409 plus the current project", async () => {
    const { project } = (await call(create, json("/projects", "POST", { groupId: "g2" }))).body;
    const p1 = await call(patch, json(`/projects/${project.id}`, "PATCH", { version: 1, title: "Edited" }), project.id);
    expect(p1.body.project).toMatchObject({ title: "Edited", version: 2 });
    expect((await call(getOne, json("", "GET"), project.id)).body.project.title).toBe("Edited");
    const stale = await call(patch, json(`/projects/${project.id}`, "PATCH", { version: 1, title: "x" }), project.id);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: "CONFLICT", current: { id: project.id, version: 2 } });
    expect((await call(patch, json(`/projects/${project.id}`, "PATCH", { title: "x" }), project.id)).status).toBe(400);
    expect((await call(patch, json(`/projects/${project.id}`, "PATCH", { version: 2, bogus: 1 }), project.id)).status).toBe(400);
  });

  it("edl save re-flows timing, records history and keeps the AI originals", async () => {
    const { project } = (await call(create, json("/projects", "POST", { groupId: "g2" }))).body;
    const tl = project.timeline.map((s: { dur: number }, i: number) => (i === 0 ? { ...s, dur: s.dur + 2, touched: true } : s));
    const r = await call(patchEdl, json("/edl", "PATCH", { version: 1, timeline: tl }), project.id);
    expect(r.status).toBe(200);
    expect(r.body.project.timeline[1].at).toBeCloseTo(r.body.project.timeline[0].dur, 1);
    expect(r.body.project.timeline[0].ai.dur).toBe(project.timeline[0].dur);
    expect((await call(history, json("", "GET"), project.id)).body.snapshots).toHaveLength(1);
  });

  it("duplicates and deletes; unknown ids 404", async () => {
    const d = await call(duplicate, json("", "POST"), "p_seed_g1");
    expect(d.body.project).toMatchObject({ status: "Generated", version: 1, title: expect.stringContaining("(copy)") });
    expect((await call(del, json("", "DELETE"), d.body.project.id)).status).toBe(200);
    expect((await call(getOne, json("", "GET"), d.body.project.id)).status).toBe(404);
    expect((await call(getOne, json("", "GET"), "nope")).body.error.code).toBe("NOT_FOUND");
  });

  it("mirrors a locally created project under its own id and refuses a duplicate id", async () => {
    const a = await call(create, json("/projects", "POST", { groupId: "g5", id: "p_local1", title: "Local", files: ["a.mp4"] }));
    expect(a.body.project).toMatchObject({ id: "p_local1", title: "Local", files: ["a.mp4"] });
    expect((await call(create, json("/projects", "POST", { groupId: "g5", id: "p_local1" }))).status).toBe(409);
    expect((await call(create, json("/projects", "POST", { groupId: "g5", id: "bad id" }))).status).toBe(400);
    expect((await call(create, json("/projects", "POST", { groupId: "nope" }))).status).toBe(404);
  });
});

describe("B4 AI routes", () => {
  it("without a key every route answers from fixtures with source demo and never a 5xx", async () => {
    const rs = await Promise.all([
      call(captions, json("/captions/generate", "POST", { tone: "pro" })),
      call(suggest, json("", "POST", {}), "p_seed_g1"),
      call(hooks, json("/ai/hooks", "POST", { topic: "pricing" })),
      call(script, json("/ai/script", "POST", { topic: "x", groupId: "g2" })),
      call(ideas, json("/trends/ideas", "POST", {})),
      call(bio, json("/profile/bio", "POST", { niche: "coding" })),
    ]);
    for (const r of rs) { expect(r.status).toBe(200); expect(r.body.source).toBe("demo"); }
    expect(rs[1].body.options[0].hashtags.length).toBeGreaterThan(0);
    expect(rs[3].body.lines.length).toBeGreaterThan(0);
  });

  it("keeps captions inside the platform limit and tolerates loose legacy bodies", async () => {
    const r = await call(captions, json("/captions/generate", "POST", { tone: "witty", platform: "x", extra: 1 }));
    expect(r.status).toBe(200);
    for (const o of r.body.options) expect(o.caption.length).toBeLessThanOrEqual(260);
  });

  it("validates input and rate limits a single client", async () => {
    expect((await call(hooks, json("/ai/hooks", "POST", { nope: 1 }))).body.error.code).toBe("VALIDATION_FAILED");
    const same = { "x-forwarded-for": "9.9.9.9" };
    const codes: number[] = [];
    for (let i = 0; i < 14; i++) codes.push((await call(bio, json("/profile/bio", "POST", { niche: `n${i}` }, same))).status);
    expect(codes).toContain(429);
  });

  it("falls back to the fixture inside 4 s when Gemini is unreachable", async () => {
    process.env.GEMINI_API_KEY = "k";
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
    try {
      const t = Date.now();
      const r = await call(hooks, json("/ai/hooks", "POST", { topic: "offline" }));
      expect(r.status).toBe(200);
      expect(r.body.source).toBe("demo");
      expect(Date.now() - t).toBeLessThan(4500);
    } finally { globalThis.fetch = orig; }
  });

  it("uses live output when Gemini returns valid JSON and truncates to limits", async () => {
    process.env.GEMINI_API_KEY = "k";
    const orig = globalThis.fetch;
    const out = { options: [{ caption: "x".repeat(500), cta: "go", hashtags: ["a", "#b"] }] };
    globalThis.fetch = (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }))) as typeof fetch;
    try {
      const r = await call(captions, json("/captions/generate", "POST", { tone: "live-test", platform: "ig_reel" }));
      expect(r.body.source).toBe("live");
      expect(r.body.options[0].caption.length).toBeLessThanOrEqual(220);
      expect(r.body.options[0].hashtags).toEqual(["#a", "#b"]);
    } finally { globalThis.fetch = orig; }
  });
});
