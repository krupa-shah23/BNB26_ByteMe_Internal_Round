"use client";
import { Music2, Pause, Play, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchSongs, songToTrack, type Song } from "@/lib/songs";
import type { Track } from "@/lib/precheck";
import { useStore } from "@/lib/store";

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
    a.onerror = () => setPlaying(null);
    a.play().then(() => { audio.current = a; setPlaying(s.id); }).catch(() => setPlaying(null));
  };

  return (
    <div className="min-w-0">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !py-2.5 pl-10" placeholder="Search songs, e.g. Kesariya" aria-label="Search songs" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div aria-live="polite" className="mt-3">
        {state === "loading" && <p className="text-sm text-muted">Searching…</p>}
        {state === "error" && <p role="alert" className="text-sm text-bad">Couldn’t reach the song service. Try again in a moment.</p>}
        {state === "idle" && songs && songs.length === 0 && <p className="text-sm text-muted">No songs found for “{q.trim()}”.</p>}
        {songs && songs.length > 0 && (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {songs.map((s) => (
              <li key={s.id} className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-line p-2">
                {s.image ? <img src={s.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sunken"><Music2 size={18} /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={s.title}>{s.title}</p>
                  <p className="truncate text-xs text-muted">{s.artists}{s.durationSec ? ` · ${mmss(s.durationSec)}` : ""}</p>
                </div>
                <button type="button" onClick={() => toggle(s)} disabled={!s.previewUrl} aria-label={`${playing === s.id ? "Pause" : "Play preview of"} ${s.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line hover:bg-sunken disabled:opacity-40">{playing === s.id ? <Pause size={15} /> : <Play size={15} />}</button>
                {onPick && <button type="button" className="btn-brand shrink-0 px-3 py-1.5" onClick={() => { stop(); onPick(songToTrack(s)); }}>{pickLabel}</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
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

/** Play/pause any song by name (looks it up, then plays the first match). One song at a time across the page. */
let current: HTMLAudioElement | null = null;
export function SongPlayButton({ title, artist, className }: { title: string; artist?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const a = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { if (a.current && current === a.current) current = null; a.current?.pause(); }, []);
  const toggle = async () => {
    if (state === "playing") { a.current?.pause(); setState("idle"); return; }
    setState("loading");
    try {
      if (!a.current) {
        const r = (await searchSongs(`${title} ${artist ?? ""}`.trim())).find((s) => s.previewUrl) ?? (await searchSongs(title)).find((s) => s.previewUrl);
        if (!r) throw new Error("none");
        a.current = new Audio(r.previewUrl);
        a.current.onended = () => setState("idle");
        a.current.onerror = () => setState("error");
      }
      if (current && current !== a.current) current.pause();
      current = a.current;
      await a.current.play();
      setState("playing");
    } catch { setState("error"); }
  };
  return <button type="button" onClick={toggle} aria-label={`${state === "playing" ? "Pause" : "Play"} ${title}`} title={state === "error" ? "Couldn’t play this one" : undefined} className={className ?? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line hover:bg-sunken"}>{state === "playing" ? <Pause size={15} /> : state === "loading" ? <span className="h-3 w-3 animate-pulse rounded-full bg-muted" /> : <Play size={15} className={state === "error" ? "text-bad" : undefined} />}</button>;
}

/** Optional song for the next short: chosen before uploading, applied to the generated project. */
export function SongPick() {
  const picked = useStore((s) => s.pickedTrack);
  const set = useStore((s) => s.set);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Music2 size={16} className="text-muted" />
        {picked ? <><span className="font-medium">{picked.title}</span><span className="text-muted">{picked.artist}</span><button type="button" className="ml-auto text-xs underline underline-offset-4" onClick={() => set({ pickedTrack: null })}>Remove</button></> : <span className="text-muted">No song selected</span>}
        <button type="button" className={picked ? "btn-ghost py-1.5" : "btn-ghost ml-auto py-1.5"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Close" : picked ? "Change song" : "Select a song"}</button>
      </div>
      {open && <div className="mt-3"><SongSearch pickLabel="Select" onPick={(t) => { set({ pickedTrack: t }); setOpen(false); }} /></div>}
    </div>
  );
}
