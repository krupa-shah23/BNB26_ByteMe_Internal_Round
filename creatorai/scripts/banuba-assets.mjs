// Copies the Banuba WebAR runtime (wasm, data, face/eyes/lips/skin/background modules) from node_modules into public/banuba/sdk.
// Runs before dev/build, so the large binaries never need to be committed.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "node_modules", "@banuba", "webar", "dist");
const out = path.join(root, "public", "banuba", "sdk");
if (!existsSync(dist)) { console.warn("banuba-assets: @banuba/webar is not installed, skipping"); process.exit(0); }
mkdirSync(path.join(out, "modules"), { recursive: true });
for (const f of ["BanubaSDK.data", "BanubaSDK.wasm", "BanubaSDK.simd.wasm"]) cpSync(path.join(dist, f), path.join(out, f));
for (const m of ["face_tracker", "eyes", "lips", "skin", "background"]) cpSync(path.join(dist, "modules", `${m}.zip`), path.join(out, "modules", `${m}.zip`));
console.log("banuba-assets: copied to public/banuba/sdk");
