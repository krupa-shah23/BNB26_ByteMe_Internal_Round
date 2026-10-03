import type { FileFingerprint } from "./types";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (sha: string) => void>();

function hashFirstMb(file: File): Promise<string> {
  if (typeof Worker === "undefined") return Promise.resolve("");
  try {
    if (!worker) {
      worker = new Worker(new URL("./hash.worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<{ id: number; sha: string }>) => {
        pending.get(e.data.id)?.(e.data.sha);
        pending.delete(e.data.id);
      };
    }
    const id = ++seq;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      worker!.postMessage({ id, file });
      setTimeout(() => { if (pending.delete(id)) resolve(""); }, 6000); // hashing failed → fall back to name + duration
    });
  } catch {
    return Promise.resolve("");
  }
}

function readDuration(file: File): Promise<number> {
  if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) return Promise.resolve(0);
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    const done = (d: number) => { URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? d : 0); };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0); // e.g. HEVC .mov the browser cannot decode
    setTimeout(() => done(0), 3000);
    el.src = url;
  });
}

export async function fingerprint(file: File): Promise<FileFingerprint> {
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : /\.(mp4|mov|mkv|webm)$/i.test(file.name) ? "video" : /\.(jpe?g|png|webp)$/i.test(file.name) ? "image" : "other";
  const [sha, durationSec] = await Promise.all([hashFirstMb(file), readDuration(file)]);
  return { name: file.name, size: file.size, sha, durationSec, kind };
}
