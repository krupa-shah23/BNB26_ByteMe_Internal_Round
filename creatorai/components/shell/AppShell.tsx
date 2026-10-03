"use client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, Film, Home, LayoutDashboard, LogOut, Plus, Scissors, Search, Settings, Smartphone, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Overlay } from "@/components/ui/Overlay";
import { nowMs, useHydrated, useStore } from "@/lib/store";
import { CommandPalette, CreateModal, SettingsPanel } from "./Panels";
import { DemoPanel } from "./DemoPanel";
import { relTime } from "@/lib/projects";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/short-videos", label: "Short Videos", icon: Smartphone },
  { href: "/videos", label: "Videos", icon: Film },
  { href: "/studio", label: "Studio", icon: Scissors },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function beep() {
  try {
    const A = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new A(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.15, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    o.start(); o.stop(c.currentTime + 0.5);
  } catch { /* audio unavailable */ }
}

/** Polls the calendar every 30 s (and when the Demo Panel moves time) for due reminders and scheduled sends. */
function useAlarms(active: boolean) {
  const first = useRef(true);
  const offset = useStore((s) => s.timeOffsetMs);
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const st = useStore.getState();
      const now = nowMs();
      for (const c of st.calendar) {
        if (c.fired) continue;
        const start = new Date(c.startsAt).getTime();
        if (c.type === "post" && c.projectId) {
          if (now >= start) {
            st.patchCal(c.id, { fired: true });
            st.patchProject(c.projectId, { status: "Published" });
            st.notify("Scheduled post published", `${c.title} (simulated publish job)`);
            st.toast("Scheduled post published", c.title);
          }
          continue;
        }
        if (c.remindMin === undefined && c.type !== "reminder") continue;
        const fireAt = start - (c.remindMin ?? 0) * 60_000;
        if (now < fireAt) continue;
        const missed = first.current && now - fireAt > 10 * 60_000;
        st.patchCal(c.id, { fired: true, missed });
        st.notify(missed ? `Missed: ${c.title}` : `⏰ ${c.title}`, missed ? "Snooze, reschedule or mark done in Calendar." : `Starts ${new Date(c.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`);
        if (!missed) {
          st.toast(`⏰ ${c.title}`, "Reminder");
          if (c.sound) beep();
          if ("Notification" in window && Notification.permission === "granted") new Notification(c.title, { body: "CreatorAi reminder" });
        }
      }
      first.current = false;
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [active, offset]);
}

function Menu({ label, button, children, align = "right" }: { label: string; button: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const d = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", d); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", d); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{button}</button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            className={clsx("absolute top-12 z-50 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft", align === "right" ? "right-0" : "left-0")}>
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const hydrated = useHydrated();
  const loggedIn = useStore((s) => s.loggedIn);
  const notices = useStore((s) => s.notices);
  const toasts = useStore((s) => s.toasts);
  const dirty = useStore((s) => s.dirty);
  const [palette, setPalette] = useState(false);
  const [create, setCreate] = useState(false);
  const [settings, setSettings] = useState(false);
  const [demo, setDemo] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const bc = useRef<BroadcastChannel | null>(null);

  useAlarms(hydrated && loggedIn);

  // auth gate
  useEffect(() => { if (hydrated && !loggedIn) router.replace("/welcome"); }, [hydrated, loggedIn, router]);

  // cross-tab logout
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    bc.current = new BroadcastChannel("creatorai-auth");
    bc.current.onmessage = (e) => { if (e.data === "logout") { useStore.setState({ loggedIn: false }); router.replace("/welcome"); } };
    return () => bc.current?.close();
  }, [router]);

  const doLogout = useCallback(() => {
    useStore.getState().logout();
    qc.clear();
    bc.current?.postMessage("logout");
    setConfirmOut(false);
    router.push("/welcome");
  }, [qc, router]);
  const requestLogout = () => (useStore.getState().dirty ? setConfirmOut(true) : doLogout());

  // shortcuts
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); setDemo((p) => !p); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (!hydrated || !loggedIn) {
    return <div className="grid min-h-screen place-items-center"><div className="skeleton h-3 w-40 rounded-full" role="status" aria-label="Loading" /></div>;
  }
  const unread = notices.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen">
      <a href="#app-main" className="sr-only z-[200] rounded-pill bg-text px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>

      {/* left rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center justify-between border-r border-line bg-bg py-5 lg:flex xl:w-60 xl:items-stretch xl:px-4">
        <div>
          <Link href="/" className="mb-8 flex items-center justify-center font-display text-2xl xl:justify-start xl:px-3" aria-label="CreatorAi">
            <span className="xl:hidden">C<span className="text-brand">A</span></span><span className="hidden xl:inline">Creator<span className="text-brand">Ai</span></span>
          </Link>
          <nav aria-label="Main" className="grid gap-1">
            {TABS.map(({ href, label, icon: Icon }) => {
              const on = isActive(path, href);
              return (
                <Link key={href} href={href} aria-current={on ? "page" : undefined} title={label}
                  className={clsx("relative flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors xl:justify-start", on ? "text-brand-ink" : "text-muted hover:bg-sunken hover:text-text")}>
                  {on && <motion.span layoutId="rail-pill" className="absolute inset-0 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                  <Icon size={20} className="relative" /><span className="relative hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={() => setCreate(true)} className="btn-primary mx-auto xl:mx-0 xl:w-full" aria-label="Create"><Plus size={18} /><span className="hidden xl:inline">Create</span></button>
      </aside>

      <div className="lg:pl-[84px] xl:pl-60">
        {/* navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md md:px-8">
          <button onClick={() => setPalette(true)} className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-pill border border-line bg-surface px-4 text-sm text-muted hover:bg-sunken md:max-w-sm md:flex-none md:basis-80" aria-label="Search (Ctrl K)">
            <Search size={16} /><span className="truncate">Search</span><kbd className="ml-auto hidden rounded border border-line px-1.5 text-[10px] md:inline">⌘K</kbd>
          </button>
          <div className="flex items-center gap-2">
            <Menu label="Notifications" button={<span className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-surface hover:bg-sunken"><Bell size={18} />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-2 px-1 text-[10px] font-bold text-brand-ink">{unread}</span>}</span>}>
              {() => (
                <div>
                  <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-sm font-semibold">Notifications</span><button className="text-xs text-brand" onClick={() => useStore.getState().markNoticesRead()}>Mark read</button></div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notices.map((n) => (<li key={n.id} className={clsx("border-b border-line px-4 py-3 text-sm last:border-0", !n.read && "bg-brand/5")}><div className="font-medium">{n.title}</div><div className="text-xs text-muted">{n.body}</div><div className="mt-1 text-[10px] text-muted">{relTime(n.at)}</div></li>))}
                  </ul>
                </div>
              )}
            </Menu>
            <ThemeToggle />
            <Menu label="Account menu" button={<span className="flex h-10 items-center gap-1 rounded-full border border-line bg-surface pl-1 pr-2 hover:bg-sunken"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-ink">A</span><ChevronDown size={14} /></span>}>
              {(close) => (
                <div className="p-2 text-sm">
                  <div className="px-3 py-2"><div className="font-medium">Aarav</div><div className="text-xs text-muted">@aarav.makes · demo creator</div></div>
                  <button role="menuitem" onClick={() => { close(); setSettings(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken"><Settings size={16} />Settings</button>
                  <button role="menuitem" onClick={() => { close(); router.push("/profile-studio"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken"><UserCircle2 size={16} />Manage profile</button>
                  <button role="menuitem" onClick={() => { close(); setDemo(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken"><span className="w-4 text-center text-xs">⌃⇧D</span>Demo Panel</button>
                </div>
              )}
            </Menu>
            <button onClick={requestLogout} className="btn-ghost h-10 py-0" aria-label="Log out"><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </header>

        <main id="app-main" className="px-4 pb-28 pt-6 md:px-8 lg:pb-16">{children}</main>
      </div>

      {/* mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {TABS.map(({ href, label, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium", on ? "text-brand" : "text-muted")}>
              <Icon size={20} />{label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
      <button onClick={() => setCreate(true)} aria-label="Create" className="fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-ink shadow-soft lg:hidden"><Plus /></button>

      <CreateModal open={create} onClose={() => setCreate(false)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} onDemo={() => setDemo(true)} />
      <SettingsPanel open={settings} onClose={() => setSettings(false)} />
      <DemoPanel open={demo} onClose={() => setDemo(false)} />

      <Overlay open={confirmOut} onClose={() => setConfirmOut(false)} side="center" width="max-w-md" labelledBy="lo-h">
        <div className="p-8 pt-14">
          <h2 id="lo-h" className="t-h2">Unsaved Studio edits</h2>
          <p className="mt-2 text-sm text-muted">Your edits autosave to the project as a new EDL version. Save before logging out?</p>
          <div className="mt-6 grid gap-2">
            <button data-autofocus className="btn-primary" onClick={() => { useStore.getState().setDirty(false); doLogout(); }}>Save &amp; log out</button>
            <button className="btn-ghost" onClick={doLogout}>Log out anyway</button>
            <button className="btn-ghost" onClick={() => setConfirmOut(false)}>Cancel</button>
          </div>
        </div>
      </Overlay>

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[150] grid w-[min(92vw,380px)] -translate-x-1/2 gap-2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className="pointer-events-auto rounded-2xl border border-line bg-text px-4 py-3 text-bg shadow-soft">
              <div className="text-sm font-medium">{t.title}</div>{t.body && <div className="text-xs opacity-70">{t.body}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
