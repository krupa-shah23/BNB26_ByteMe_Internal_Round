// Fingerprints demo media and writes the hashes into fixtures/groups.json.
//   npm run hash-demo                 hashes the sources of g1…g5 found in public/demo/<group>/ (as before)
//   npm run hash-demo -- <folder>     also (re)builds the "photo-reel" group from the ORIGINAL p1…p18 photos in <folder>:
//                                     sha256(first 1 MB) + byte size + pixel size per photo, and the reel's probe data
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPS_FILE, ROOT, REEL_DIR, buildPhotoReelGroup, findPhotos, hasReel, sha256First1Mb, writeGroup } from "./lib/photoReelFixture.mjs";
import { probeMp4 } from "./lib/mp4probe.mjs";

const folder = process.argv.slice(2).find((a) => !a.startsWith("-"));
let found = 0;

// 1) photo-reel from the original photos
if (folder) {
  const photos = findPhotos(folder);
  if (photos.length === 0) { console.error(`No p1…p18 images found in ${folder}`); process.exit(1); }
  const probe = hasReel() ? probeMp4(join(REEL_DIR, "reel.mp4")) : null;
  writeGroup(buildPhotoReelGroup(photos, probe));
  found += photos.length;
  console.log(`photo-reel: ${photos.length} photos fingerprinted${photos.length < 18 ? ` (WARNING: ${18 - photos.length} missing)` : ""}${probe ? `, reel ${probe.width}x${probe.height} ${probe.durationSec}s ${probe.codec}` : ", reel not in public/demo/photo-reel yet"}.`);
}

// 2) the original groups (unchanged behaviour)
const data = JSON.parse(readFileSync(GROUPS_FILE, "utf8"));
for (const g of data.groups) {
  if (g.kind === "photo-reel") continue;
  for (const r of g.inputs) {
    const p = join(ROOT, "public", "demo", g.id, r.filenames[0]);
    if (existsSync(p)) { r.sha256_first_1mb = sha256First1Mb(p); found++; console.log(`${g.id} ${r.role} ${r.filenames[0]} -> ${r.sha256_first_1mb.slice(0, 12)}…`); }
  }
  for (const ph of g.photos) {
    const p = join(ROOT, "public", "demo", g.id, "photos", ph.filenames[0]);
    if (existsSync(p)) { ph.sha256 = sha256First1Mb(p); found++; console.log(`${g.id} photo ${ph.filenames[0]} -> ${ph.sha256.slice(0, 12)}…`); }
  }
}
writeFileSync(GROUPS_FILE, JSON.stringify(data, null, 2) + "\n");
console.log(found ? `Updated ${found} fingerprints.` : "No media found in public/demo/<group>/, nothing to hash yet (name-and-duration matching still works).");
