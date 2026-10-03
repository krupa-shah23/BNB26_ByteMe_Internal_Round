"use client";
import { ArrowLeft, ArrowRight, RotateCcw, Check } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import creatorsFx from "@/fixtures/creators.json";
import { Badge, Poster } from "@/components/ui/bits";
import AnimatedList from "@/components/reactbits/AnimatedList";
import DepthCarousel, { type DepthCarouselHandle } from "@/components/reactbits/DepthCarousel";
import RubberSegment from "@/components/reactbits/RubberSegment";
import { fireHearts } from "@/lib/hearts";
import { relTime } from "@/lib/projects";
import { useStore, type CollabRequest } from "@/lib/store";

interface Creator { id: string; name: string; handle: string; niche: string; followers: number; topics: string[]; vec: number[] }
const creators = creatorsFx.creators as Creator[];
const USER = { vec: [0.8, 0.3, 0.2, 0.8, 0.4, 0.7, 0.3, 0.4], topics: ["startup-india", "education", "comedy", "career"], followers: 48200 };

const cosine = (a: number[], b: number[]) => {
  const d = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? d / (na * nb) : 0;
};
const band = (f: number) => (f < 25_000 ? 0 : f < 60_000 ? 1 : f < 120_000 ? 2 : 3);

type Ranked = { c: Creator; score: number; overlap: number; shared: string[]; why: string[] };

/** score = 0.5·cosine(audience) + 0.3·topicJaccard + 0.2·followerBandCloseness, against the creator's *learned* preference vector. */
export function rank(pref: number[], swiped: Record<string, string>, skip: Set<string> = new Set()): Ranked[] {
  const target = USER.vec.map((v, i) => v + (pref[i] ?? 0));
  return creators.filter((c) => !swiped[c.id] && !skip.has(c.id)).map((c) => {
    const inter = c.topics.filter((t) => USER.topics.includes(t)).length;
    const jac = inter / (new Set([...c.topics, ...USER.topics]).size);
    const closeness = 1 - Math.abs(band(c.followers) - band(USER.followers)) / 3;
    const score = 0.5 * cosine(c.vec, target) + 0.3 * jac + 0.2 * closeness;
    return { c, score, overlap: Math.round(Math.min(0.97, score) * 100), shared: c.topics.filter((t) => USER.topics.includes(t)), why: [inter ? `${inter} shared topic${inter > 1 ? "s" : ""}` : "Fresh audience", band(c.followers) === band(USER.followers) ? "Similar size" : "Bigger reach", cosine(c.vec, target) > 0.9 ? "High audience overlap" : "Complementary audience"] };
  }).sort((a, b) => b.score - a.score);
}

function CreatorCardBody({ item, requested }: { item: Ranked; requested: boolean }) {
  const { c } = item;
  return (
    <div className="flex h-full flex-col text-left">
      <Poster seed={+c.id.slice(1) * 7} className="h-[38%] shrink-0">
        <div className="absolute -bottom-9 left-5 grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-surface bg-brand font-display text-3xl text-brand-ink">{c.name[0]}</div>
        {requested && <span className="chip absolute right-3 top-3 border-transparent bg-bg/90 text-ok"><Check size={12} />Requested</span>}
      </Poster>
      <div className="flex-1 p-5 pt-12">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-display text-2xl">{c.name}</h3><p className="truncate text-sm text-muted">{c.handle} · {c.niche}</p></div><Badge tone="brand">{item.overlap}% <span className="opacity-60">Est.</span></Badge></div>
        <p className="mt-3 text-sm">{(c.followers / 1000).toFixed(0)}K followers · {c.topics.join(", ")}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{item.why.map((w) => <span key={w} className="chip">{w}</span>)}</div>
        <p className="mt-3 text-[11px] text-muted">Fictional demo creator. Overlap is estimated from public signals.</p>
      </div>
    </div>
  );
}

const SWIPE_PX = 70;

export function Collabs() {
  const { pref, swiped, swipe, requests, requestCollab, addCal, toast } = useStore();
  const [sub, setSub] = useState<"discover" | "tracker">("discover");
  // the deck is fixed for this visit (creators you already passed on / requested are not shown again)
  const [deckKey, setDeckKey] = useState(0);
  const list = useMemo(() => rank(pref, swiped, new Set(useStore.getState().requests.map((r) => r.creatorId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckKey]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const carousel = useRef<DepthCarouselHandle>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const requestedIds = useMemo(() => new Set(requests.map((r) => r.creatorId)), [requests]);
  const current = list[active];
  const currentRequested = !!current && requestedIds.has(current.c.id);

  /** Both the desktop arrows and the mobile swipe call exactly these two functions. */
  const collaborate = useCallback(() => {
    const t = list[activeRef.current];
    if (!t) return;
    try {
      const res = requestCollab({ creatorId: t.c.id, name: t.c.name, handle: t.c.handle, niche: t.c.niche });
      if (res === "duplicate") {
        toast("Already requested", `You've already sent a collaboration request to ${t.c.handle}.`, { kind: "info" });
      } else {
        swipe(t.c.id, "right", t.c.vec);
        addCal({ type: "collab", title: `Collab with ${t.c.handle}`, startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), withHandle: t.c.handle, stage: "Idea" });
        toast(`Collaboration message sent to ${t.c.handle}`, "Added to your Tracker", { duration: 20_000, kind: "success" });
        fireHearts({ count: 18, origin: { x: innerWidth / 2, y: innerHeight * 0.55 } });
      }
      carousel.current?.next();
    } catch {
      toast("Couldn't send the request", "Something went wrong — please try again.", { kind: "error" });
    }
  }, [list, requestCollab, swipe, addCal, toast]);

  const pass = useCallback(() => {
    const t = list[activeRef.current];
    if (!t) return;
    if (!requestedIds.has(t.c.id)) swipe(t.c.id, "left", t.c.vec); // learns a negative preference; no request, no tracker entry
    carousel.current?.next();
  }, [list, swipe, requestedIds]);

  const onPointerDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) collaborate(); else pass();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); collaborate(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); pass(); }
  };

  const items = useMemo(() => list.map((it) => ({ alt: it.c.name, content: <CreatorCardBody item={it} requested={requestedIds.has(it.c.id)} /> })), [list, requestedIds]);

  const arrow = (kind: "pass" | "collab", extra = "") => (
    <button onClick={kind === "pass" ? pass : collaborate} disabled={kind === "collab" && currentRequested}
      aria-label={kind === "pass" ? "Pass" : currentRequested ? "Already requested" : "Collaborate"}
      className={clsx("grid h-14 w-14 shrink-0 place-items-center rounded-full border transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100",
        kind === "pass" ? "border-line bg-surface text-bad hover:bg-sunken" : "border-transparent bg-ok text-bg", extra)}>
      {kind === "pass" ? <ArrowLeft /> : currentRequested ? <Check /> : <ArrowRight />}
    </button>
  );

  return (
    <section aria-labelledby="cd-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cd-title" className="t-h1">Creator Discovery</h2>
        <RubberSegment
          aria-label="Discovery view"
          items={[{ value: "discover", label: "Discover" }, { value: "tracker", label: <>Tracker{requests.length > 0 && <span className="ml-1.5 rounded-full bg-brand-2 px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">{requests.length}</span>}</> }]}
          value={sub} onChange={(v) => setSub(v as "discover" | "tracker")}
          size="lg" radius={22}
          trackColor="rgb(var(--sunken))" thumbColor="rgb(var(--brand))" textColor="rgb(var(--text))" activeTextColor="rgb(var(--brand-ink))"
        />
      </header>

      {sub === "discover" ? (
        <div className="mt-4">
          {list.length === 0 ? (
            <div className="card grid min-h-[360px] place-items-center p-8 text-center"><div><p className="font-display text-3xl">You've seen everyone</p><p className="mt-2 text-sm text-muted">Creators you requested are in the Tracker. Passed creators can be reshuffled.</p>
              <button className="btn-primary mt-5" onClick={() => { useStore.setState({ swiped: {} }); setActive(0); activeRef.current = 0; setDeckKey((k) => k + 1); }}><RotateCcw size={16} />Reshuffle</button></div></div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 lg:gap-6" onKeyDown={onKeyDown}>
                {arrow("pass", "hidden md:grid")}
                <div className="h-[440px] w-full max-w-[640px] touch-pan-y" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (start.current = null)}>
                  <DepthCarousel
                    ref={carousel}
                    items={items}
                    cardWidth={300} cardHeight={400} radius={22}
                    depth={170} spread={64} tilt={16} perspective={1200} visibleCards={3} falloff={0.22} blur={4} duration={600}
                    tint="rgb(var(--brand))"
                    showControls={false} showIndicators={false}
                    draggable={false} wheel={false} keyboard={false}
                    onChange={(i) => { setActive(i); activeRef.current = i; }}
                    className="!cursor-default"
                  />
                </div>
                {arrow("collab", "hidden md:grid")}
              </div>
              <div className="mt-2 flex items-center justify-center gap-6 md:hidden">{arrow("pass")}{arrow("collab")}</div>
              <p className="mt-3 text-center text-xs text-muted" aria-live="polite">
                {current ? <><b className="text-text">{current.c.name}</b> · swipe or use ← Pass / Collaborate →</> : null}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6">
          {requests.length === 0 ? (
            <div className="card grid place-items-center gap-3 p-10 text-center"><p className="font-display text-2xl">No collaboration requests yet</p><p className="max-w-sm text-sm text-muted">Creators you collaborate with appear here. Passing a creator never adds them.</p><button className="btn-primary" onClick={() => setSub("discover")}>Discover creators</button></div>
          ) : (
            <AnimatedList<CollabRequest>
              items={requests}
              getKey={(r) => r.creatorId}
              renderItem={(r) => (
                <div className="flex items-center gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand font-display text-lg text-brand-ink">{r.name[0]}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.name} <span className="font-normal text-muted">{r.handle}</span></p><p className="truncate text-xs text-muted">{r.niche} · {relTime(r.at)}</p></div>
                  <Badge tone="ok"><Check size={12} />Collaboration Requested</Badge>
                </div>
              )}
            />
          )}
        </div>
      )}
    </section>
  );
}
