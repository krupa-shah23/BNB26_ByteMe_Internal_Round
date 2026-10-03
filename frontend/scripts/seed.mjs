// Resets server state to the exact demo start, then prints how to reset the browser side.
// Server: POST /api/v1/demo/reset when the app is running (SEED_URL, default http://localhost:3000), else delete .data/*.json.
import fs from "node:fs";
import path from "node:path";

const base = process.env.SEED_URL ?? "http://localhost:3000";
try {
  const res = await fetch(`${base}/api/v1/demo/reset`, { method: "POST", signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(String(res.status));
  console.log(`Server state reset via ${base}/api/v1/demo/reset`);
} catch {
  const dir = path.join(process.cwd(), ".data");
  let n = 0;
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (f.endsWith(".json")) { fs.rmSync(path.join(dir, f)); n++; }
  console.log(`App not reachable at ${base}; removed ${n} file(s) from .data/ (they re-seed on next start)`);
}
console.log(`Browser state:
  • In the app:   Ctrl+Shift+D → "Reset to seed state"
  • In DevTools:  localStorage.removeItem("creatorai-v1"); location.reload()
  • Media:        put sources in public/demo/g1…g5/, then run: npm run hash-demo`);
