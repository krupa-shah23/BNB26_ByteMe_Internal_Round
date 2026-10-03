import { describe, expect, it } from "vitest";
import groups from "@/fixtures/groups.json";
import captions from "@/fixtures/captions.json";
import scripts from "@/fixtures/scripts.json";
import creators from "@/fixtures/creators.json";
import analytics from "@/fixtures/analytics.json";
import home from "@/fixtures/home.json";
import profiles from "@/fixtures/platformProfiles.json";
import { analyticsFile, captionsFile, creatorsFile, groupsFile, homeFile, profilesFile, scriptsFile } from "@/lib/schemas/fixtures";
import { captionOut } from "@/lib/schemas/ai";

const check = (name: string, schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: unknown[] } } }, data: unknown) =>
  it(`${name} matches its schema`, () => { const r = schema.safeParse(data); expect(r.error?.issues ?? []).toEqual([]); });

describe("fixture contracts", () => {
  check("groups.json", groupsFile, groups);
  check("captions.json", captionsFile, captions);
  check("scripts.json", scriptsFile, scripts);
  check("creators.json", creatorsFile, creators);
  check("analytics.json", analyticsFile, analytics);
  check("home.json", homeFile, home);
  check("platformProfiles.json", profilesFile, profiles);

  it("every group has a script and every caption tone has fixtures", () => {
    for (const g of groups.groups) expect(Object.keys(scripts), g.id).toContain(g.id);
    for (const tone of captions.tones) expect(captions.options, tone).toHaveProperty(tone);
  });
  it("caption fixtures satisfy the LLM output schema, so the fallback is interchangeable", () => {
    for (const opts of Object.values(captions.options)) expect(captionOut.safeParse({ options: opts }).success).toBe(true);
  });
});
