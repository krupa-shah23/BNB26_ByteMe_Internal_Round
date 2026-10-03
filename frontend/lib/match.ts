import groupsJson from "@/fixtures/groups.json";
import type { FileFingerprint, Group, MatchResult } from "./types";

export const groups = groupsJson.groups as unknown as Group[];
export const defaultGroup = groupsJson.default as unknown as Group;

export const normName = (n: string) =>
  n.toLowerCase().replace(/\s+/g, "").replace(/\(\d+\)/g, "").replace(/^copyof/, "");

/** Strength of a single file ↔ role match: hash > filename > duration. */
function score(f: FileFingerprint, role: { filenames: string[]; sha256_first_1mb: string; durationSec: number }): number {
  if (role.sha256_first_1mb && f.sha && role.sha256_first_1mb === f.sha) return 3;
  if (role.filenames.some((n) => normName(n) === normName(f.name))) return 2;
  if (f.durationSec > 0 && Math.abs(f.durationSec - role.durationSec) <= 0.3) return 1;
  return 0;
}

export function matchFiles(files: FileFingerprint[]): MatchResult {
  // dedupe on sha (or name+size when hashing failed)
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const uniq = files.filter((f) => {
    const key = f.sha || `${normName(f.name)}:${f.size}`;
    if (seen.has(key)) { duplicates.push(f.name); return false; }
    seen.add(key);
    return true;
  });
  const videos = uniq.filter((f) => f.kind === "video");
  const images = uniq.filter((f) => f.kind === "image");

  const results = groups.map((g) => {
    const used = new Set<string>();
    const matched: { role: string; fileName: string; s: number }[] = [];
    for (const r of g.inputs) {
      let best: { f: FileFingerprint; s: number } | null = null;
      for (const f of videos) {
        if (used.has(f.name)) continue;
        const s = score(f, r);
        if (s > 0 && (!best || s > best.s)) best = { f, s };
      }
      if (best) { used.add(best.f.name); matched.push({ role: r.role, fileName: best.f.name, s: best.s }); }
    }
    const photosMatched = images
      .filter((f) => g.photos.some((p) => p.filenames.some((n) => normName(n) === normName(f.name)) || (p.sha256 && p.sha256 === f.sha)))
      .map((f) => f.name);
    const total = matched.reduce((a, m) => a + m.s, 0) + photosMatched.length;
    return { g, matched, photosMatched, total, count: matched.length };
  });
  results.sort((a, b) => b.count - a.count || b.total - a.total);
  const top = results[0];
  const candidates = results.filter((r) => r.count > 0 && r.count === top.count && r.total === top.total).map((r) => ({ groupId: r.g.id, score: r.total }));

  if (!top || top.count === 0) {
    return { matched: [], missingRoles: [], photosMatched: [], unused: uniq.map((f) => f.name), confidence: 0, candidates: [], isDefault: true, duplicates };
  }
  const matchedNames = new Set([...top.matched.map((m) => m.fileName), ...top.photosMatched]);
  return {
    groupId: top.g.id,
    matched: top.matched.map(({ role, fileName }) => ({ role, fileName })),
    missingRoles: top.g.inputs.filter((r) => !top.matched.some((m) => m.role === r.role)).map((r) => r.role),
    photosMatched: top.photosMatched,
    unused: uniq.filter((f) => !matchedNames.has(f.name)).map((f) => f.name),
    confidence: top.count / top.g.inputs.length,
    candidates,
    isDefault: false,
    duplicates,
  };
}

/** Fingerprints that stand in for a group's real files (used by the "sample set" button + Demo Panel). */
export function sampleFingerprints(g: Group, shuffle = true): FileFingerprint[] {
  const list: FileFingerprint[] = g.inputs.map((r) => ({
    name: r.filenames[0], size: Math.round(r.durationSec * 1_400_000), sha: r.sha256_first_1mb, durationSec: r.durationSec, kind: "video",
  }));
  g.photos.forEach((p) => list.push({ name: p.filenames[0], size: 480_000, sha: p.sha256, durationSec: 0, kind: "image" }));
  return shuffle ? [...list].reverse() : list;
}

export const groupById = (id: string) => groups.find((g) => g.id === id) ?? defaultGroup;
