"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, Bell, FilePlus2, IndianRupee, Lock, PenLine, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import clsx from "clsx";
import analytics from "@/fixtures/analytics.json";
import audience from "@/fixtures/audience.json";
import { Badge, Count, Reveal, Skeleton, SlidingNav, useDemoDelay } from "@/components/ui/bits";
import { ThumbCard } from "@/components/studio/Tools";
import { DemandEngine } from "@/components/audience/DemandEngine";
import sources from "@/fixtures/dataSources.json";
import { useSection } from "@/lib/useSection";
import { fmtTime, totalDur } from "@/lib/projects";
import { useStore, type Permissions } from "@/lib/store";

const SECTIONS = ["hub", "analytics", "activity", "earnings"] as const;
type Section = (typeof SECTIONS)[number];
const NAV = [{ id: "overview", label: "Overview" }, { id: "earnings", label: "Earnings" }, { id: "audience", label: "Audience" }, { id: "collabs", label: "Collab log" }] as { id: Section; label: string }[];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const NA = <span className="text-muted" title="The platform doesn't expose this yet, shown as not available, never 0">n/a</span>;

function Locked({ what, children, onAllow }: { what: string; children: React.ReactNode; onAllow: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-md" aria-hidden="true">{children}</div>
      <div className="absolute inset-0 grid place-items-center bg-bg/60">
        <div className="grid justify-items-center gap-3 text-center"><Lock /><p className="text-sm font-medium">Allow access to see {what}</p><button className="btn-primary py-2" onClick={onAllow}>Allow</button></div>
      </div>
    </div>
  );
}

function ConsentCard() {
  const { permissions, setPermissions } = useStore();
  const [draft, setDraft] = useState({ earnings: true, reach: true, audience: true });
  if (permissions.decided) return null;
  const items = [
    { k: "reach" as const, t: "Instagram insights", d: "Reach, views, follower count" },
    { k: "earnings" as const, t: "YouTube Analytics", d: "Views, subscribers gained, estimated revenue (monetised channels only)" },
    { k: "audience" as const, t: "Comments & audience", d: "Sentiment and top questions" },
  ];
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mb-8 border-brand p-6" aria-labelledby="consent-h">
      <h2 id="consent-h" className="t-h2">Allow CreatorAi to read your analytics?</h2>
      <p className="mt-1 text-sm text-muted">Exactly what will be read, switch off anything you'd rather not share. Revoke any time in Settings → Data permissions.</p>
      <ul className="mt-5 grid gap-2">
        {items.map((it) => (
          <li key={it.k}><label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-4"><span><span className="block text-sm font-medium">{it.t}</span><span className="text-xs text-muted">{it.d}</span></span>
            <input type="checkbox" checked={draft[it.k]} onChange={(e) => setDraft({ ...draft, [it.k]: e.target.checked })} className="h-5 w-5 accent-[rgb(var(--brand))]" /></label></li>
        ))}
      </ul>
      <div className="mt-5 flex gap-2"><button className="btn-brand" onClick={() => setPermissions({ ...draft, comments: draft.audience, decided: true })}>Allow selected</button><button className="btn-ghost" onClick={() => setPermissions({ decided: true })}>Not now</button></div>
    </motion.section>
  );
}

function HeatStrip({ data }: { data: number[] }) {
  return (
    <div className="flex h-10 gap-0.5 overflow-hidden rounded-lg" role="img" aria-label="Retention and shares by section of the video">
      {data.map((v, i) => <motion.div key={i} className="flex-1 bg-brand" initial={{ opacity: 0 }} animate={{ opacity: 0.12 + (v / 100) * 0.88 }} transition={{ delay: i * 0.04 }} title={`Section ${i + 1}: ${v}`} />)}
    </div>
  );
}

function Overview() {
  const { projects, permissions, setPermissions } = useStore();
  const [net, setNet] = useState<"All" | "Instagram" | "YouTube">("All");
  const [open, setOpen] = useState<string | null>("reel_014");
  const published = projects.filter((p) => p.status === "Published" && !p.id.startsWith("p_seed"));
  const o = analytics.overview;
  const rows = analytics.content.filter((r) => net === "All" || r.platform === net);
  return (
    <>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="t-h2">Content</h2>
        <div role="tablist" className="flex gap-2">{(["All", "Instagram", "YouTube"] as const).map((n) => <button key={n} role="tab" aria-selected={net === n} onClick={() => setNet(n)} className={clsx("chip px-4 py-1.5", net === n && "border-brand bg-brand text-brand-ink")}>{n}</button>)}</div></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="t-label text-muted"><tr className="border-b border-line">{["Thumbnail", "Title", "Views", "Followers gained (Est.)"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {net !== "YouTube" && published.map((p) => (
              <motion.tr key={p.id} initial={{ opacity: 0, backgroundColor: "rgb(var(--brand) / .2)" }} animate={{ opacity: 1, backgroundColor: "rgb(var(--brand) / 0)" }} transition={{ duration: 2 }} className="border-b border-line">
                <td className="w-32 p-3"><ThumbCard hue={p.hue} frame={p.thumb?.frame ?? 0} text={p.thumb?.text ?? ""} template={p.thumb?.template ?? "brand"} badge={fmtTime(totalDur(p.timeline))} className="rounded-md" /></td>
                <td className="px-4 font-medium">{p.title} <Badge tone="brand">New</Badge><span className="mt-0.5 block text-xs font-normal text-muted">{p.platforms.map((x) => (x.startsWith("yt") ? "YouTube" : "Instagram"))[0]} · just now</span></td>
                <td className="px-4">{NA}</td><td className="px-4">{NA}</td>
              </motion.tr>
            ))}
            {rows.map((r) => (
              <FragmentRow key={r.id} r={r} open={open === r.id} toggle={() => setOpen(open === r.id ? null : r.id)} permissions={permissions} allow={(k) => setPermissions({ [k]: true, decided: true })} />
            ))}
          </tbody>
        </table>
      </div>

    </>
  );
}

function FragmentRow({ r, open, toggle, permissions, allow }: { r: (typeof analytics.content)[number]; open: boolean; toggle: () => void; permissions: Permissions; allow: (k: "earnings" | "reach") => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-line hover:bg-sunken/60" onClick={toggle} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && toggle()} aria-expanded={open}>
        <td className="w-32 p-3"><ThumbCard hue={r.hue} frame={r.hue} text={r.title.split(" ").slice(0, 3).join(" ")} template="brand" className="rounded-md" /></td>
        <td className="max-w-[320px] px-4 font-medium">{r.title}<span className="mt-0.5 block text-xs font-normal text-muted">{r.platform} · {r.kind} · {new Date(r.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></td>
        <td className="px-4 tabular-nums">{r.views.toLocaleString("en-IN")}</td>
        <td className="px-4 tabular-nums">+{r.gained} <span className="text-xs text-muted">Est.</span></td>
      </tr>
      <AnimatePresence>
        {open && (
          <tr><td colSpan={4} className="p-0">
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-sunken/50">
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px]">
                <div><Badge tone="brand">Creator Intelligence</Badge><p className="mt-3 font-display text-2xl leading-tight">{r.insight.headline}</p><div className="mt-5"><HeatStrip data={r.insight.heat} /><div className="mt-1 flex justify-between text-[10px] text-muted"><span>0:00</span><span>retention + shares by section</span><span>end</span></div></div></div>
                <div className="text-sm"><p className="t-label text-muted">Top topic</p><p className="mt-1">{r.insight.topTopic}</p><p className="t-label mt-4 text-muted">Next actions</p><ul className="mt-1 grid gap-1">{r.insight.nextActions.map((a) => <li key={a}>→ {a}</li>)}</ul><Link href="/home?section=library" className="mt-3 inline-block text-xs text-brand underline">3 unused clips in your Library</Link></div>
              </div>
            </motion.div>
          </td></tr>
        )}
      </AnimatePresence>
    </>
  );
}

/** Hard-coded demo chart driven by analytics.earningsMonthly (token colours only). */
function EarningsChart() {
  const data = analytics.earningsMonthly;
  const W = 640, H = 270, PL = 52, PR = 18, PT = 28, PB = 38;
  const max = Math.ceil(Math.max(...data.map((d) => d.amount)) / 2000) * 2000;
  const x = (i: number) => PL + (i * (W - PL - PR)) / (data.length - 1);
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.amount)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - PB} L${x(0)},${H - PB} Z`;
  const [hov, setHov] = useState<number | null>(null);
  const last = data[data.length - 1], prev = data[data.length - 2];
  const total = data.reduce((a, d) => a + d.amount, 0);
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div><p className="t-label text-muted">Last 6 months</p><p className="font-display text-4xl tracking-tight">{inr(total)}</p></div>
        <p className="pb-1 text-sm text-ok">▲ {Math.round(((last.amount - prev.amount) / prev.amount) * 100)}% vs {prev.month} ({inr(last.amount)} in {last.month})</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label={`Monthly income, ${data.map((d) => `${d.month} ${inr(d.amount)}`).join(", ")}`}>
        <defs><linearGradient id="earn-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style={{ stopColor: "rgb(var(--brand))", stopOpacity: 0.32 }} /><stop offset="100%" style={{ stopColor: "rgb(var(--brand))", stopOpacity: 0 }} /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}><line x1={PL} x2={W - PR} y1={y(max * t)} y2={y(max * t)} stroke="rgb(var(--line))" strokeDasharray={t ? "3 5" : undefined} /><text x={PL - 8} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))">{t ? `₹${(max * t) / 1000}k` : "0"}</text></g>
        ))}
        <motion.path d={area} fill="url(#earn-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
        <motion.path d={line} fill="none" stroke="rgb(var(--brand))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
        {data.map((d, i) => (
          <g key={d.month} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <rect x={x(i) - 36} y={PT - 10} width="72" height={H - PT - PB + 10} fill="transparent" />
            <motion.circle cx={x(i)} cy={y(d.amount)} r={hov === i ? 7 : 5} fill="rgb(var(--bg))" stroke="rgb(var(--brand))" strokeWidth="3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.12 }} style={{ transformOrigin: `${x(i)}px ${y(d.amount)}px` }} />
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fill="rgb(var(--text))">{d.month}</text>
            <text x={x(i)} y={y(d.amount) - 12} textAnchor="middle" fontSize="11" fontWeight={hov === i ? 700 : 500} fill={hov === i ? "rgb(var(--text))" : "rgb(var(--muted))"}>{inr(d.amount)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Earnings() {
  const { permissions, setPermissions } = useStore();
  const max = Math.max(...analytics.earningsMonthly.map((m) => m.amount));
  const body = (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <h2 className="t-h2">Monthly income</h2>
        <EarningsChart />
      </div>
      <div className="grid gap-6">
        <div className="card p-6"><h3 className="t-label text-muted">Collab income</h3><ul className="mt-3 grid gap-2 text-sm">{analytics.collabIncome.map((c) => <li key={c.with} className="flex justify-between"><span>{c.with}</span><b>{inr(c.amount)}</b></li>)}</ul></div>
        <div className="card p-6"><h3 className="t-label text-muted">By post</h3><ul className="mt-3 grid gap-2 text-sm">{analytics.content.filter((c) => c.earnings).map((c) => <li key={c.id} className="flex justify-between gap-3"><span className="truncate">{c.title}</span><b>{inr(c.earnings!)}</b></li>)}</ul><p className="mt-3 text-xs text-muted">YouTube only (needs monetisation scope). Instagram: add manually or import CSV.</p></div>
      </div>
    </div>
  );
  return permissions.earnings ? body : <Locked what="earnings" onAllow={() => setPermissions({ earnings: true, decided: true })}>{body}</Locked>;
}

function Audience() {
  const { permissions, setPermissions } = useStore();
  const s = audience.sentiment, circ = 2 * Math.PI * 52;
  let acc = 0;
  const segs = [{ v: s.positive, c: "ok" }, { v: s.neutral, c: "muted" }, { v: s.negative, c: "bad" }];
  const body = (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card p-6"><h2 className="t-label text-muted">Comment sentiment</h2>
        <svg viewBox="0 0 140 140" className="mx-auto mt-4 h-44 w-44 -rotate-90" role="img" aria-label={`${s.positive}% positive, ${s.neutral}% neutral, ${s.negative}% negative`}>
          {segs.map((g, i) => { const len = (g.v / 100) * circ; const el = <circle key={i} cx="70" cy="70" r="52" fill="none" stroke={`rgb(var(--${g.c}))`} strokeWidth="18" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} />; acc += len; return el; })}
        </svg>
        <p className="mt-2 text-center text-sm text-muted">{s.positive}% positive · {s.neutral}% neutral · {s.negative}% negative</p></div>
      <div className="min-w-0 lg:col-span-2"><DemandEngine /></div>
    </div>
  );
  const gated = permissions.audience ? body : <Locked what="audience insights" onAllow={() => setPermissions({ audience: true, comments: true, decided: true })}>{body}</Locked>;
  return gated;
}

function CollabLog() {
  return (
    <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="t-label text-muted"><tr className="border-b border-line">{["What", "When", "With whom", "Platform", "Views", "Reach", "Gained / lost"].map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{analytics.collabLog.map((c) => (<tr key={c.id} className="border-b border-line last:border-0"><td className="px-4 py-4 font-medium">{c.what}</td><td className="px-4">{new Date(c.when).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td className="px-4">{c.withWhom}</td><td className="px-4">{c.platform}</td><td className="px-4 tabular-nums">{c.views.toLocaleString("en-IN")}</td><td className="px-4">{c.reach ? c.reach.toLocaleString("en-IN") : NA}</td><td className="px-4"><span className="text-ok">+{c.gained}</span> / <span className="text-bad">−{c.lost}</span> <span className="text-xs text-muted">Est.</span></td></tr>))}</tbody></table></div>
  );
}

const CARDS = [
  { id: "analytics", label: "Analytics", icon: TrendingUp, blurb: "See how your content is performing", cta: "View analytics", tone: "bg-brand-2 text-black" },
  { id: "activity", label: "Activity", icon: Activity, blurb: "See your recent actions and updates", cta: "View activity", tone: "bg-accent text-black" },
  { id: "earnings", label: "Earnings", icon: IndianRupee, blurb: "Track your creator earnings and revenue", cta: "View earnings", tone: "bg-sage text-text" },
] as const;

function Hub() {
  return (
    <>
      <header className="mb-8">
        <p className="t-label text-muted">Dashboard</p>
        <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none tracking-tight">Your Creator Space</h1>
        <p className="mt-3 text-muted">Everything you need, in one place.</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <li key={c.id}>
            <Link href={`/dashboard?section=${c.id}`} className={`group flex min-h-[280px] flex-col justify-between rounded-[28px] border border-text/10 p-6 transition-transform hover:-translate-y-1 ${c.tone}`}>
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-current"><c.icon size={22} /></span>
                <h2 className="mt-5 font-display text-3xl leading-none tracking-tight">{c.label}</h2>
                <p className="mt-3 max-w-[16rem] text-sm opacity-80">{c.blurb}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium">{c.cta}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Back({ title }: { title: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={14} />Dashboard</Link><h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-none tracking-tight">{title}</h1></div>
    </div>
  );
}

/** Where each number comes from. Only YouTube exposes revenue through a public API; everything else is consent-gated manual/CSV. */
function DataSources({ kind }: { kind: "analytics" | "earnings" }) {
  return (
    <section className="mt-10" aria-label="Data sources">
      <h2 className="t-label text-muted">{kind === "analytics" ? "Where analytics come from" : "Where earnings come from"}</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="t-label text-muted"><tr className="border-b border-line"><th scope="col" className="px-4 py-3">Platform</th><th scope="col" className="px-4 py-3">{kind === "analytics" ? "Source & metrics" : "How we get it"}</th><th scope="col" className="px-4 py-3">{kind === "analytics" ? "Access" : "Method"}</th></tr></thead>
          <tbody>
            {sources.platforms.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 align-top">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{kind === "analytics" ? <>{p.analytics}<span className="block text-xs text-muted">{p.metrics}</span></> : p.earningsHow}</td>
                <td className="px-4 py-3">{kind === "analytics" ? <span className="text-xs text-muted">{p.scope}</span> : <Badge tone={p.earnings === "api" ? "ok" : "muted"}>{p.earnings === "api" ? "Native API" : "Payout Vault (CSV / manual)"}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {kind === "earnings" && <p className="mt-3 text-xs text-muted">YouTube revenue is read natively with the monetary scope. For platforms without a public revenue endpoint, creators import payout CSVs or log sponsored contracts in a consent-gated Payout Vault.</p>}
    </section>
  );
}

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

/** Recent actions and updates, newest first: generated / edited / published projects plus notifications (collab replies, reminders). */
function ActivityFeed() {
  const projects = useStore((s) => s.projects);
  const notices = useStore((s) => s.notices);
  type Row = { id: string; at: string; title: string; body: string; href?: string; icon: typeof Bell };
  const rows: Row[] = [
    ...projects.flatMap((p): Row[] => {
      const href = `/studio/${p.id}`;
      const out: Row[] = [{ id: `g-${p.id}`, at: p.createdAt, title: `Generated “${p.title}”`, body: `${p.type} created in Studio`, href, icon: FilePlus2 }];
      if (p.status === "Published") out.push({ id: `p-${p.id}`, at: p.updatedAt, title: `Published “${p.title}”`, body: "Live on your connected platforms", href, icon: Send });
      else if (p.updatedAt !== p.createdAt) out.push({ id: `e-${p.id}`, at: p.updatedAt, title: `Edited “${p.title}”`, body: `Status: ${p.status}`, href, icon: PenLine });
      return out;
    }),
    ...notices.map((n): Row => ({ id: n.id, at: n.at, title: n.title, body: n.body, href: n.href, icon: Bell })),
  ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 30);
  if (!rows.length) return <p className="card p-8 text-center text-sm text-muted">No activity yet. Create something in Short Videos or Videos.</p>;
  return (
    <ol className="grid gap-2" aria-label="Recent activity">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunken"><r.icon size={18} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.title}</span><span className="block truncate text-sm text-muted">{r.body}</span></span>
            <time dateTime={r.at} className="shrink-0 text-xs text-muted">{ago(r.at)}</time>
          </>
        );
        return (
          <li key={r.id}>{r.href
            ? <Link href={r.href} className="card flex items-center gap-4 px-4 py-3 transition-colors hover:bg-sunken">{inner}</Link>
            : <div className="card flex items-center gap-4 px-4 py-3">{inner}</div>}
          </li>
        );
      })}
    </ol>
  );
}

function DashboardInner() {
  const [section] = useSection(SECTIONS, "hub");
  const ready = useDemoDelay(120);
  return (
    <div className="mx-auto max-w-[1400px]">
      {!ready ? <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[280px]" />)}</div> : (
        <AnimatePresence mode="wait"><motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {section === "hub" && <Hub />}
          {section === "analytics" && <><Back title="Analytics" /><ConsentCard /><Overview /><div className="mt-10"><Audience /></div></>}
          {section === "earnings" && <><Back title="Earnings" /><ConsentCard /><Earnings /><DataSources kind="earnings" /></>}
          {section === "activity" && <><Back title="Activity" /><ActivityFeed /></>}
        </motion.div></AnimatePresence>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <Suspense><DashboardInner /></Suspense>;
}
