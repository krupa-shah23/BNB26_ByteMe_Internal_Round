"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CheckCheck, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { allCreators, recommend, type Creator } from "@/lib/recommend";
import { tickOf, type Tick } from "@/lib/messaging";
import { useStore } from "@/lib/store";
import type { Msg } from "@/lib/types";

const TONES = ["bg-accent text-black", "bg-brand-2 text-black", "bg-sage text-text", "bg-brand text-brand-ink"];
const toneOf = (id: string) => TONES[(+id.replace(/\D/g, "") || 0) % TONES.length];
const byId = (id: string) => allCreators.find((c) => c.id === id) as Creator;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
const short = (iso: string, now: number) => {
  const m = Math.floor((now - new Date(iso).getTime()) / 60_000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
};

/** One grey tick = sent, two grey = delivered, two coloured = read. */
export function Ticks({ tick, className }: { tick: Tick; className?: string }) {
  const Icon = tick === "sent" ? Check : CheckCheck;
  return <span className={clsx("inline-flex", tick === "read" ? "text-accent" : "text-muted", className)} aria-label={tick === "sent" ? "Sent" : tick === "delivered" ? "Delivered" : "Read"}><Icon size={14} /></span>;
}

const Avatar = ({ c, size = 40 }: { c: Creator; size?: number }) => (
  <span className={clsx("grid shrink-0 place-items-center rounded-full font-display", toneOf(c.id))} style={{ width: size, height: size, fontSize: size * 0.45 }}>{c.name.replace("Demo ", "")[0]}</span>
);

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="grid grid-cols-[88px_1fr_32px] items-center gap-2 text-[11px] text-muted">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-line"><motion.span className="block h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6, ease: "easeOut" }} /></span>
      <span className="text-right tabular-nums">{v}%</span>
    </div>
  );
}

export function Messages() {
  const params = useSearchParams();
  const { messages, sendMessage, markThreadRead, request, requested, pref } = useStore();
  const [tab, setTab] = useState<"inbox" | "suggested">("inbox");
  const [sel, setSel] = useState<string | null>(params.get("c"));
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const threads = useMemo(() => Object.entries(messages).filter(([, m]) => m.length).map(([id, m]) => ({ id, c: byId(id), last: m[m.length - 1], unread: m.filter((x) => x.from === "them" && !x.read).length }))
    .filter((t) => t.c).sort((a, b) => +new Date(b.last.at) - +new Date(a.last.at)), [messages]);
  const recs = useMemo(() => recommend(pref).filter((r) => !messages[r.c.id]?.length).slice(0, 6), [pref, messages]);

  // desktop starts with the newest thread open; phones start on the list
  useEffect(() => { if (!sel && threads[0] && window.innerWidth >= 1024) setSel(threads[0].id); }, [threads, sel]);
  const cur = sel ? messages[sel] ?? [] : [];
  useEffect(() => { if (sel) markThreadRead(sel); }, [sel, cur.length, markThreadRead]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [cur.length, sel]);

  const c = sel ? byId(sel) : null;
  const send = (e: React.FormEvent) => { e.preventDefault(); if (!sel || !draft.trim()) return; sendMessage(sel, draft); setDraft(""); };
  const startThread = (id: string) => { request(id); setSel(id); setTab("inbox"); };

  return (
    <div className="mx-auto grid h-[calc(100dvh-9rem)] max-w-[1400px] gap-4 lg:h-[calc(100dvh-5rem-1.75rem)] lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* left: inbox / suggested */}
      <section aria-label="Conversations" className={clsx("min-h-0 flex-col overflow-hidden rounded-[24px] border border-text/10 bg-surface lg:flex", sel ? "hidden" : "flex")}>
        <div className="p-4 pb-2">
          <h1 className="font-display text-3xl tracking-tight">Messages</h1>
          <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-pill border border-line p-1 text-sm font-medium">
            {(["inbox", "suggested"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("rounded-pill py-1.5 transition-colors", tab === t ? "bg-brand text-brand-ink" : "text-muted hover:text-text")}>{t === "inbox" ? `Inbox${threads.some((x) => x.unread) ? " •" : ""}` : "Who to collab with"}</button>)}
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "inbox" ? (
            threads.length === 0 ? <p className="p-6 text-center text-sm text-muted">No conversations yet. Swipe right on a creator in Home, or pick someone under &quot;Who to collab with&quot;.</p> : (
              <ul className="grid gap-1">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setSel(t.id)} className={clsx("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", sel === t.id ? "bg-sunken" : "hover:bg-sunken/60")}>
                      <Avatar c={t.c} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2"><span className="truncate text-sm font-semibold">{t.c.handle}</span><span className="shrink-0 text-[11px] text-muted">{short(t.last.at, now)}</span></span>
                        <span className="flex min-w-0 items-center gap-1 text-xs text-muted">
                          {t.last.from === "me" && <Ticks tick={tickOf(t.last, now)} />}
                          <span className={clsx("truncate", t.unread > 0 && "font-medium text-text")}>{t.last.text}</span>
                        </span>
                      </span>
                      {t.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-ink">{t.unread}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="grid gap-2 p-1">
              {recs.map((r, i) => (
                <motion.li key={r.c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center gap-3">
                    <Avatar c={r.c} size={36} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.c.handle}</p><p className="truncate text-xs text-muted">{r.c.niche} · {(r.c.followers / 1000).toFixed(0)}K followers</p></div>
                    <span className="chip border-brand/40 bg-brand/10 text-brand">{Math.round(r.score * 100)}% match</span>
                  </div>
                  <div className="mt-3 grid gap-1.5"><Bar label="Similar content" v={r.content} /><Bar label="Audience fit" v={r.audience} /><Bar label="Follower fit" v={r.size} /></div>
                  {r.shared.length > 0 && <p className="mt-2 text-[11px] text-muted">Shared topics: {r.shared.join(", ")}</p>}
                  <button className="btn-ghost mt-3 w-full py-1.5 text-xs" disabled={requested.includes(r.c.id)} onClick={() => startThread(r.c.id)}>Send collab message</button>
                </motion.li>
              ))}
              {recs.length === 0 && <li className="p-6 text-center text-sm text-muted">You have messaged everyone we would suggest.</li>}
              <li className="px-2 pb-2 text-[11px] text-muted">Fictional demo creators. Audience fit is estimated from public signals.</li>
            </ul>
          )}
        </div>
      </section>

      {/* right: conversation */}
      <section aria-label="Conversation" className={clsx("min-h-0 flex-col overflow-hidden rounded-[24px] border border-text/10 bg-surface lg:flex", sel ? "flex" : "hidden")}>
        {c ? (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-sunken lg:hidden" aria-label="Back to inbox" onClick={() => setSel(null)}><ArrowLeft size={18} /></button>
              <Avatar c={c} size={38} />
              <div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="truncate text-xs text-muted">{c.handle} · {c.niche} · {(c.followers / 1000).toFixed(0)}K followers</p></div>
            </header>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
              <ul className="grid gap-2">
                <AnimatePresence initial={false}>
                  {cur.map((m: Msg) => (
                    <motion.li key={m.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={clsx("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                      <div className={clsx("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", m.from === "me" ? "rounded-br-md bg-brand text-brand-ink" : "rounded-bl-md bg-sunken")}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={clsx("mt-0.5 flex items-center justify-end gap-1 text-[10px]", m.from === "me" ? "text-brand-ink/70" : "text-muted")}>
                          {clock(m.at)}{m.from === "me" && <Ticks tick={tickOf(m, now)} className={tickOf(m, now) === "read" ? "!text-accent" : "!text-brand-ink/70"} />}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <div ref={end} />
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
              <input className="input" placeholder="Write a message" aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button className="btn-brand h-11 w-11 shrink-0 p-0" aria-label="Send" disabled={!draft.trim()}><Send size={16} /></button>
            </form>
          </>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-sm text-muted"><div><p className="font-display text-2xl text-text">Pick a conversation</p><p className="mt-1">Collab messages you send or receive show up here.</p></div></div>
        )}
      </section>
    </div>
  );
}
