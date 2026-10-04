import type { FileFingerprint, Group, MatchResult } from "./types";

/** "Photo Dump → Reel": 18 photos named p1…p18 identify one pre-baked reel. Pure helpers shared by the matcher, UI and tests. */
export const PHOTO_COUNT = 18;
/** ≥ this many recognised photos starts the generation job on its own. */
export const GENERATE_MIN = 14;
/** 8…13 recognised photos: "Recognised N of 18. Generate anyway?"; below this the generic _default scenario takes over. */
export const ANYWAY_MIN = 8;

/**
 * Photo identity from a file name: lowercase, no extension, no " (1)" / "copy", no spaces, underscores or hyphens,
 * and p01 ≡ p1. Returns "p1"…"p18", or null for anything else.
 */
export function normaliseName(name: string): string | null {
  let s = name.toLowerCase().trim();
  s = s.replace(/\.[a-z0-9]{2,5}$/, "");
  s = s.replace(/^copy of\s*/, "").replace(/\(\d+\)/g, "").replace(/[\s_-]*copy(?:[\s_-]*\d+)?/g, "");
  s = s.replace(/[\s_-]+/g, "");
  const m = /^p0*([1-9]\d?)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= PHOTO_COUNT ? `p${n}` : null;
}

export const roleNumber = (role: string) => Number(role.slice(1));
export const isPhotoReel = (g?: Pick<Group, "kind"> | null) => g?.kind === "photo-reel";

export interface PhotoReelMatch { count: number; result: MatchResult }

/**
 * Matches dropped files to the photo-reel group, in any order. A SHA-256 (first 1 MB) match wins, so a renamed
 * photo still counts; otherwise the normalised name decides. Duplicates are dropped silently; everything else is "unused".
 */
export function matchPhotoReel(files: FileFingerprint[], g: Group): PhotoReelMatch {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const roles = new Map<string, string>();
  const unused: string[] = [];
  for (const f of files) {
    const key = f.sha || `${f.name.toLowerCase()}:${f.size}`;
    if (seen.has(key)) { duplicates.push(f.name); continue; }
    seen.add(key);
    if (f.kind !== "image") { unused.push(f.name); continue; }
    const byHash = f.sha ? g.inputs.find((r) => r.sha256_first_1mb && r.sha256_first_1mb === f.sha)?.role : undefined;
    const role = byHash ?? normaliseName(f.name);
    if (role && g.inputs.some((r) => r.role === role)) {
      if (roles.has(role)) duplicates.push(f.name); // same photo again under another name
      else roles.set(role, f.name);
    } else unused.push(f.name);
  }
  const matched = [...roles].sort((a, b) => roleNumber(a[0]) - roleNumber(b[0])).map(([role, fileName]) => ({ role, fileName }));
  const count = matched.length;
  return {
    count,
    result: {
      groupId: g.id, matched,
      missingRoles: g.inputs.filter((r) => !roles.has(r.role)).map((r) => r.role),
      photosMatched: matched.map((m) => m.fileName), unused,
      confidence: count / g.inputs.length, candidates: [{ groupId: g.id, score: count }], isDefault: false, duplicates,
    },
  };
}

/** What the UI shows before the job starts. */
export function recognisedLabel(count: number, total = PHOTO_COUNT) {
  return count >= GENERATE_MIN ? `Recognised ${count} photos` : `Recognised ${count} of ${total} photos`;
}
