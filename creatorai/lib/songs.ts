import type { Song } from "@/app/api/songs/route";
import { registerTrack, type Track } from "@/lib/precheck";

export type { Song };

/** Searches the /api/songs proxy. Throws on network/upstream failure so the caller can show an error state. */
export async function searchSongs(q: string, signal?: AbortSignal): Promise<Song[]> {
  const r = await fetch(`/api/songs?q=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error("songs unavailable");
  const j = (await r.json()) as { songs: Song[] };
  return j.songs;
}

/**
 * Turns a search result into a project track. These are commercial releases, so they enter the catalogue as
 * high claim risk and the pre-publish check explains the Content ID / Rights Manager consequences.
 */
export function songToTrack(s: Song): Track {
  return registerTrack({
    id: `saavn_${s.id}`,
    title: s.title,
    artist: s.artists,
    source: "commercial",
    risk: "high",
    notes: s.copyright || s.label || "Commercial release, likely fingerprinted by Content ID / Rights Manager",
    image: s.image,
    previewUrl: s.previewUrl,
  });
}
