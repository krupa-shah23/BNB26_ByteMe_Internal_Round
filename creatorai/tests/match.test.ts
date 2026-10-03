import { describe, expect, it } from "vitest";
import { defaultGroup, groups, matchFiles, sampleFingerprints } from "@/lib/match";
import type { FileFingerprint, Group } from "@/lib/types";

const rotate = <T>(a: T[], n: number) => [...a.slice(n), ...a.slice(0, n)];

describe("matchFiles", () => {
  it.each(groups.map((g) => g.id))("%s: full match in any drop order", (id) => {
    const g = groups.find((x) => x.id === id)!;
    const base = sampleFingerprints(g, false);
    for (const order of [base, sampleFingerprints(g, true), rotate(base, 1), rotate(base, 2)]) {
      const m = matchFiles(order);
      expect(m.groupId).toBe(id);
      expect(m.missingRoles).toEqual([]);
      expect(m.confidence).toBe(1);
      expect(m.isDefault).toBe(false);
    }
  });

  it("2 of 3 files reports the missing role", () => {
    const g = groups[0];
    const m = matchFiles(sampleFingerprints(g, false).filter((f) => f.kind === "video").slice(0, 2));
    expect(m.groupId).toBe(g.id);
    expect(m.missingRoles).toHaveLength(1);
    expect(m.confidence).toBeCloseTo(2 / 3);
  });

  it("files from two groups tie and list both candidates", () => {
    const a = sampleFingerprints(groups[0], false).filter((f) => f.kind === "video")[0];
    const b = sampleFingerprints(groups[1], false).filter((f) => f.kind === "video")[0];
    const m = matchFiles([a, b]);
    expect(m.candidates.map((c) => c.groupId).sort()).toEqual([groups[0].id, groups[1].id].sort());
  });

  it("unknown file falls back to _default and is listed as unused", () => {
    const m = matchFiles([{ name: "holiday.mp4", size: 10, sha: "", durationSec: 5.5, kind: "video" }]);
    expect(m.isDefault).toBe(true);
    expect(m.unused).toEqual(["holiday.mp4"]);
    expect(defaultGroup.id).toBe("_default");
  });

  it("dedupes the same file dropped twice", () => {
    const [f] = sampleFingerprints(groups[0], false);
    const m = matchFiles([f, { ...f }]);
    expect(m.duplicates).toEqual([f.name]);
  });

  it("a renamed file still matches by hash", () => {
    const custom: Group = { ...groups[0], id: "gh", inputs: groups[0].inputs.map((r, i) => ({ ...r, sha256_first_1mb: `hash${i}` })) };
    const renamed: FileFingerprint = { name: "IMG_0001.mp4", size: 1, sha: "hash1", durationSec: 0, kind: "video" };
    const m = matchFiles([renamed], { groups: [custom] });
    expect(m.groupId).toBe("gh");
    expect(m.matched).toEqual([{ role: custom.inputs[1].role, fileName: "IMG_0001.mp4" }]);
  });

  it("`only` restricts matching to one group and still reports it when nothing is recognised", () => {
    const m = matchFiles([{ name: "x.mp4", size: 1, sha: "", durationSec: 1, kind: "video" }], { only: "g3" });
    expect(m.groupId).toBe("g3");
    expect(m.isDefault).toBe(false);
    expect(m.missingRoles).toHaveLength(groups.find((g) => g.id === "g3")!.inputs.length);
  });
});
