"use client";
import { useState } from "react";
import { AbsoluteFill, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Bookmark, Heart, MessageCircle, Music2, MoreHorizontal, Repeat2, Send, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Aspect, Segment, TextOverlay } from "@/lib/types";
import { gradientFor } from "@/components/ui/bits";
import { PROFILES } from "@/lib/projects";
import type { PlatformId } from "@/lib/types";

export interface EdlProps {
  timeline: Segment[]; aspect: Aspect; hue: number; groupId: string; media: boolean;
  showSafe: boolean; platform: PlatformId; selectedId?: string; title: string;
  /** free text the creator adds on top (never part of the file) */
  overlays?: TextOverlay[];
  /** shown instead of the video if the file can't be loaded */
  poster?: string;
  capStyle?: "clean" | "bold" | "minimal";
  [key: string]: unknown;
}

/** Long-video previews: the player / post furniture that sits on or around the video. */
function LongChrome({ platform, unit }: { platform: PlatformId; unit: number }) {
  const txt = unit * 0.034;
  const ic = unit * 0.05;
  const shadow = "0 1px 6px rgba(0,0,0,0.6)";
  const icon = { size: ic, strokeWidth: 2, style: { filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))" } };
  const Item = ({ i, label }: { i: React.ReactNode; label: string }) => <div style={{ display: "flex", alignItems: "center", gap: unit * 0.012, fontSize: txt, fontWeight: 600 }}>{i}<span>{label}</span></div>;
  const bar = { position: "absolute" as const, left: unit * 0.04, right: unit * 0.04, bottom: unit * 0.035, display: "flex", alignItems: "center", justifyContent: "space-between", gap: unit * 0.03 };
  return (
    <AbsoluteFill style={{ pointerEvents: "none", color: "#fff", fontFamily: "var(--font-text)", textShadow: shadow }}>
      {platform === "yt_video" && (<>
        <div style={{ position: "absolute", left: unit * 0.04, bottom: unit * 0.09, fontSize: txt * 1.1, fontWeight: 700 }}>Your video title goes here</div>
        <div style={{ ...bar, bottom: unit * 0.03 }}>
          <div style={{ flex: 1, height: unit * 0.008, background: "rgba(255,255,255,0.35)", borderRadius: 99 }}><div style={{ width: "32%", height: "100%", background: "#f00", borderRadius: 99 }} /></div>
          <span style={{ fontSize: txt }}>0:00 / 10:23</span>
        </div>
        <div style={{ position: "absolute", right: unit * 0.04, top: unit * 0.04, display: "flex", gap: unit * 0.02, fontSize: txt, fontWeight: 600 }}>
          <span style={{ background: "rgba(0,0,0,0.55)", borderRadius: 99, padding: `${unit * 0.008}px ${unit * 0.02}px`, textShadow: "none" }}>Subscribe</span>
          <span style={{ background: "rgba(0,0,0,0.55)", borderRadius: 99, padding: `${unit * 0.008}px ${unit * 0.02}px`, textShadow: "none" }}>Like 24K</span>
        </div>
      </>)}
      {platform === "linkedin" && (<>
        <div style={{ position: "absolute", left: unit * 0.04, top: unit * 0.04, display: "flex", alignItems: "center", gap: unit * 0.015, fontSize: txt, fontWeight: 700 }}>
          <span style={{ width: unit * 0.06, height: unit * 0.06, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "inline-block" }} />Your Name · Creator
        </div>
        <div style={bar}>
          <Item i={<ThumbsUp {...icon} />} label="Like" />
          <Item i={<MessageCircle {...icon} />} label="Comment" />
          <Item i={<Repeat2 {...icon} />} label="Repost" />
          <Item i={<Send {...icon} />} label="Send" />
        </div>
      </>)}
      {platform === "x" && (<>
        <div style={{ position: "absolute", left: unit * 0.04, top: unit * 0.04, display: "flex", alignItems: "center", gap: unit * 0.015, fontSize: txt, fontWeight: 700 }}>
          <span style={{ width: unit * 0.06, height: unit * 0.06, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "inline-block" }} />@yourhandle
        </div>
        <div style={bar}>
          <Item i={<MessageCircle {...icon} />} label="Reply" />
          <Item i={<Repeat2 {...icon} />} label="Repost" />
          <Item i={<Heart {...icon} />} label="Like" />
          <Item i={<Share2 {...icon} />} label="Share" />
        </div>
      </>)}
    </AbsoluteFill>
  );
}

/** "View as" mock of the app's own buttons and text, so you can see what would sit on top of the video. */
function PlatformChrome({ platform, unit }: { platform: PlatformId; unit: number }) {
  const ig = platform === "ig_reel";
  const fb = platform === "facebook";
  if (platform === "yt_video" || platform === "linkedin" || platform === "x") return <LongChrome platform={platform} unit={unit} />;
  if (!ig && !fb && platform !== "yt_short") return null;
  const ic = unit * 0.07;
  const txt = unit * 0.028;
  const shadow = "0 1px 6px rgba(0,0,0,0.6)";
  const Btn = ({ icon, label }: { icon: React.ReactNode; label?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: unit * 0.006, fontSize: txt, fontWeight: 600 }}>{icon}{label && <span>{label}</span>}</div>
  );
  const props = { size: ic, strokeWidth: 2, style: { filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))" } };
  return (
    <AbsoluteFill style={{ pointerEvents: "none", color: "#fff", fontFamily: "var(--font-text)", textShadow: shadow }}>
      <div style={{ position: "absolute", right: unit * 0.03, bottom: unit * 0.1, display: "flex", flexDirection: "column", alignItems: "center", gap: unit * 0.035 }}>
        {fb ? (<>
          <Btn icon={<ThumbsUp {...props} />} label="Like" />
          <Btn icon={<MessageCircle {...props} />} label="Reply" />
          <Btn icon={<Share2 {...props} />} label="Share" />
          <Btn icon={<MoreHorizontal {...props} />} />
        </>) : ig ? (<>
          <Btn icon={<Heart {...props} />} label="24.1K" />
          <Btn icon={<MessageCircle {...props} />} label="312" />
          <Btn icon={<Send {...props} />} label="1.2K" />
          <Btn icon={<Bookmark {...props} />} />
          <Btn icon={<MoreHorizontal {...props} />} />
        </>) : (<>
          <Btn icon={<ThumbsUp {...props} />} label="24K" />
          <Btn icon={<ThumbsDown {...props} />} label="Dislike" />
          <Btn icon={<MessageCircle {...props} />} label="312" />
          <Btn icon={<Share2 {...props} />} label="Share" />
          <Btn icon={<Repeat2 {...props} />} label="Remix" />
        </>)}
      </div>
      <div style={{ position: "absolute", left: unit * 0.04, right: unit * 0.2, bottom: unit * 0.04, display: "flex", flexDirection: "column", gap: unit * 0.014, fontSize: txt * 1.1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: unit * 0.02, fontWeight: 700 }}>
          <span style={{ width: unit * 0.06, height: unit * 0.06, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "inline-block" }} />
          <span>{ig ? "yourname" : fb ? "Your Page" : "@yourchannel"}</span>
          <span style={{ border: "1px solid #fff", borderRadius: 999, padding: `${unit * 0.004}px ${unit * 0.018}px`, fontSize: txt, background: ig || fb ? "transparent" : "#fff", color: ig || fb ? "#fff" : "#000", textShadow: "none" }}>{ig ? "Follow" : fb ? "Follow" : "Subscribe"}</span>
        </div>
        <div style={{ opacity: 0.9 }}>Your caption goes here #reel</div>
        {ig && <div style={{ display: "flex", alignItems: "center", gap: unit * 0.01, fontSize: txt }}><Music2 size={txt} />Original audio</div>}
      </div>
    </AbsoluteFill>
  );
}

const label: Record<string, string> = { hook: "HOOK", demo: "DEMO", cta: "CTA", photo: "PHOTO", explain: "EXPLAIN", story: "STORY", quote: "QUOTE", punch: "PUNCHLINE" };

function Slate({ seg, idx, p }: { seg: Segment; idx: number; p: EdlProps }) {
  const f = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;
  const prof = PROFILES[p.platform];
  const total = seg.dur * fps;
  const fade = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(f, [0, 10], [24, 0], { extrapolateRight: "clamp" });
  const kb = seg.photo ? interpolate(f, [0, total], [1, 1.14]) : 1 + (seg.zoom ?? 0) / 100;
  const unit = Math.min(width, height);
  const url = seg.url ?? (p.media && seg.src ? `/demo/${p.groupId}/${seg.src}.mp4` : undefined);
  const fixed = !!seg.url;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const start = Math.round((seg.in ?? 0) * fps);
  return (
    <AbsoluteFill style={{ background: fixed && url && !failed ? "#000" : gradientFor(p.hue + idx), overflow: "hidden" }}>
      {url && !failed && (
        <AbsoluteFill style={{ transform: `scale(${kb})` }}>
                    <Video key={`fg${attempt}`} src={url} startFrom={start} playbackRate={seg.speed ?? 1} volume={(seg.vol ?? 80) / 100} muted={(seg.vol ?? 80) === 0} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: fixed ? "contain" : "cover" }} />
        </AbsoluteFill>
      )}
      {url && failed && (
        <AbsoluteFill style={{ background: "rgb(var(--sunken))" }}>
          {p.poster && <Img src={p.poster} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
          <AbsoluteFill style={{ display: "grid", placeItems: "center", background: "rgb(var(--bg) / 0.55)", pointerEvents: "auto" }}>
            <div style={{ textAlign: "center", color: "rgb(var(--text))", fontFamily: "var(--font-text)", fontSize: unit * 0.04 }}>
              <div>Couldn’t load the video.</div>
              <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} style={{ marginTop: unit * 0.02, padding: `${unit * 0.012}px ${unit * 0.03}px`, borderRadius: 999, border: "1px solid rgb(var(--line))", background: "rgb(var(--surface))", color: "rgb(var(--text))", fontSize: unit * 0.032, cursor: "pointer" }}>Retry</button>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {!url && !p.media && (
        <AbsoluteFill style={{ transform: `scale(${kb})`, display: "grid", placeItems: "center" }}>
          <div style={{ width: unit * 0.34, height: unit * 0.34, borderRadius: "50%", background: "rgb(var(--brand-ink) / 0.14)", border: `${unit * 0.004}px solid rgb(var(--brand-ink) / 0.4)`, display: "grid", placeItems: "center", color: "rgb(var(--brand-ink))", fontFamily: "var(--font-display)", fontSize: unit * 0.12 }}>
            {seg.photo ? "▣" : seg.src ?? "▶"}
          </div>
        </AbsoluteFill>
      )}
      {!fixed && <div style={{ position: "absolute", top: `${prof.safe.top + 1}%`, left: `${prof.safe.side}%`, display: "flex", gap: unit * 0.012, color: "rgb(var(--brand-ink))", fontFamily: "var(--font-text)", fontSize: unit * 0.026, fontWeight: 700, letterSpacing: "0.14em" }}>
        <span style={{ background: "rgb(var(--text) / 0.55)", color: "rgb(var(--bg))", padding: `${unit * 0.006}px ${unit * 0.014}px`, borderRadius: 999 }}>{label[seg.kind] ?? seg.kind.toUpperCase()}</span>
        {seg.src && <span style={{ background: "rgb(var(--text) / 0.55)", color: "rgb(var(--bg))", padding: `${unit * 0.006}px ${unit * 0.014}px`, borderRadius: 999 }}>{seg.src} {Math.floor(seg.in ?? 0)}–{Math.floor(seg.out ?? 0)}s</span>}
      </div>}
      {seg.caption && (
        <div style={{ position: "absolute", left: `${prof.safe.side}%`, right: `${prof.safe.side}%`, bottom: `${portrait ? prof.safe.bottom + 4 : prof.safe.bottom + 3}%`, opacity: fade, transform: `translateY(${rise}px)`, textAlign: "center" }}>
          <span style={{ display: "inline-block", ...(p.capStyle === "minimal" ? { background: "transparent", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" } : p.capStyle === "bold" ? { background: "#facc15", color: "#000", textTransform: "uppercase" as const } : { background: "rgb(var(--text) / 0.78)", color: "rgb(var(--bg))" }), padding: `${unit * 0.014}px ${unit * 0.028}px`, borderRadius: unit * 0.02, fontFamily: "var(--font-display)", fontWeight: p.capStyle === "bold" ? 800 : 600, fontSize: unit * (portrait ? 0.056 : 0.05), lineHeight: 1.15, letterSpacing: "-0.02em" }}>{seg.caption}</span>
        </div>
      )}
      {p.selectedId === seg.id && <AbsoluteFill style={{ boxShadow: `inset 0 0 0 ${unit * 0.008}px rgb(var(--accent))`, pointerEvents: "none" }} />}
      {p.showSafe && (
        <PlatformChrome platform={p.platform} unit={unit} />
      )}
    </AbsoluteFill>
  );
}

const OVERLAY_SIZE = { s: 0.04, m: 0.056, l: 0.078 } as const;

function OverlayText({ o, p }: { o: TextOverlay; p: EdlProps }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const prof = PROFILES[p.platform];
  const unit = Math.min(width, height);
  const fade = interpolate(f, [0, 6], [0.55, 1], { extrapolateRight: "clamp" });
  const place = o.pos === "top" ? { top: `${prof.safe.top + 3}%` } : o.pos === "middle" ? { top: "50%", transform: "translateY(-50%)" } : { bottom: `${prof.safe.bottom + 3}%` };
  return (
    <div style={{ position: "absolute", left: `${prof.safe.side}%`, right: `${prof.safe.side}%`, textAlign: "center", opacity: fade, ...place }}>
      <span style={{ display: "inline-block", background: "rgb(var(--text) / 0.78)", color: "rgb(var(--bg))", padding: `${unit * 0.014}px ${unit * 0.028}px`, borderRadius: unit * 0.02, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: unit * OVERLAY_SIZE[o.size] * (height > width ? 1.3 : 1), lineHeight: 1.15, letterSpacing: "-0.02em", whiteSpace: "pre-wrap" }}>{o.text}</span>
    </div>
  );
}

export function EdlComposition(p: EdlProps) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "rgb(var(--sunken))" }}>
      <SequenceList {...p} />
      {(p.overlays ?? []).map((o) => (
        <Sequence key={o.id} from={Math.round(o.at * fps)} durationInFrames={Math.max(1, Math.round(o.dur * fps))}>
          <OverlayText o={o} p={p} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function SequenceList(p: EdlProps) {
  const { fps } = useVideoConfig();
  return (
    <>
      {p.timeline.map((s, i) => (
        <Sequence key={s.id ?? i} from={Math.round(s.at * fps)} durationInFrames={Math.max(1, Math.round(s.dur * fps))}>
          <Slate seg={s} idx={i} p={p} />
        </Sequence>
      ))}
    </>
  );
}
