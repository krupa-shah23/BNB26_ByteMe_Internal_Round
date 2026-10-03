import fs from "node:fs";
import path from "node:path";
import { ApiError } from "./http";

/** Gemini takes video inline up to ~20 MB of request, so the cap stays under that. */
export const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;
const DIR = path.join(process.cwd(), ".data", "uploads");

export const MIME: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/mp4", mkv: "video/x-matroska", mp3: "audio/mpeg", wav: "audio/wav", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const ID_RE = /^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/;

export function saveUpload(id: string, ext: string, bytes: Buffer) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${id}.${ext}`), bytes);
  return `${id}.${ext}`;
}

/** Resolves a stored upload by its id (with extension). The strict pattern rules out path traversal. */
export function uploadPath(fileId: string) {
  if (!ID_RE.test(fileId)) throw new ApiError("VALIDATION_FAILED", 400, "Invalid upload id");
  const p = path.join(DIR, fileId);
  if (!fs.existsSync(p)) throw new ApiError("NOT_FOUND", 404, "Upload not found");
  return { path: p, size: fs.statSync(p).size, mime: MIME[fileId.split(".")[1]] ?? "application/octet-stream" };
}
