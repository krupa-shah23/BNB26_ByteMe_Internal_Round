import { describe, expect, it } from "vitest";
import { groups, matchFiles } from "@/lib/match";
import { ANYWAY_MIN, GENERATE_MIN, matchPhotoReel, normaliseName, recognisedLabel } from "@/lib/photoReel";
import type { FileFingerprint } from "@/lib/types";

const reel = groups.find((g) => g.kind === "photo-reel")!;
const photo = (name: string, sha = "", size = 1000): FileFingerprint => ({ name, size, sha, durationSec: 0, kind: "image" });
const set = (ns: number[], ext = "jpg") => ns.map((n) => photo(`p${n}.${ext}`, "", 1000 + n));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const shuffled = <T,>(a: T[]) => [...a].sort((x, y) => ((String(x).length * 7919) % 13) - ((String(y).length * 104729) % 13) || String(y).localeCompare(String(x)));

describe("normaliseName", () => {
  it.each([
    ["p1.jpg", "p1"], ["P1.JPG", "p1"], ["p01.jpeg", "p1"], ["p018.png", "p18"], ["p18", "p18"],
    ["p 3 (1).jpg", "p3"], ["p_4_copy.jpg", "p4"], ["Copy of p5.jpg", "p5"], ["p6 - copy.jpg", "p6"], ["p-7.heic", "p7"],
  ])("%s → %s", (input, out) => expect(normaliseName(input)).toBe(out));

  it.each(["p0.jpg", "p19.jpg", "p100.jpg", "photo1.jpg", "IMG_0001.jpg", "reel.mp4", "", "p.jpg"])("%s is not a photo of the set", (n) => expect(normaliseName(n)).toBeNull());
});

describe("matchPhotoReel", () => {
  it("has a photo-reel group with p1…p18", () => {
    expect(reel).toBeTruthy();
    expect(reel.inputs.map((r) => r.role)).toEqual(range(1, 18).map((n) => `p${n}`));
    expect(reel.output?.video).toMatch(/reel\.mp4$/);
  });

  it("recognises all 18 in any order", () => {
    for (const order of [set(range(1, 18)), set(range(1, 18)).reverse(), shuffled(set(range(1, 18)))]) {
      const m = matchPhotoReel(order, reel);
      expect(m.count).toBe(18);
      expect(m.result.missingRoles).toEqual([]);
      expect(m.result.matched.map((x) => x.role)).toEqual(range(1, 18).map((n) => `p${n}`));
    }
  });

  it("p01 and p1 are the same photo", () => {
    const files = [photo("p01.jpg"), ...set(range(2, 18))];
    expect(matchPhotoReel(files, reel).count).toBe(18);
  });

  it("thresholds: 13 asks, 14 starts, 18 starts", () => {
    expect(matchPhotoReel(set(range(1, 13)), reel).count).toBe(13);
    expect(13).toBeLessThan(GENERATE_MIN);
    expect(matchPhotoReel(set(range(1, 14)), reel).count).toBe(GENERATE_MIN);
    expect(recognisedLabel(13)).toBe("Recognised 13 of 18 photos");
    expect(recognisedLabel(14)).toBe("Recognised 14 photos");
    expect(recognisedLabel(18)).toBe("Recognised 18 photos");
  });

  it("the same photo twice is counted once and not reported as unused", () => {
    const m = matchPhotoReel([photo("p1.jpg", "", 1001), photo("p1.jpg", "", 1001), photo("P1 (1).JPG", "", 1001)], reel);
    expect(m.count).toBe(1);
    expect(m.result.unused).toEqual([]);
    expect(m.result.duplicates).toEqual(["p1.jpg", "P1 (1).JPG"]);
  });

  it("duplicate content under another name (same hash) is deduped", () => {
    const m = matchPhotoReel([photo("p2.jpg", "abc"), photo("holiday.jpg", "abc")], reel);
    expect(m.count).toBe(1);
    expect(m.result.duplicates).toEqual(["holiday.jpg"]);
  });

  it("unknown files are ignored and listed as not used", () => {
    const m = matchPhotoReel([...set(range(1, 18)), photo("extra.jpg"), photo("IMG_9.jpg", "zzz")], reel);
    expect(m.count).toBe(18);
    expect(m.result.unused).toEqual(["extra.jpg", "IMG_9.jpg"]);
  });

  it("a renamed photo still counts when its hash matches", () => {
    const known = reel.inputs[6].sha256_first_1mb; // p7
    expect(known).toBeTruthy();
    const m = matchPhotoReel([photo("my holiday.jpg", known), ...set(range(1, 6))], reel);
    expect(m.count).toBe(7);
    expect(m.result.matched.find((x) => x.role === "p7")?.fileName).toBe("my holiday.jpg");
  });

  it("a hash match beats a misleading name", () => {
    const known = reel.inputs[0].sha256_first_1mb; // p1's content named p2
    const m = matchPhotoReel([photo("p2.jpg", known)], reel);
    expect(m.result.matched.map((x) => x.role)).toEqual(["p1"]);
  });
});

describe("matchFiles with the photo reel", () => {
  it("14 to 18 photos pick the photo-reel group, 8 to 13 too (generate anyway)", () => {
    for (const n of [18, 16, 14, 13, ANYWAY_MIN]) {
      const m = matchFiles(shuffled(set(range(1, n))));
      expect(m.groupId).toBe("photo-reel");
      expect(m.isDefault).toBe(false);
      expect(m.matched).toHaveLength(n);
    }
  });

  it("fewer than 8 photos or unrelated files fall back to the default scenario", () => {
    expect(matchFiles(set(range(1, ANYWAY_MIN - 1))).isDefault).toBe(true);
    expect(matchFiles([photo("holiday.jpg"), photo("selfie.jpg")]).isDefault).toBe(true);
    expect(matchFiles([]).isDefault).toBe(true);
  });
});

describe("lecture merge (part1 + part2 + part3 → full video)", () => {
  const f = (name: string): FileFingerprint => ({ name, size: 10, sha: "", durationSec: 0, kind: "video" });
  it("matches by file name only, in any order and case", () => {
    for (const names of [["part1.mp4", "part2.mp4", "part3.mp4"], ["Part3.MP4", "part1 (1).mp4", "PART2.mp4"]]) {
      const m = matchFiles(names.map(f));
      expect(m.groupId).toBe("lecture-merge");
      expect(m.missingRoles).toEqual([]);
    }
  });
  it("is not triggered by unrelated names", () => expect(matchFiles([f("a.mp4"), f("b.mp4"), f("c.mp4")]).groupId).not.toBe("lecture-merge"));
});

describe("vlog merge (video1 + video2 + video3 ? full)", () => {
  const f = (name: string): FileFingerprint => ({ name, size: 10, sha: "", durationSec: 0, kind: "video" });
  it("matches by file name only, in any order and case", () => {
    for (const names of [["video1.mp4", "video2.mp4", "video3.mp4"], ["Video3.MP4", "video1 (1).mp4", "VIDEO2.mp4"]]) {
      const m = matchFiles(names.map(f));
      expect(m.groupId).toBe("vlog-merge");
      expect(m.missingRoles).toEqual([]);
    }
  });
});

describe("legal check videos", () => {
  const f = (name: string): FileFingerprint => ({ name, size: 10, sha: "", durationSec: 0, kind: "video" });
  it.each([["legal1.mp4", "legal1"], ["Legal2.MP4", "legal2"]])("%s ? %s", (name, id) => expect(matchFiles([f(name)]).groupId).toBe(id));
});
