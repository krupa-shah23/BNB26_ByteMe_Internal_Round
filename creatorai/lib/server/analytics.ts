import analytics from "@/fixtures/analytics.json";
import { ApiError } from "./http";
import { permissions, type Permissions } from "./b7Repo";
import { jobStore } from "./jobStore";

/** 403 PERMISSION_REQUIRED with no data: matches "no network calls to those fixtures" when access is revoked. */
export function requirePermission(k: keyof Omit<Permissions, "decided">) {
  if (!permissions.get()[k]) throw new ApiError("PERMISSION_REQUIRED", 403, `${k} access has not been granted`, [], { permission: k });
}

type Row = (typeof analytics.content)[number];
const PLATFORM_LABEL: Record<string, string> = { ig_reel: "Instagram", yt_short: "YouTube", yt_video: "YouTube", linkedin: "LinkedIn", x: "X", facebook: "Facebook" };

/** Fixture rows plus real published posts. Metrics we do not have are null with available:false, never 0. */
export function contentRows() {
  const fixture = analytics.content.map((r: Row) => ({ ...r, available: true, followersGained: r.gained, followersGainedEstimated: r.platform === "Instagram" }));
  const real = jobStore.posts().map((p) => ({
    id: p.id, projectId: p.projectId, title: p.title, platform: PLATFORM_LABEL[p.platform] ?? p.platform, kind: p.platform.includes("short") || p.platform === "ig_reel" ? "Reel" : "Video",
    postedAt: p.publishedAt.slice(0, 10), thumbUrl: p.thumbUrl,
    views: null, reach: null, likes: null, comments: null, shares: null, gained: null, followersGained: null, followersGainedEstimated: true, earnings: null,
    available: false, link: "#",
  }));
  return [...real, ...fixture].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}
