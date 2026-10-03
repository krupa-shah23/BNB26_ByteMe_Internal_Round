// Computes sha256 of the first 1 MB of each demo source in public/demo/<group>/ and writes it into fixtures/groups.json.
// Run after you drop the real files in:  npm run hash-demo
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const file = join(root, "fixtures", "groups.json");
const data = JSON.parse(readFileSync(file, "utf8"));

function hash(path) {
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(1024 * 1024);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  return createHash("sha256").update(buf.subarray(0, n)).digest("hex");
}

let found = 0;
for (const g of data.groups) {
  for (const r of g.inputs) {
    const p = join(root, "public", "demo", g.id, r.filenames[0]);
    if (existsSync(p)) { r.sha256_first_1mb = hash(p); found++; console.log(`${g.id} ${r.role} ${r.filenames[0]} -> ${r.sha256_first_1mb.slice(0, 12)}…`); }
  }
  for (const ph of g.photos) {
    const p = join(root, "public", "demo", g.id, "photos", ph.filenames[0]);
    if (existsSync(p)) { ph.sha256 = hash(p); found++; console.log(`${g.id} photo ${ph.filenames[0]} -> ${ph.sha256.slice(0, 12)}…`); }
  }
}
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(found ? `Updated ${found} hashes.` : "No media found in public/demo/<group>/ — nothing to hash yet (name-and-duration matching still works).");
