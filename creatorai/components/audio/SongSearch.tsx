"use client";
import { Music2, Pause, Play, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchSongs, songToTrack, type Song } from "@/lib/songs";
import type { Track } from "@/lib/precheck";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Search Bollywood / Hindi songs, preview a clip, optionally pick one (onPick). */
export function SongSearch({ onPick, pickLabel = "Use" }: { onPick?: (t: Track) => void; pickLabel?: string }) {
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stop = () => { audio.current?.pause(); audio.current = null; setPlaying(null); };
  useEffect(() => stop, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setSongs(null); setState("idle"); return; }
    const ctrl = new AbortController();
    setState("loading");
    const t = setTimeout(() => {
      searchSongs(term, ctrl.signal).then((r) => { setSongs(r); setState("idle"); }).catch((e) => { if (e.name !== "AbortError") { setSongs([]); setState("error"); } });
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const toggle = (s: Song) => {
    if (playing === s.id) return stop();
    stop();
    if (!s.previewUrl) return;
    const a = new Audio(s.previewUrl);
    a.onended = () => setPlaying(null);
    a.play().then(() => { audio.current = a; setPlaying(s.id); }).catch(() => setPlaying(null));
  };

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !py-2.5 pl-10" placeholder="Search songs, e.g. Kesariya" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div aria-live="polite" className="mt-3">
        {state === "loading" && <p className="text-sm text-muted">Searching…</p>}
        {state === "error" && <p role="alert" className="text-sm text-bad">Couldn’t reach the song service. Try again in a moment.</p>}
        {state === "idle" && songs && songs.length === 0 && <p className="text-sm text-muted">No songs found for “{q.trim()}”.</p>}
        {songs && songs.length > 0 && (
          <ul className="grid gap-2">
            {songs.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
                {s.image ? <img src={s.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sunken"><Music2 size={18} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted">{s.artists} · {s.album}{s.year ? ` · ${s.year}` : ""}{s.durationSec ? ` · ${mmss(s.durationSec)}` : ""}</p>
                </div>
                <button type="button" onClick={() => toggle(s)} disabled={!s.previewUrl} aria-label={`${playing === s.id ? "Pause" : "Play preview of"} ${s.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line hover:bg-sunken disabled:opacity-40">{playing === s.id ? <Pause size={15} /> : <Play size={15} />}</button>
                {onPick && <button type="button" className="btn-brand shrink-0 px-3 py-1.5" onClick={() => { stop(); onPick(songToTrack(s)); }}>{pickLabel}</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-muted">Songs come from JioSaavn through an unofficial API. They are commercial releases: previews are for browsing only, and the pre-publish check treats them as high Content ID / Rights Manager risk.</p>
    </div>
  );
}

/** Collapsible version for the Studio music panel. */
export function MusicSearch({ onPick }: { onPick: (t: Track) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" className="btn-ghost w-full py-2" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Search size={14} />{open ? "Hide song search" : "Search songs"}</button>
      {open && <div className="mt-3"><SongSearch onPick={(t) => { onPick(t); setOpen(false); }} /></div>}
    </div>
  );
}
