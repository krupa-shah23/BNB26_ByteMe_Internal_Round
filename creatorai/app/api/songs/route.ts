import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Normalised song, the only shape the UI sees (so the upstream can change without touching components). */
export interface Song {
  id: string; title: string; artists: string; album: string; image: string; year: string;
  language: string; durationSec: number; previewUrl: string; label: string; copyright: string;
}

const UPSTREAM = process.env.SONGS_API_URL || "https://saavnapi-nine.vercel.app/result/";
const decode = (s: unknown) =>
  String(s ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const https = (u: unknown) => String(u ?? "").replace(/^http:\/\//, "https://");

async function fromSaavn(q: string, signal: AbortSignal): Promise<Song[]> {
  const r = await fetch(`${UPSTREAM}?query=${encodeURIComponent(q)}`, { signal, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const raw = await r.json();
  const list: Record<string, unknown>[] = Array.isArray(raw) ? raw : [];
  return list.slice(0, 12).map((s) => ({
    id: String(s.id),
    title: decode(s.song ?? s.title),
    artists: decode(s.singers || s.primary_artists || Object.keys((s.artistMap as Record<string, string>) ?? {}).slice(0, 3).join(", ")),
    album: decode(s.album),
    image: https(s.image),
    year: String(s.year ?? ""),
    language: String(s.language ?? ""),
    durationSec: Number(s.duration) || 0,
    previewUrl: https(s.media_url).replace("_320.mp4", "_96.mp4") || https(s.media_preview_url),
    label: decode(s.label),
    copyright: decode(s.copyright_text),
  })).filter((s) => s.id && s.title);
}

/** Fallback when the JioSaavn proxy is down or doesn't know a partial word: Apple's public iTunes search (30 s previews). */
async function fromItunes(q: string, signal: AbortSignal): Promise<Song[]> {
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&country=IN&limit=12`, { signal, next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`itunes ${r.status}`);
  const j = (await r.json()) as { results?: Record<string, unknown>[] };
  return (j.results ?? []).filter((s) => s.previewUrl).map((s) => ({
    id: `it${s.trackId}`,
    title: decode(s.trackName),
    artists: decode(s.artistName),
    album: decode(s.collectionName),
    image: https(String(s.artworkUrl100 ?? "").replace("100x100", "300x300")),
    year: String(s.releaseDate ?? "").slice(0, 4),
    language: "",
    durationSec: Math.round(Number(s.trackTimeMillis) / 1000) || 0,
    previewUrl: https(s.previewUrl),
    label: "",
    copyright: "Commercial release (Apple Music preview)",
  })).filter((s) => s.title);
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ songs: [] as Song[] });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    let songs: Song[] = [];
    try { songs = await fromSaavn(q, ctrl.signal); } catch { /* fall through to the fallback */ }
    if (!songs.length) { try { songs = await fromItunes(q, ctrl.signal); } catch { /* both down */ } }
    return NextResponse.json({ songs });
  } finally {
    clearTimeout(timer);
  }
}
