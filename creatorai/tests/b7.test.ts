import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "@/lib/types";

vi.mock("@/lib/server/projectRepo", () => {
  const rows: Project[] = [];
  return { projects: { all: () => rows, get: (id: string) => rows.find((p) => p.id === id), insert: (p: Project) => { rows.unshift(p); return p; }, save: (p: Project) => p }, reset: () => { rows.length = 0; } };
});

import { GET as content } from "@/app/api/v1/analytics/content/route";
import { GET as earnings } from "@/app/api/v1/analytics/earnings/route";
import { GET as overview } from "@/app/api/v1/analytics/overview/route";
import { GET as audience } from "@/app/api/v1/audience/summary/route";
import { GET as getPerms, PUT as putPerms } from "@/app/api/v1/me/permissions/route";
import { GET as listCal, POST as addCal } from "@/app/api/v1/calendar/items/route";
import { PATCH as patchCal, DELETE as delCal } from "@/app/api/v1/calendar/items/[id]/route";
import { POST as snooze } from "@/app/api/v1/calendar/items/[id]/snooze/route";
import { GET as due } from "@/app/api/v1/calendar/due/route";
import { POST as swipe } from "@/app/api/v1/collabs/swipe/route";
import { GET as collabLog } from "@/app/api/v1/collabs/log/route";
import { GET as feed } from "@/app/api/v1/home/feed/route";
import { resetB7 } from "@/lib/server/b7Repo";
import { jobStore } from "@/lib/server/jobStore";

const req = (url: string, init: RequestInit = {}) => new Request(`http://t/api/v1${url}`, init);
const json = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  req(url, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: { id } });
const call = async (h: (r: Request, c: never) => Promise<Response> | Response, r: Request, c: unknown = { params: {} }) => { const res = await h(r, c as never); return { status: res.status, body: await res.json() }; };

beforeEach(() => { resetB7(); jobStore.reset(); });

describe("permissions gate analytics", () => {
  it("returns 403 PERMISSION_REQUIRED with no data until access is granted", async () => {
    for (const [h, key] of [[earnings, "earnings"], [overview, "reach"], [content, "reach"], [audience, "audience"]] as const) {
      const r = await call(h as never, req("/x"));
      expect(r.status).toBe(403);
      expect(r.body).toEqual({ error: { code: "PERMISSION_REQUIRED", message: expect.any(String), details: [], permission: key } });
    }
  });
  it("opens after PUT and closes again when revoked", async () => {
    await call(putPerms, json("/me/permissions", "PUT", { earnings: true }));
    expect((await call(earnings as never, req("/x"))).status).toBe(200);
    await call(putPerms, json("/me/permissions", "PUT", { earnings: false }));
    expect((await call(earnings as never, req("/x"))).status).toBe(403);
  });
  it("rejects unknown permission keys", async () => {
    expect((await call(putPerms, json("/me/permissions", "PUT", { nope: true }))).status).toBe(400);
    expect((await call(getPerms, req("/me/permissions"))).body.permissions.decided).toBe(false);
  });
});

describe("dashboard content", () => {
  it("shows a published post with no metrics as unavailable, never 0, and hides earnings without access", async () => {
    jobStore.addPost({ id: "post_1", projectId: "p1", platform: "yt_short", title: "Fresh post", publishedAt: "2026-10-03T10:00:00.000Z", thumbUrl: null, metrics: null, metricsAvailable: false });
    await call(putPerms, json("/me/permissions", "PUT", { reach: true }));
    const { status, body } = await call(content as never, req("/analytics/content"));
    expect(status).toBe(200);
    const row = body.rows.find((r: { id: string }) => r.id === "post_1");
    expect(row).toMatchObject({ available: false, views: null, reach: null, likes: null, earnings: null });
    expect(body.rows[0].id).toBe("post_1"); // newest first
    expect(body.rows.every((r: { earnings: unknown }) => r.earnings === null)).toBe(true);
  });
  it("marks Instagram follower gains as estimated", async () => {
    await call(putPerms, json("/me/permissions", "PUT", { reach: true }));
    const { body } = await call(content as never, req("/analytics/content"));
    const ig = body.rows.find((r: { platform: string; available: boolean }) => r.platform === "Instagram" && r.available);
    expect(ig.followersGainedEstimated).toBe(true);
  });
});

describe("calendar", () => {
  it("creates, patches, snoozes and deletes an item", async () => {
    const created = await call(addCal, json("/calendar/items", "POST", { type: "reminder", title: "Call", startsAt: "2026-10-05T10:00:00.000Z", remindMin: 15 }));
    expect(created.status).toBe(201);
    const id = created.body.item.id as string;
    expect((await call(patchCal, json(`/calendar/items/${id}`, "PATCH", { title: "Call Meera" }), ctx(id))).body.item.title).toBe("Call Meera");
    const s = await call(snooze, json(`/calendar/items/${id}/snooze`, "POST", { minutes: 30 }, { "x-demo-now": "2026-10-05T09:00:00.000Z" }), ctx(id));
    expect(s.body.item.startsAt).toBe("2026-10-05T09:45:00.000Z");
    expect((await call(delCal, req(`/calendar/items/${id}`, { method: "DELETE" }), ctx(id))).status).toBe(200);
    expect((await call(delCal, req(`/calendar/items/${id}`, { method: "DELETE" }), ctx(id))).status).toBe(404);
  });
  it("fires a due reminder when the demo clock is fast-forwarded", async () => {
    const before = await call(due, req("/calendar/due", { headers: { "x-demo-now": "2020-01-01T00:00:00.000Z" } }));
    expect(before.body.due).toEqual([]);
    const after = await call(due, req("/calendar/due", { headers: { "x-demo-now": new Date(Date.now() + 30 * 86_400_000).toISOString() } }));
    expect(after.body.due.length).toBeGreaterThan(0);
    await call(patchCal, json(`/calendar/items/${after.body.due[0].id}`, "PATCH", { fired: true }), ctx(after.body.due[0].id));
    const again = await call(due, req("/calendar/due", { headers: { "x-demo-now": new Date(Date.now() + 30 * 86_400_000).toISOString() } }));
    expect(again.body.due.length).toBe(after.body.due.length - 1);
  });
  it("validates bodies and filters by type", async () => {
    expect((await call(addCal, json("/calendar/items", "POST", { type: "nope", title: "x", startsAt: "bad" }))).status).toBe(400);
    const r = await call(listCal, req("/calendar/items?type=collab"));
    expect(r.body.items.every((i: { type: string }) => i.type === "collab")).toBe(true);
  });
  it("lists collab calendar entries in the collab log", async () => {
    const r = await call(collabLog, req("/collabs/log"));
    expect(r.body.planned.length).toBeGreaterThan(0);
    expect(r.body.log.length).toBeGreaterThan(0);
  });
});

describe("collab swipe and home", () => {
  it("is deterministic and 404s for an unknown creator", async () => {
    const a = await call(swipe, json("/collabs/swipe", "POST", { creatorId: "c1", dir: "right" }));
    const b = await call(swipe, json("/collabs/swipe", "POST", { creatorId: "c1", dir: "right" }));
    expect(a.body.matched).toBe(b.body.matched);
    expect((await call(swipe, json("/collabs/swipe", "POST", { creatorId: "zz", dir: "up" }))).status).toBe(404);
  });
  it("serves the home feed from fixtures without any permission", async () => {
    const r = await call(feed as never, req("/home/feed"));
    expect(r.status).toBe(200);
    expect(r.body.ideas.length).toBeGreaterThan(0);
  });
});
