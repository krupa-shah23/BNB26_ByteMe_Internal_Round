"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Scale, ShieldCheck, Upload, UserRound, X, Zap } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import { gradientFor } from "@/components/ui/bits";
import { autoClean, blurPerson, blurPii, claimDecision, ignorePii, patchPerson, personBlurs, reopenClaim, reopenPii, setStatus, unblurPerson } from "@/lib/compliance/actions";
import { effSeverity, mmss } from "@/lib/compliance/analyze";
import type { Compliance, ConsentStatus, MonIssue } from "@/lib/compliance/types";
import { useStore } from "@/lib/store";
import type { Focus, Lane } from "./Lanes";

type Apply = (fn: (c: Compliance) => Compliance) => void;
const dot = { safe: "bg-ok", limited: "bg-warn", red: "bg-bad" } as const;
const statusWord: Record<ConsentStatus, string> = { consented: "Consented", unknown: "Unknown", opted_out: "Opted out" };
const statusDot: Record<ConsentStatus, string> = { consented: "bg-ok", unknown: "bg-warn", opted_out: "bg-muted" };

function Card({ open, onToggle, head, children, ring }: { open: boolean; onToggle: () => void; head: React.ReactNode; children?: React.ReactNode; ring?: boolean }) {
  return (
    <li className={clsx("overflow-hidden rounded-xl border transition-colors", open || ring ? "border-brand" : "border-line")}>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm" aria-expanded={open} onClick={onToggle}>{head}</button>
      <AnimatePresence initial={false}>
        {open && children && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="grid gap-2 border-t border-line px-3 pb-3 pt-2 text-xs text-muted">{children}</div></motion.div>}
      </AnimatePresence>
    </li>
  );
}
const JumpBtn = ({ onClick }: { onClick: () => void }) => <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onClick(); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onClick(); } }} className="btn-ghost shrink-0 px-2.5 py-0.5 text-xs">Jump</span>;

export function ChecksPanel({ c, apply, issues, capIssues, fixCaptions, lane, setLane, focus, setFocus, jump, adSafe }: {
  c: Compliance; apply: Apply; issues: MonIssue[]; capIssues: MonIssue[]; fixCaptions: () => void;
  lane: Lane; setLane: (l: Lane) => void; focus: Focus; setFocus: (f: Focus) => void; jump: (t: number) => void; adSafe: number;
}) {
  const toast = useStore((s) => s.toast);
  const [confirm, setConfirm] = useState<string | null>(null);
  const open = (l: Lane, id: string) => focus?.lane === l && focus.id === id;
  const toggle = (l: Lane, id: string, t?: number) => { if (open(l, id)) setFocus(null); else { setFocus({ lane: l, id }); if (t !== undefined) jump(t); } };

  const monOpen = issues.filter((i) => i.status === "open");
  const piiOpen = c.pii.filter((p) => p.status === "open");
  const claimsOpen = c.claims.filter((k) => k.status === "open");
  const unknown = c.people.filter((p) => p.status === "unknown");
  const tabs: { id: Lane; label: string; icon: React.ReactNode; n: number }[] = [
    { id: "mon", label: "Ads", icon: <ShieldCheck size={14} />, n: monOpen.length },
    { id: "pii", label: "PII", icon: <Lock size={14} />, n: piiOpen.length },
    { id: "claims", label: "Claims", icon: <Scale size={14} />, n: claimsOpen.length },
    { id: "people", label: "People", icon: <UserRound size={14} />, n: unknown.length },
  ];

  const clean = () => {
    const fixable = monOpen.filter((i) => i.autoFixable).length;
    if (!fixable) { toast("Nothing to auto-clean", "Remaining issues need a manual edit"); return; }
    const r = autoClean(c);
    apply(() => r.next);
    if (capIssues.length) fixCaptions();
    toast(`Auto-clean: ${fixable} issue${fixable > 1 ? "s" : ""} fixed`, r.manual ? `${r.manual} need a manual edit` : "Bleeps added and subtitles masked");
  };

  return (
    <div className="grid gap-3">
      <div role="tablist" className="grid grid-cols-4 gap-1 text-xs font-medium">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={lane === t.id} onClick={() => setLane(t.id)} className={clsx("relative flex items-center justify-center gap-1 rounded-xl px-0.5 py-2 transition-colors", lane === t.id ? "bg-text text-bg" : "text-muted hover:bg-sunken")}>
            {t.icon}{t.label}
            {t.n > 0 && <span className="absolute -right-0.5 -top-1 min-w-4 rounded-full bg-bad px-1 text-[10px] font-bold leading-4 text-bg">{t.n}</span>}
          </button>
        ))}
      </div>

      {lane === "mon" && (
        <div className="grid gap-2">
          <button className="btn-brand w-full py-2.5" onClick={clean}><Zap size={15} />Auto-Clean All Flagged</button>
          <ul className="grid gap-1.5">
            {issues.map((i) => {
              const sev = effSeverity(i); const q = c.cues.find((x) => x.id === i.cueId);
              return (
                <Card key={i.id} open={open("mon", i.id)} onToggle={() => toggle("mon", i.id, i.at)}
                  head={<><span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-700", dot[sev])} /><span className="font-mono text-xs tabular-nums text-muted">{mmss(i.at)}</span><span className="min-w-0 flex-1 truncate font-medium">{i.status === "cleaned" ? `${i.title} · cleaned` : i.title}</span><JumpBtn onClick={() => jump(i.at)} /></>}>
                  <p>{i.reason}{i.at < 15 && i.status === "open" && " · first 15 s are held to a stricter standard."}</p>
                  {q && i.kind === "profanity" && <p className="rounded-lg bg-sunken p-2 text-text">{i.status === "cleaned" && <span className="mr-1 text-muted line-through">{q.original}</span>}<motion.span key={q.text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block">“{q.text}”</motion.span></p>}
                  {!i.autoFixable && i.status === "open" && <p>Can’t be fixed automatically. Trim or replace this footage.</p>}
                </Card>
              );
            })}
            {issues.length === 0 && <li className="text-sm text-muted">No ad-safety issues found.</li>}
          </ul>
          <p className="text-[11px] text-muted">Ad-safe score {adSafe}%. An estimate based on public advertiser-friendly guidelines.</p>
        </div>
      )}

      {lane === "pii" && (
        <div className="grid gap-2">
          <button className="btn-brand w-full py-2.5" disabled={!piiOpen.length} onClick={() => { apply((x) => blurPii(x, piiOpen.map((p) => p.id))); toast(`Blurred ${piiOpen.length} items`, "Drag the handles on the timeline to adjust"); }}>Blur all ({piiOpen.length})</button>
          <ul className="grid gap-1.5">
            {c.pii.map((p) => (
              <Card key={p.id} open={open("pii", p.id)} onToggle={() => toggle("pii", p.id, p.at)}
                head={<><Lock size={13} className={p.status === "open" ? "text-bad" : p.status === "blurred" ? "text-ok" : "text-muted"} /><span className="font-mono text-xs tabular-nums text-muted">{mmss(p.at)}</span><span className="min-w-0 flex-1 truncate font-medium">{p.title}</span><JumpBtn onClick={() => jump(p.at)} /></>}>
                <p><span className="rounded border border-dashed border-bad px-1 font-mono text-text">{p.text}</span> <span className="ml-1">{p.label}</span></p>
                {p.status === "open" && <div className="flex gap-2"><button className="btn-brand flex-1 py-1.5 text-xs" onClick={() => apply((x) => blurPii(x, [p.id]))}>Blur</button><button className="btn-ghost flex-1 py-1.5 text-xs" onClick={() => setConfirm(p.id)}>Ignore</button></div>}
                {p.status === "blurred" && <p className="flex items-center justify-between text-ok">Blurred. Edit it on the timeline.<button className="btn-ghost px-2 py-0.5 text-xs text-text" onClick={() => apply((x) => reopenPii(x, p.id))}>Undo</button></p>}
                {p.status === "ignored" && <p className="flex items-center justify-between">Ignored. This may stay visible when published.<button className="btn-ghost px-2 py-0.5 text-xs text-text" onClick={() => apply((x) => reopenPii(x, p.id))}>Reopen</button></p>}
              </Card>
            ))}
            {c.pii.length === 0 && <li className="text-sm text-muted">No personal info detected.</li>}
          </ul>
        </div>
      )}

      {lane === "claims" && (
        <div className="grid gap-2">
          <p className="text-xs text-muted">Statements that sound like factual accusations. These are suggestions to review, your call.</p>
          <ul className="grid gap-1.5">
            {c.claims.map((k) => (
              <Card key={k.id} open={open("claims", k.id)} onToggle={() => toggle("claims", k.id, k.at)}
                head={<><Scale size={13} className={k.status === "open" ? "text-warn" : "text-muted"} /><span className="font-mono text-xs tabular-nums text-muted">{mmss(k.at)}</span><span className="min-w-0 flex-1 truncate font-medium">“{k.statement}”</span><JumpBtn onClick={() => jump(k.at)} /></>}>
                <p className="text-sm font-medium text-text">“{k.statement}”</p>
                <p className="text-warn">⚠ {k.note}</p>
                <p>Suggested phrasing:<span className="mt-0.5 block rounded-lg bg-sunken p-2 text-text">“{k.suggestion}”</span></p>
                {k.status === "open" ? <div className="flex gap-2"><button className="btn-brand flex-1 py-1.5 text-xs" onClick={() => { apply((x) => claimDecision(x, k.id, true)); toast("Phrasing updated", "Subtitle text changed"); }}>Use phrasing</button><button className="btn-ghost flex-1 py-1.5 text-xs" onClick={() => apply((x) => claimDecision(x, k.id, false))}>Keep as is</button></div>
                  : <p className="flex items-center justify-between">{k.status === "applied" ? "Phrasing applied." : "Kept as is."}<button className="btn-ghost px-2 py-0.5 text-xs text-text" onClick={() => apply((x) => reopenClaim(x, k.id))}>Undo</button></p>}
              </Card>
            ))}
            {c.claims.length === 0 && <li className="text-sm text-muted">No risky claims found.</li>}
          </ul>
          <p className="text-[11px] text-muted/80">Not legal advice</p>
        </div>
      )}

      {lane === "people" && (
        <div className="grid gap-2">
          {unknown.length > 0 && <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">⚠ {unknown.length} {unknown.length === 1 ? "person requires" : "people require"} consent review before you can publish.</p>}
          <ul className="grid gap-1.5">
            {c.people.map((p) => {
              const blurred = personBlurs(c, p.id).length > 0;
              return (
                <Card key={p.id} open={open("people", p.id)} onToggle={() => toggle("people", p.id, p.appearances[0]?.at)}
                  head={<><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-brand-ink" style={{ background: gradientFor(p.hue) }}>{(p.name || p.label).slice(-1)}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name || p.label}</span><span className="flex items-center gap-1 text-[11px] text-muted"><span className={clsx("h-2 w-2 rounded-full", statusDot[p.status])} />{statusWord[p.status]}{blurred && " · blurred"}</span></span></>}>
                  <label className="grid gap-1">Name (optional)<input className="input py-1.5 text-sm text-text" value={p.name} placeholder={p.label} onChange={(e) => apply((x) => patchPerson(x, p.id, { name: e.target.value }))} /></label>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-brand py-1.5 text-xs" disabled={p.status === "consented"} onClick={() => apply((x) => setStatus(x, p.id, "consented"))}>{p.status === "consented" ? "✓ Consented" : "Mark consented"}</button>
                    <button className="btn-ghost py-1.5 text-xs" disabled={p.status === "opted_out"} onClick={() => apply((x) => setStatus(x, p.id, "opted_out"))}>Opted out</button>
                    {p.status !== "unknown" && <button className="btn-ghost py-1.5 text-xs" onClick={() => apply((x) => setStatus(x, p.id, "unknown"))}>Reset</button>}
                  </div>
                  <button className="btn-ghost w-full py-1.5 text-xs" onClick={() => { apply((x) => (blurred ? unblurPerson(x, p.id) : blurPerson(x, p.id))); if (!blurred) toast(`${p.name || p.label} blurred`, "Adjust it in the Blur lane"); }}>{blurred ? "Remove blur" : "Blur this person"}</button>
                  {p.status === "opted_out" && !blurred && <p className="text-warn">Opted out. Blur this person before publishing.</p>}
                  <div className="grid gap-1"><span>Consent <span className="opacity-70">(optional)</span></span>
                    {p.release ? <p className="flex items-center justify-between rounded-lg bg-sunken px-2 py-1.5 text-text"><span className="truncate">{p.release}</span><button aria-label="Remove release" onClick={() => apply((x) => patchPerson(x, p.id, { release: undefined }))}><X size={13} /></button></p>
                      : <label className="btn-ghost cursor-pointer py-1.5 text-xs"><Upload size={13} />Upload signed release<input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; /* BACKEND-SLOT(consent-upload): store the file; the demo keeps the name only */ if (f) apply((x) => patchPerson(x, p.id, { release: f.name })); e.target.value = ""; }} /></label>}
                  </div>
                </Card>
              );
            })}
          </ul>
        </div>
      )}

      <Overlay open={!!confirm} onClose={() => setConfirm(null)} side="center" width="max-w-sm" labelledBy="ign-h">
        <div className="p-6 pt-16 text-center">
          <h2 id="ign-h" className="font-display text-2xl tracking-tight">Ignore this PII warning?</h2>
          <p className="mt-2 text-sm text-muted">This information may remain visible in the published video.</p>
          <div className="mt-6 grid grid-cols-2 gap-2"><button className="btn-ghost" data-autofocus onClick={() => setConfirm(null)}>Cancel</button><button className="btn-primary" onClick={() => { if (confirm) apply((x) => ignorePii(x, confirm)); setConfirm(null); }}>Ignore</button></div>
        </div>
      </Overlay>
    </div>
  );
}
