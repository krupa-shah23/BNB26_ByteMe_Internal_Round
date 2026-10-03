import fs from "node:fs";
import { Readable } from "node:stream";
import { withRoute } from "@/lib/server/http";
import { uploadPath } from "@/lib/server/uploads";
export const runtime = "nodejs";

/** Serves an uploaded file with Range support so <video> can seek. */
export const GET = withRoute<{ id: string }>(async (req, { params }) => {
  const f = uploadPath(params.id);
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  const base = { "Content-Type": f.mime, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" };
  if (!m) return new Response(Readable.toWeb(fs.createReadStream(f.path)) as ReadableStream, { headers: { ...base, "Content-Length": String(f.size) } });
  const start = m[1] ? Number(m[1]) : Math.max(0, f.size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), f.size - 1) : f.size - 1;
  if (start > end || start >= f.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${f.size}` } });
  return new Response(Readable.toWeb(fs.createReadStream(f.path, { start, end })) as ReadableStream, {
    status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${f.size}`, "Content-Length": String(end - start + 1) },
  });
});
