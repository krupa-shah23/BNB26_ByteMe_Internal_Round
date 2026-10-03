import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/types";

// Isolated in-memory stand-in for the B3 project repository (the real one writes .data/db.json).
vi.mock("@/lib/server/projectRepo", () => {
  let rows: Project[] = [];
  return {
    projects: { all: () => rows, get: (id: string) => rows.find((p) => p.id === id), insert: (p: Project) => { rows.unshift(p); return p; } },
    reset: () => { rows = []; },
  };
});

import { POST as match } from "@/app/api/v1/groups/match/route";
import { POST as generate } from "@/app/api/v1/groups/[id]/generate/route";
import { GET as getJobRoute } from "@/app/api/v1/jobs/[id]/route";
import { POST as cancelRoute } from "@/app/api/v1/jobs/[id]/cancel/route";
import { GET as streamRoute } from "@/app/api/v1/jobs/[id]/stream/route";
import { POST as resetRoute } from "@/app/api/v1/demo/reset/route";
import { GET as health } from "@/app/api/v1/health/route";
import { generationSteps } from "@/lib/jobSteps";
import { groups, sampleFingerprints } from "@/lib/match";
import { projects } from "@/lib/server/projectRepo";
import { settleJobs } from "@/lib/server/jobs";

const post = (url: string, json?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://t${url}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: json === undefined ? undefined : JSON.stringify(json) });
const files = (id: string) => sampleFingerprints(groups.find((g) => g.id === id)!, true).map((f) => ({ name: f.name, size: f.size, sha256First1MB: f.sha, durationSec: f.durationSec, kind: f.kind }));
const ctx = (id: string) => ({ params: { id } });
const get = (id: string) => getJobRoute(new Request("http://t/j"), ctx(id)).then((r) => r.json());
const total = (id: string) => generationSteps(groups.find((g) => g.id === id)!).reduce((a, s) => a + s.ms, 0);

beforeEach(async () => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-03T10:00:00Z")); await resetRoute(post("/api/v1/demo/reset"), { params: {} }); });
afterEach(() => vi.useRealTimers());

describe("health + errors", () => {
  it("health is ok", async () => { expect((await (await health(new Request("http://t/h"), { params: {} })).json()).ok).toBe(true); });
  it("invalid body returns the agreed error shape", async () => {
    const res = await match(post("/api/v1/groups/match", { files: [{ name: "a.mp4" }] }), { params: {} });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error.code).toBe("VALIDATION_FAILED");
    expect(Array.isArray(j.error.details)).toBe(true);
  });
  it("bad JSON is a 400, unknown group is a 404, unknown job is a 404", async () => {
    expect((await match(new Request("http://t/m", { method: "POST", body: "{" }), { params: {} })).status).toBe(400);
    expect((await generate(post("/x", {}), ctx("g99"))).status).toBe(404);
    expect((await getJobRoute(new Request("http://t/j"), ctx("nope"))).status).toBe(404);
  });
});

describe("POST /groups/match", () => {
  it("matches every group in shuffled order", async () => {
    for (const g of groups) {
      const j = await (await match(post("/api/v1/groups/match", { files: files(g.id) }), { params: {} })).json();
      expect(j.groupId).toBe(g.id);
      expect(j.missingRoles).toEqual([]);
    }
  });
  it("x-demo-scenario forces a group", async () => {
    const j = await (await match(post("/api/v1/groups/match", { files: files("g1") }, { "x-demo-scenario": "g2" }), { params: {} })).json();
    expect(j.groupId).toBe("g2");
  });
});

describe("generate + jobs", () => {
  it("returns 202 and a job that runs through every step to done, then creates the project once", async () => {
    const res = await generate(post("/api/v1/groups/g1/generate", {}), ctx("g1"));
    expect(res.status).toBe(202);
    const { jobId, projectId } = await res.json();

    let j = await get(jobId);
    expect(j.status).toBe("queued");
    expect(projects.get(projectId)).toBeUndefined(); // not in Studio until the job is done

    vi.advanceTimersByTime(2500);
    j = await get(jobId);
    expect(j.status).toBe("running");
    expect(j.steps.filter((s: { status: string }) => s.status === "done").length).toBeGreaterThan(0);
    expect(j.progress).toBeGreaterThan(0);

    vi.advanceTimersByTime(total("g1"));
    j = await get(jobId);
    expect(j.status).toBe("done");
    expect(j.progress).toBe(1);
    expect(j.result.projectId).toBe(projectId);
    expect(j.result.outputUrl).toBe("/demo/g1/output.mp4");
    expect(projects.get(projectId)?.groupId).toBe("g1");
    await get(jobId); // polling again must not create a second project
    expect(projects.all().filter((p) => p.id === projectId)).toHaveLength(1);
  });

  it("Idempotency-Key returns the same job for a repeated request", async () => {
    const a = await (await generate(post("/x", {}, { "idempotency-key": "k1" }), ctx("g2"))).json();
    const b = await (await generate(post("/x", {}, { "idempotency-key": "k1" }), ctx("g2"))).json();
    expect(b.jobId).toBe(a.jobId);
    const c = await (await generate(post("/x", {}, { "idempotency-key": "k2" }), ctx("g2"))).json();
    expect(c.jobId).not.toBe(a.jobId);
  });

  it("a finished group reports alreadyGenerated unless force is set", async () => {
    const first = await (await generate(post("/x", {}), ctx("g3"))).json();
    vi.advanceTimersByTime(total("g3") + 100);
    settleJobs();
    const again = await generate(post("/x", {}), ctx("g3"));
    expect(again.status).toBe(200);
    const aj = await again.json();
    expect(aj.alreadyGenerated).toBe(true);
    expect(aj.projectId).toBe(first.projectId);
    expect((await generate(post("/x", { force: true }), ctx("g3"))).status).toBe(202);
  });

  it("settleJobs creates the project even if nobody polled the job", async () => {
    const { projectId } = await (await generate(post("/x", { title: "My cut", platforms: ["yt_short"] }), ctx("g4"))).json();
    vi.advanceTimersByTime(total("g4") + 100);
    settleJobs();
    const p = projects.get(projectId)!;
    expect(p.title).toBe("My cut");
    expect(p.platforms).toEqual(["yt_short"]);
    expect(p.createdAt).toBe("2026-10-03T10:00:00.000Z");
  });

  it("slow multiplier stretches the job", async () => {
    const { jobId } = await (await generate(post("/x", {}, { "x-demo-slow": "2.5" }), ctx("g5"))).json();
    vi.advanceTimersByTime(total("g5") + 100);
    expect((await get(jobId)).status).toBe("running");
    vi.advanceTimersByTime(total("g5") * 1.5);
    expect((await get(jobId)).status).toBe("done");
  });

  it("cancel stops a running job and no project is created", async () => {
    const { jobId, projectId } = await (await generate(post("/x", {}), ctx("g1"))).json();
    vi.advanceTimersByTime(1000);
    expect((await (await cancelRoute(post("/c"), ctx(jobId))).json()).status).toBe("cancelled");
    vi.advanceTimersByTime(total("g1") * 2);
    settleJobs();
    expect(projects.get(projectId)).toBeUndefined();
  });

  it("SSE sends the current state first, then closes on done", async () => {
    vi.useRealTimers();
    const { jobId } = await (await generate(post("/x", {}, { "x-demo-slow": "0.02" }), ctx("g1"))).json();
    const res = await streamRoute(new Request("http://t/s"), ctx(jobId));
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text(); // resolves when the server closes the stream
    expect(text.startsWith("event: step")).toBe(true);
    expect(text).toContain("event: done");
    expect(JSON.parse(text.split("event: done\ndata: ")[1].split("\n")[0]).result.projectId).toBeTruthy();
  });
});
