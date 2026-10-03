import crypto from "node:crypto";
import { ApiError, ok, withRoute } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/llm";
import { MAX_UPLOAD_BYTES, MIME, saveUpload } from "@/lib/server/uploads";
export const runtime = "nodejs";

/** POST multipart/form-data with a `file` field. Returns { id } to pass to /api/analyze and to GET /api/upload/:id. */
export const POST = withRoute(async (req) => {
  rateLimit(req, 10, 3000);
  const form = await req.formData().catch(() => { throw new ApiError("VALIDATION_FAILED", 400, "Expected multipart form data"); });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("VALIDATION_FAILED", 400, "Missing file field");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError("VALIDATION_FAILED", 413, `File is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`);
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!MIME[ext]) throw new ApiError("VALIDATION_FAILED", 415, "Unsupported file type");
  const id = saveUpload(crypto.randomUUID(), ext, Buffer.from(await file.arrayBuffer()));
  return ok({ id, name: file.name, size: file.size, url: `/api/upload/${id}` }, 201);
});
