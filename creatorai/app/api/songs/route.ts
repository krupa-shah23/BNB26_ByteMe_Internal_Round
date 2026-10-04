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

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ songs: [] as Song[] });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`${UPSTREAM}?query=${encodeURIComponent(q)}`, { signal: ctrl.signal, next: { revalidate: 300 } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const raw = await r.json();
    const list: Record<string, unknown>[] = Array.isArray(raw) ? raw : [];
    const songs: Song[] = list.slice(0, 12).map((s) => ({
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
    return NextResponse.json({ songs });
  } catch {
    // the UI shows a friendly "couldn't reach the song service" message
    return NextResponse.json({ songs: [] as Song[], error: "unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
