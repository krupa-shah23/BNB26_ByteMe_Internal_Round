/// <reference lib="webworker" />
// Hashes the first 1 MB of a file with SHA-256. Runs off the main thread.
self.onmessage = async (e: MessageEvent<{ id: number; file: File }>) => {
  const { id, file } = e.data;
  try {
    const buf = await file.slice(0, 1024 * 1024).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    (self as unknown as Worker).postMessage({ id, sha: hex });
  } catch {
    (self as unknown as Worker).postMessage({ id, sha: "" });
  }
};
export {};
