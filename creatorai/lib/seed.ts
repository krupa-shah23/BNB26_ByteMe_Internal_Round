import { groupById } from "./match";
import { makeProject } from "./projects";
import type { Project } from "./types";

const day = 86_400_000;

/** Seed projects. Pure (no browser APIs) so the server repository and the Zustand store share one source. */
export function seedProjects(): Project[] {
  const now = Date.now();
  const mk = (gid: string, ago: number, extra: Partial<Project>) => {
    const p = makeProject(groupById(gid), { status: "Published", ...extra });
    p.createdAt = new Date(now - ago * day).toISOString();
    p.updatedAt = p.createdAt;
    p.caption = { id: "seed", caption: "Published earlier", cta: "", tone: "witty", hashtags: [] };
    p.thumb = { id: "seed", frame: 1, text: "TERM SHEET, 3 DAYS", template: "brand", score: 82 };
    return p;
  };
  return [
    mk("g5", 25, { id: "p_seed_g5", title: "Hostel memes: exam week" }),
    mk("g3", 19, { id: "p_seed_g3" }),
    mk("g1", 5, { id: "p_seed_g1" }),
  ];
}
