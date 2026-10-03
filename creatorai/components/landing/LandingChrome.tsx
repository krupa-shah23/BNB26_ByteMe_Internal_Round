"use client";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight, Check, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/Overlay";
import { Marquee } from "@/components/ui/Marquee";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { leadSchema, type Lead } from "@/lib/types";
import { useStore } from "@/lib/store";

export const NAV = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#platforms", label: "Platforms" },
  { href: "#demo", label: "Demo" },
];

const MESSAGES = ["Bit N Build 2026 · CreatorAi demo is live", "Idea → Script → Edit → Publish, one workspace", "AI edits you can actually change"];

export function Banner({ onEnter }: { onEnter: () => void }) {
  return (
    <a href="/" onClick={(e) => { e.preventDefault(); onEnter(); }} className="block border-b border-line bg-text py-2 text-bg" aria-label="Open the CreatorAi demo">
      <Marquee duration={32} gap="gap-14" label="Announcements">
        {MESSAGES.map((m) => (
          <span key={m} className="t-label flex items-center gap-14 whitespace-nowrap">
            {m}<span aria-hidden="true">✦</span>
          </span>
        ))}
        {MESSAGES.map((m) => (
          <span key={m + "2"} className="t-label flex items-center gap-14 whitespace-nowrap">
            {m}<span aria-hidden="true">✦</span>
          </span>
        ))}
      </Marquee>
    </a>
  );
}

export function SiteHeader({ onEnter, onReach }: { onEnter: () => void; onReach: () => void }) {
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160);
  });
  return (
    <>
      <motion.header animate={{ y: hidden ? "-100%" : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 md:px-10">
          <Link href="/welcome" className="font-display text-2xl tracking-tight" aria-label="CreatorAi home">
            Creator<span className="text-brand">Ai</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (<a key={n.href} href={n.href} className="text-sm text-muted transition-colors hover:text-text">{n.label}</a>))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={onReach} className="btn-ghost hidden md:inline-flex">Reach out</button>
            <button onClick={onEnter} className="btn-primary hidden md:inline-flex">Continue as demo creator <ArrowUpRight size={16} /></button>
            <button onClick={() => setMenu(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full border border-line md:hidden"><Menu size={18} /></button>
          </div>
        </div>
      </motion.header>
      <Overlay open={menu} onClose={() => setMenu(false)} side="left" full title="Menu">
        <div className="flex min-h-full flex-col justify-between p-8 pt-24">
          <nav aria-label="Mobile" className="grid gap-2">
            {NAV.map((n, i) => (
              <motion.a key={n.href} href={n.href} onClick={() => setMenu(false)} className="t-h1 block"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07 }}>{n.label}</motion.a>
            ))}
          </nav>
          <div className="grid gap-3">
            <button onClick={() => { setMenu(false); onEnter(); }} className="btn-primary">Continue as demo creator</button>
            <button onClick={() => { setMenu(false); onReach(); }} className="btn-ghost">Reach out</button>
          </div>
        </div>
      </Overlay>
    </>
  );
}

const WORKFLOWS = ["Notes app chaos + 14 browser tabs", "I edit at 3 AM and pray", "A Notion board nobody follows", "Spreadsheet wizard", "I just post and vibe"];
const HEARD = ["A friend", "Instagram", "YouTube", "A hackathon", "Search", "Other"];
const empty: Partial<Lead> = { platforms: [], heard: "", website: "" };

export function ReachOut({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addLead = useStore((s) => s.addLead);
  const [v, setV] = useState<Partial<Lead>>(empty);
  const [err, setErr] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  useEffect(() => { if (open) { setState("idle"); setErr({}); } }, [open]);
  const set = <K extends keyof Lead>(k: K, val: Lead[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = leadSchema.safeParse(v);
    if (!r.success) {
      const m: Record<string, string> = {};
      r.error.issues.forEach((i) => { const k = String(i.path[0]); if (!m[k]) m[k] = i.message; });
      setErr(m);
      document.querySelector<HTMLElement>("[data-err='true']")?.focus();
      return;
    }
    setErr({}); setState("sending");
    if (v.website) { setState("done"); return; } // honeypot tripped: pretend success, store nothing
    setTimeout(() => { addLead(r.data); setState("done"); setV(empty); }, 1300);
  };

  const field = (k: keyof Lead, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="t-label mb-2 block text-muted">{label}</label>
      <input id={`f-${k}`} className="input" data-err={!!err[k]} aria-invalid={!!err[k]} aria-describedby={err[k] ? `e-${k}` : undefined}
        value={(v[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} {...props} />
      {err[k] && <p id={`e-${k}`} role="alert" className="mt-1 text-xs text-bad">{err[k]}</p>}
    </div>
  );
  const radio = (k: "creating" | "team" | "soon", opts: string[]) => (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button type="button" key={o} role="radio" aria-checked={v[k] === o} onClick={() => set(k, o as never)}
          className={`chip px-4 py-2 text-sm ${v[k] === o ? "border-brand bg-brand text-brand-ink" : "hover:bg-sunken"}`}>{o}</button>
      ))}
    </div>
  );

  return (
    <Overlay open={open} onClose={onClose} labelledBy="reach-title" width="max-w-2xl">
      <div className="px-6 pb-16 pt-20 md:px-12">
        <AnimatePresence mode="wait">
          {state === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid min-h-[60vh] place-content-center gap-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-ok text-bg"><Check size={36} /></motion.div>
              <h2 id="reach-title" className="t-h1">Got it. We'll be in touch.</h2>
              <p className="mx-auto max-w-sm text-muted">This is a demo — your answers are stored only in this browser. Try the product in the meantime.</p>
              <button onClick={onClose} className="btn-primary mx-auto">Back to the site</button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} noValidate className="grid gap-7" exit={{ opacity: 0 }}>
              <h2 id="reach-title" className="t-h1">How can we help?</h2>
              <div className="grid gap-5 sm:grid-cols-2">{field("first", "First name", { autoComplete: "given-name" })}{field("last", "Last name", { autoComplete: "family-name" })}</div>
              {field("email", "Email", { type: "email", autoComplete: "email" })}
              {field("handle", "Your handle", { placeholder: "@yourname" })}
              <fieldset>
                <legend className="t-label mb-2 text-muted">Platforms</legend>
                <div className="flex flex-wrap gap-2">
                  {["Instagram", "YouTube", "LinkedIn", "X"].map((p) => {
                    const on = v.platforms?.includes(p);
                    return (
                      <button type="button" key={p} aria-pressed={!!on} onClick={() => set("platforms", on ? v.platforms!.filter((x) => x !== p) : [...(v.platforms ?? []), p])}
                        className={`chip px-4 py-2 text-sm ${on ? "border-brand bg-brand text-brand-ink" : "hover:bg-sunken"}`}>{on && <Check size={14} />}{p}</button>
                    );
                  })}
                </div>
                {err.platforms && <p role="alert" className="mt-1 text-xs text-bad">{err.platforms}</p>}
              </fieldset>
              <fieldset><legend className="t-label mb-2 text-muted">What are you creating?</legend>{radio("creating", ["Shorts/Reels", "Long-form", "Both"])}{err.creating && <p role="alert" className="mt-1 text-xs text-bad">{err.creating}</p>}</fieldset>
              <fieldset>
                <legend className="t-label mb-2 text-muted">Tell us about your workflow</legend>
                <div role="radiogroup" className="grid gap-2">
                  {WORKFLOWS.map((w) => (
                    <label key={w} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${v.workflow === w ? "border-brand bg-brand/10" : "border-line hover:bg-sunken"}`}>
                      <input type="radio" name="workflow" className="accent-[rgb(var(--brand))]" checked={v.workflow === w} onChange={() => set("workflow", w)} />{w}
                    </label>
                  ))}
                </div>
                {err.workflow && <p role="alert" className="mt-1 text-xs text-bad">{err.workflow}</p>}
              </fieldset>
              <fieldset><legend className="t-label mb-2 text-muted">Team size</legend>{radio("team", ["Solo", "2-5", "6+"])}{err.team && <p role="alert" className="mt-1 text-xs text-bad">{err.team}</p>}</fieldset>
              <fieldset><legend className="t-label mb-2 text-muted">How soon do you want to start?</legend>{radio("soon", ["Yesterday", "In a few weeks", "Just exploring"])}{err.soon && <p role="alert" className="mt-1 text-xs text-bad">{err.soon}</p>}</fieldset>
              <div>
                <label htmlFor="f-heard" className="t-label mb-2 block text-muted">How did you hear about us?</label>
                <select id="f-heard" className="input" value={v.heard} data-err={!!err.heard} onChange={(e) => set("heard", e.target.value)}>
                  <option value="">Choose…</option>{HEARD.map((h) => <option key={h}>{h}</option>)}
                </select>
                {err.heard && <p role="alert" className="mt-1 text-xs text-bad">{err.heard}</p>}
                <AnimatePresence>
                  {v.heard === "Other" && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-3">
                      <label htmlFor="f-heardOther" className="sr-only">Other source</label>
                      <input id="f-heardOther" className="input" placeholder="Where did you hear about us?" data-err={!!err.heardOther} value={v.heardOther ?? ""} onChange={(e) => set("heardOther", e.target.value)} />
                      {err.heardOther && <p role="alert" className="mt-1 text-xs text-bad">{err.heardOther}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* honeypot: hidden from humans and assistive tech */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Website<input tabIndex={-1} autoComplete="off" value={v.website ?? ""} onChange={(e) => set("website", e.target.value)} /></label>
              </div>
              <button type="submit" disabled={state === "sending"} className="btn-primary h-14 text-base">
                {state === "sending" ? (<><motion.span className="h-4 w-4 rounded-full border-2 border-bg border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />Sending…</>) : "Send it"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </Overlay>
  );
}

export function SiteFooter() {
  const addNewsletter = useStore((s) => s.addNewsletter);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "bad" | "ok">("idle");
  const sub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("bad");
    addNewsletter(email); setState("ok"); setEmail("");
  };
  const social = ["Instagram", "YouTube", "LinkedIn", "X"];
  return (
    <footer className="relative overflow-hidden bg-text text-bg">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 py-20 md:grid-cols-12 md:px-10">
        <div className="md:col-span-6">
          <p className="t-label opacity-60">Say hello</p>
          <a href="mailto:hello@creatorai.demo" className="t-h1 mt-3 inline-block underline decoration-1 underline-offset-8 hover:text-brand">hello@creatorai.demo</a>
          <ul className="mt-10 flex gap-3">
            {social.map((s) => (
              <li key={s}><a href="#" aria-label={s} className="grid h-11 w-11 place-items-center rounded-full border border-bg/30 text-xs font-semibold transition-colors hover:bg-bg hover:text-text">{s.slice(0, 2)}</a></li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-6">
          <form onSubmit={sub} noValidate>
            <label htmlFor="nl" className="t-label opacity-60">Newsletter — one email a month</label>
            {state === "ok" ? (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="mt-3 flex items-center gap-2 text-xl"><Check size={20} /> You're on the list.</motion.p>
            ) : (
              <div className="mt-3 flex gap-2">
                <input id="nl" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} placeholder="you@email.com"
                  aria-invalid={state === "bad"} className="w-full rounded-pill border border-bg/30 bg-transparent px-5 py-3 text-bg placeholder:text-bg/50 focus:border-bg" />
                <button className="rounded-pill bg-bg px-6 text-sm font-medium text-text hover:opacity-90">Subscribe</button>
              </div>
            )}
            {state === "bad" && <p role="alert" className="mt-2 text-sm">Please enter a valid email.</p>}
          </form>
          <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="t-label mb-3 opacity-60">Legal</p>
              <ul className="grid gap-2">{["Privacy", "Terms", "Accessibility", "Cookie Preferences"].map((l) => <li key={l}><a href="#" className="hover:underline">{l}</a></li>)}</ul>
            </div>
            <div>
              <p className="t-label mb-3 opacity-60">Read this site</p>
              <ul className="grid gap-2"><li><Link href="/welcome" className="hover:underline">For humans</Link></li><li><a href="/llms.txt" className="hover:underline">For robots</a></li></ul>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-bg/20">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 text-xs opacity-70 md:px-10">
          <span>© 2026 CreatorAi · Bit N Build demo. Fictional creators and data.</span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="hover:underline">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
