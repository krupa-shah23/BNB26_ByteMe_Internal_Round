import { uid } from "../projects";
import type { PublishedPost } from "../schemas/publish";
import { jobStore } from "./jobStore";
import { projects } from "./projectRepo";

export interface PublishPayload { projectId: string; at: string; key: string; platforms: string[] }

/** Runs once when a publish job finishes: the project becomes Published and one PublishedPost per platform is recorded. */
export function finalizePublish(p: PublishPayload) {
  const project = projects.get(p.projectId);
  if (!project) return;
  if (project.status !== "Published") projects.save({ ...project, status: "Published" }, new Date(p.at));
  const existing = new Set(jobStore.posts().filter((x) => x.projectId === p.projectId).map((x) => x.platform));
  for (const platform of p.platforms) {
    if (existing.has(platform)) continue;
    const post: PublishedPost = {
      id: uid("post"), projectId: p.projectId, platform, title: project.title, publishedAt: p.at,
      thumbUrl: null, // BACKEND-SLOT(publish): a real platform call returns the post URL and later metrics
      metrics: null, metricsAvailable: false,
    };
    jobStore.addPost(post);
  }
}
