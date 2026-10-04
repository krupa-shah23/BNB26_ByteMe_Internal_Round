import { describe, expect, it } from "vitest";
import { approvalGaps, precheck, trackById, tracks, DISCLAIMER, CLEARED_TRACKS } from "@/lib/precheck";
import { defaultGroup, groups } from "@/lib/match";
import { makeProject } from "@/lib/projects";
import { legacyPrecheck } from "./legacyPrecheck";
import type { PlatformId, Project } from "@/lib/types";

const PLATFORM_SETS: PlatformId[][] = [["ig_reel"], ["yt_short"], ["yt_video"], ["yt_short", "ig_reel"], ["yt_video", "linkedin"], ["x"], ["facebook"]];
const caption = { id: "c", caption: "hi", cta: "", tone: "witty", hashtags: ["#a", "#followforfollow"] };
const thumb = { id: "t", frame: 1, text: "ONE TWO THREE FOUR FIVE", template: "brand" as const, score: 70 };

function matrix(): Project[] {
  const out: Project[] = [];
  for (const g of [...groups.filter((x) => !x.kind), defaultGroup]) { // the photo reel has its own rows (no audio layer, real resolution)
    for (const platforms of PLATFORM_SETS) {
      for (const audioId of tracks.map((t) => t.id)) {
        for (const [withCaption, withThumb] of [[false, false], [true, false], [false, true], [true, true]]) {
          out.push(makeProject(g, { platforms, audioId, ...(withCaption ? { caption } : {}), ...(withThumb ? { thumb } : {}) }));
        }
      }
    }
  }
  // timeline variants: no CTA, very long
  const g = groups[0];
  const base = makeProject(g, { platforms: ["x", "yt_short"] });
  out.push({ ...base, timeline: base.timeline.filter((s) => s.kind !== "cta") });
  out.push({ ...base, timeline: base.timeline.map((s) => ({ ...s, dur: s.dur * 40 })) });
  return out;
}

// The data-driven engine must keep producing what the original hard-coded one did.
// Deliberate difference: LinkedIn and X no longer claim "Meta Rights Manager" (it is not their system), so only wording and policy URL of the audio item may differ there.
describe("data-driven precheck equals the original engine", () => {
  const projects = matrix();
  it(`matches on ${projects.length} project/platform/audio combinations`, () => {
    for (const p of projects) {
      const a = precheck(p);
      const b = legacyPrecheck(p);
      expect(a.summary).toEqual(b.summary);
      expect(a.score).toBe(b.score);
      expect(a.items.length).toBe(b.items.length);
      a.items.forEach((item, i) => {
        const old = b.items[i];
        if (/^aud-(linkedin|x)$/.test(item.id)) {
          // wording and policy link are LinkedIn's / X's own now; id, severity and fix must not change
          expect({ id: item.id, severity: item.severity, fix: item.fix }).toEqual({ id: old.id, severity: old.severity, fix: old.fix });
        } else {
          expect(item).toEqual(old);
        }
      });
    }
  });
});

describe("precheck rules", () => {
  const g1 = groups[0]; // bgm3: commercial, high risk
  it("high-risk audio is a blocker on YouTube but only a warning on Meta, with the honest wording", () => {
    const yt = precheck(makeProject(g1, { platforms: ["yt_short"], caption, thumb: { ...thumb, text: "SHORT" } }));
    const aud = yt.items.find((i) => i.id === "aud-yt_short")!;
    expect(aud.severity).toBe("fail");
    expect(aud.detail).toContain("not a strike");
    expect(aud.fix?.action).toBe("swap-audio");
    const ig = precheck(makeProject(g1, { platforms: ["ig_reel"], caption, thumb }));
    expect(ig.items.find((i) => i.id === "aud-ig_reel")!.severity).toBe("warn");
  });

  it("LinkedIn names its own rights process, not Meta", () => {
    const r = precheck(makeProject(g1, { platforms: ["linkedin"] }));
    const aud = r.items.find((i) => i.id === "aud-linkedin")!;
    expect(aud.detail).not.toContain("Meta");
    expect(aud.title).toContain("LinkedIn");
  });

  it("never promises copyright safety in any output", () => {
    const text = projectsText();
    expect(text).not.toMatch(/copyright[- ]safe|safe to use|guaranteed safe/i);
    expect(DISCLAIMER).toContain("not legal advice");
  });

  it("swapping to every cleared track clears the audio item", () => {
    expect(CLEARED_TRACKS.length).toBe(3);
    for (const id of CLEARED_TRACKS) {
      expect(trackById(id)?.risk).toBe("low");
      const r = precheck(makeProject(g1, { platforms: ["yt_short", "ig_reel"], audioId: id, caption, thumb: { ...thumb, text: "SHORT" } }));
      expect(r.items.filter((i) => i.id.startsWith("aud-")).every((i) => i.severity === "pass")).toBe(true);
    }
  });

  it("AI disclosure: asks for the label when the creator marks AI content, passes once disclosed", () => {
    const p = makeProject(g1, { platforms: ["ig_reel"], caption, thumb });
    expect(precheck(p).items.find((i) => i.id === "ai")!.severity).toBe("pass");
    expect(precheck(p, { containsAi: true }).items.find((i) => i.id === "ai")!.severity).toBe("warn");
    expect(precheck(p, { containsAi: true, aiDisclosed: true }).items.find((i) => i.id === "ai")!.severity).toBe("pass");
  });
});

describe("approvalGaps (Perfect ✓)", () => {
  it("lists what is missing, and clears when caption + thumbnail exist and duration fits", () => {
    const p = makeProject(groups[0], { platforms: ["yt_short"] });
    expect(approvalGaps(p)).toEqual(["caption", "thumbnail"]);
    expect(approvalGaps({ ...p, caption, thumb })).toEqual([]);
    const long = { ...p, caption, thumb, timeline: p.timeline.map((s) => ({ ...s, dur: s.dur * 40 })) };
    expect(approvalGaps(long)[0]).toContain("duration within the limit");
  });
});

function projectsText() {
  return matrix().slice(0, 400).flatMap((p) => precheck(p).items.map((i) => `${i.title} ${i.detail}`)).join("\n");
}
