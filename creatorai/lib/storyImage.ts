import { uid } from "./projects";
import type { Project } from "./types";

/**
 * "Clean Story" demo: a single image dropped on Short Videos → Stories is analysed (profane overlay text + an institution
 * name), and Studio opens on the cleaned version. The two files are the original and the pre-cleaned image.
 */
export const STORY_GROUP = "story-college";
export const STORY_ORIGINAL = "/demo/story-college/original.webp";
export const STORY_CLEANED = "/demo/story-college/cleaned.webp";

export const STORY_CONTENT = {
  profanity: { found: "WHAT A SHIT DAY", options: ["WHAT A DAY", "WHAT A DAY!", "WHAT A DAY WITH THE GANG", "JUST ANOTHER DAY"] },
  institution: { found: "RAHUL BAJAJ TECHNOLOGY INNOVATION CENTRE" },
  titles: ["A Day With The Gang", "College Days Hit Different", "Just Another Day With The Gang", "One Day, A Lot of Memories", "Core Memories, One Frame at a Time"],
};

export function makeStoryProject(fileName: string): Project {
  const now = new Date().toISOString();
  return {
    id: uid("p"), title: "Story: College Day", type: "Short", groupId: STORY_GROUP, hue: 6,
    createdAt: now, updatedAt: now, status: "Generated",
    platforms: ["ig_reel"], aspect: "9:16",
    timeline: [{ id: `${STORY_GROUP}_s0`, at: 0, dur: 6, kind: "photo", url: STORY_CLEANED }],
    audioId: "none", files: [fileName], photos: 1, hashtags: ["#story", "#collegelife"],
    version: 1, media: true, cover: STORY_CLEANED, noAudio: true, overlays: [],
  };
}
