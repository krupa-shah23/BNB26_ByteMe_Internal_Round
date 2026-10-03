import { ok, parse, withRoute } from "@/lib/server/http";
import { studioQuery } from "@/lib/schemas/project";
import { projects } from "@/lib/server/projectRepo";
import { settleJobs } from "@/lib/server/jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute((req) => {
  const q = parse(studioQuery, Object.fromEntries(new URL(req.url).searchParams));
  settleJobs(); // a finished job nobody polled still produces its project
  const needle = q.q?.toLowerCase();
  const rows = projects.all()
    .filter((p) => (!q.status || p.status === q.status) && (!q.type || p.type === q.type) && (!q.platform || p.platforms.includes(q.platform))
      && (!needle || p.title.toLowerCase().includes(needle)) && (!q.from || p.createdAt >= q.from) && (!q.to || p.createdAt <= q.to))
    .sort((a, b) => (q.sort === "title" ? a.title.localeCompare(b.title) : a[q.sort].localeCompare(b[q.sort])) * (q.order === "asc" ? 1 : -1))
    .map((p) => ({ projectId: p.id, title: p.title, type: p.type, thumbUrl: null as string | null, groupId: p.groupId, generatedAt: p.createdAt, updatedAt: p.updatedAt, status: p.status, platforms: p.platforms }));
  return ok({ items: rows, total: rows.length });
});
