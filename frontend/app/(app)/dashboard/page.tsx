"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import clsx from "clsx";
import analytics from "@/fixtures/analytics.json";
import audience from "@/fixtures/audience.json";
import { Badge, Count, Reveal, Skeleton, SlidingNav, useDemoDelay } from "@/components/ui/bits";
import { ThumbCard } from "@/components/studio/Tools";
import { useSection } from "@/lib/useSection";
import { fmtTime, totalDur } from "@/lib/projects";
import { useStore, type Permissions } from "@/lib/store";

const SECTIONS = ["overview", "earnings", "audience", "collabs"] as const;
type Section = (typeof SECTIONS)[number];
const NAV = [{ id: "overview", label: "Overview" }, { id: "earnings", label: "Earnings" }, { id: "audience", label: "Audience" }, { id: "collabs", label: "Collab log" }] as { id: Section; label: string }[];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const NA = <span className="text-muted" title="The platform doesn't expose this yet — shown as not available, never 0">n/a</span>;

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
      <p className="mt-1 text-sm text-muted">Exactly what will be read — switch off anything you'd rather not share. Revoke any time in Settings → Data permissions.</p>
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
  const kpis = [
    { l: "Followers", v: o.followers }, { l: "Views (30d)", v: o.views }, { l: "Engagement", v: o.engagement, d: 1, s: "%" }, { l: "Posts", v: o.posts },
    { l: "Reels", v: o.reels }, { l: "Collabs", v: o.collabs }, { l: "Gained", v: o.gained, p: "+" }, { l: "Lost", v: o.lost, p: "−" },
  ];
  const rows = analytics.content.filter((r) => net === "All" || r.platform === net);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal as="li" key={k.l} delay={i * 0.04} className="card p-5"><div className="t-label text-muted">{k.l}</div><div className="mt-3 font-display text-4xl tracking-tight"><Count to={k.v} decimals={k.d} suffix={k.s} prefix={k.p} /></div></Reveal>
        ))}
      </ul>

      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3"><h2 className="t-h2">Content</h2>
        <div role="tablist" className="flex gap-2">{(["All", "Instagram", "YouTube"] as const).map((n) => <button key={n} role="tab" aria-selected={net === n} onClick={() => setNet(n)} className={clsx("chip px-4 py-1.5", net === n && "border-brand bg-brand text-brand-ink")}>{n}</button>)}</div></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="t-label text-muted"><tr className="border-b border-line">{["Thumbnail", "Title", "Platform", "Posted", "Views", "Reach", "Likes / Comments / Shares", "Followers gained (Est.)", "Earnings", "Link"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {net !== "YouTube" && published.map((p) => (
              <motion.tr key={p.id} initial={{ opacity: 0, backgroundColor: "rgb(var(--brand) / .2)" }} animate={{ opacity: 1, backgroundColor: "rgb(var(--brand) / 0)" }} transition={{ duration: 2 }} className="border-b border-line">
                <td className="w-32 p-3"><ThumbCard hue={p.hue} frame={p.thumb?.frame ?? 0} text={p.thumb?.text ?? ""} template={p.thumb?.template ?? "brand"} badge={fmtTime(totalDur(p.timeline))} className="rounded-md" /></td>
                <td className="px-4 font-medium">{p.title} <Badge tone="brand">New</Badge></td><td className="px-4">{p.platforms.map((x) => x.startsWith("yt") ? "YouTube" : "Instagram")[0]}</td><td className="px-4">Just now</td>
                <td className="px-4">{NA}</td><td className="px-4">{NA}</td><td className="px-4">{NA}</td><td className="px-4">{NA}</td><td className="px-4">{NA}</td><td className="px-4">—</td>
              </motion.tr>
            ))}
            {rows.map((r) => (
              <FragmentRow key={r.id} r={r} open={open === r.id} toggle={() => setOpen(open === r.id ? null : r.id)} permissions={permissions} allow={(k) => setPermissions({ [k]: true, decided: true })} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Est. = follower-count delta in the window after posting minus the pre-post trend; Instagram offers no per-post attribution. Instagram has no public revenue API, so earnings there are manual/CSV.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="card p-5"><h3 className="t-label text-muted">Best times to post (IST)</h3><ul className="mt-3 grid gap-2 text-sm">{analytics.bestTimes.map((b) => <li key={b.day} className="flex justify-between"><span>{b.day}</span><b>{b.time}</b></li>)}</ul></div>
        <div className="card p-5 md:col-span-2"><h3 className="t-label text-muted">Collabs</h3><ul className="mt-3 grid gap-2 text-sm">{analytics.collabLog.slice(0, 2).map((c) => <li key={c.id} className="flex justify-between gap-4"><span>{c.what} · {c.withWhom}</span><span className="text-ok">+{c.gained}</span></li>)}</ul></div>
      </div>
    </>
  );
}

function FragmentRow({ r, open, toggle, permissions, allow }: { r: (typeof analytics.content)[number]; open: boolean; toggle: () => void; permissions: Permissions; allow: (k: "earnings" | "reach") => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-line hover:bg-sunken/60" onClick={toggle} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && toggle()} aria-expanded={open}>
        <td className="w-32 p-3"><ThumbCard hue={r.hue} frame={r.hue} text={r.title.split(" ").slice(0, 3).join(" ")} template="brand" className="rounded-md" /></td>
        <td className="max-w-[240px] px-4 font-medium">{r.title}</td><td className="px-4">{r.platform} · {r.kind}</td><td className="px-4">{new Date(r.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
        <td className="px-4 tabular-nums">{r.views.toLocaleString("en-IN")}</td>
        <td className="px-4 tabular-nums">{permissions.reach ? (r.reach ? r.reach.toLocaleString("en-IN") : NA) : <button className="chip blur-[3px]" onClick={(e) => { e.stopPropagation(); allow("reach"); }} aria-label="Allow reach access">000,000</button>}</td>
        <td className="px-4 tabular-nums">{r.likes.toLocaleString("en-IN")} / {r.comments} / {r.shares.toLocaleString("en-IN")}</td>
        <td className="px-4 tabular-nums">+{r.gained} <span className="text-xs text-muted">Est.</span></td>
        <td className="px-4 tabular-nums">{permissions.earnings ? (r.earnings ? inr(r.earnings) : NA) : <button className="chip blur-[3px]" onClick={(e) => { e.stopPropagation(); allow("earnings"); }} aria-label="Allow earnings access">₹0,000</button>}</td>
        <td className="px-4"><a href={r.link} onClick={(e) => e.stopPropagation()} className="text-brand underline">Open</a></td>
      </tr>
      <AnimatePresence>
        {open && (
          <tr><td colSpan={10} className="p-0">
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-sunken/50">
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px]">
                <div><Badge tone="brand">Creator Intelligence</Badge><p className="mt-3 font-display text-2xl leading-tight">{r.insight.headline}</p><div className="mt-5"><HeatStrip data={r.insight.heat} /><div className="mt-1 flex justify-between text-[10px] text-muted"><span>0:00</span><span>retention + shares by section</span><span>end</span></div></div></div>
                <div className="text-sm"><p className="t-label text-muted">Top topic</p><p className="mt-1">{r.insight.topTopic}</p><p className="t-label mt-4 text-muted">Next actions</p><ul className="mt-1 grid gap-1">{r.insight.nextActions.map((a) => <li key={a}>→ {a}</li>)}</ul><Link href="/?section=library" className="mt-3 inline-block text-xs text-brand underline">3 unused clips in your Library</Link></div>
              </div>
            </motion.div>
          </td></tr>
        )}
      </AnimatePresence>
    </>
  );
}

function Earnings() {
  const { permissions, setPermissions } = useStore();
  const max = Math.max(...analytics.earningsMonthly.map((m) => m.amount));
  const body = (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <h2 className="t-h2">Monthly income</h2>
        <div className="mt-6 flex h-56 items-end gap-3" role="img" aria-label="Monthly income bar chart">
          {analytics.earningsMonthly.map((m, i) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-2"><span className="text-xs tabular-nums text-muted">{inr(m.amount)}</span>
              <motion.div className="w-full rounded-t-lg bg-brand" initial={{ height: 0 }} animate={{ height: `${(m.amount / max) * 100}%` }} transition={{ delay: i * 0.07, duration: 0.7 }} /><span className="text-xs">{m.month}</span></div>
          ))}
        </div>
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
      <div className="card p-6 lg:col-span-2"><h2 className="t-label text-muted">Top questions</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{audience.faqs.map((f) => (
          <li key={f.id} className="rounded-xl border border-line p-4"><p className="text-sm font-medium">{f.q}</p><p className="mt-1 text-xs text-muted">{f.count} similar comments</p>
            <Link href="/short-videos" className="btn-ghost mt-3 w-full py-1.5 text-xs">Turn into content idea: {f.idea}</Link></li>))}</ul></div>
      <div className="card p-6 lg:col-span-3"><h2 className="t-label text-muted">Content-gap map — what they ask vs what you've posted</h2>
        <ul className="mt-4 grid gap-3">{audience.topics.map((t) => (
          <li key={t.name} className="grid items-center gap-3 text-sm sm:grid-cols-[160px_1fr_90px]"><span>{t.name}</span>
            <div className="relative h-3 overflow-hidden rounded-full bg-sunken"><motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${t.popularity}%` }} transition={{ duration: 0.8 }} /></div>
            <span className={clsx("text-xs", t.posted < 5 && "font-semibold text-warn")}>{t.posted} posts{t.posted < 5 ? " · gap" : ""}</span></li>))}</ul></div>
    </div>
  );
  return permissions.audience ? body : <Locked what="audience insights" onAllow={() => setPermissions({ audience: true, comments: true, decided: true })}>{body}</Locked>;
}

function CollabLog() {
  return (
    <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="t-label text-muted"><tr className="border-b border-line">{["What", "When", "With whom", "Platform", "Views", "Reach", "Gained / lost"].map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
      <tbody>{analytics.collabLog.map((c) => (<tr key={c.id} className="border-b border-line last:border-0"><td className="px-4 py-4 font-medium">{c.what}</td><td className="px-4">{new Date(c.when).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td className="px-4">{c.withWhom}</td><td className="px-4">{c.platform}</td><td className="px-4 tabular-nums">{c.views.toLocaleString("en-IN")}</td><td className="px-4">{c.reach ? c.reach.toLocaleString("en-IN") : NA}</td><td className="px-4"><span className="text-ok">+{c.gained}</span> / <span className="text-bad">−{c.lost}</span> <span className="text-xs text-muted">Est.</span></td></tr>))}</tbody></table></div>
  );
}

function DashboardInner() {
  const [section, setSection] = useSection(SECTIONS, "overview");
  const ready = useDemoDelay(500);
  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="t-label text-muted">Creator Intelligence</p><h1 className="t-h1 mt-2">Dashboard</h1></div>
        <div className="flex flex-wrap items-center gap-2"><select aria-label="Date range" className="chip bg-surface px-4 py-2" defaultValue="30"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
          <Link href="/profile-studio" className="btn-primary">Manage profile</Link></div>
      </Reveal>
      <ConsentCard />
      <div className="mb-8"><SlidingNav id="dash" items={NAV} value={section} onChange={setSection} /></div>
      {!ready ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div> : (
        <AnimatePresence mode="wait"><motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {section === "overview" && <Overview />}{section === "earnings" && <Earnings />}{section === "audience" && <Audience />}{section === "collabs" && <CollabLog />}
        </motion.div></AnimatePresence>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <Suspense><DashboardInner /></Suspense>;
}
