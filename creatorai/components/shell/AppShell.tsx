"use client";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarDays, ChevronDown, ChevronsLeft, ChevronsRight, Film, Home, LayoutDashboard, LogOut, MessageCircle, Plus, Scissors, Search, Settings, Smartphone, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Overlay } from "@/components/ui/Overlay";
import { nowMs, useHydrated, useStore } from "@/lib/store";
import { CommandPalette, CreateModal, SettingsPanel } from "./Panels";
import { DemoPanel } from "./DemoPanel";
import { CalendarOverlay } from "./CalendarOverlay";
import { RubberSegment } from "@/components/ui/RubberSegment";
import { relTime } from "@/lib/projects";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/short-videos", label: "Short Videos", icon: Smartphone },
  { href: "/videos", label: "Videos", icon: Film },
  { href: "/studio", label: "Studio", icon: Scissors },
  { href: "/messages", label: "Messages", icon: MessageCircle },
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
            st.notify("Scheduled post published", `${c.title} (simulated publish job)`, { kind: "calendar" });
            st.toast("Scheduled post published", c.title);
          }
          continue;
        }
        if (c.remindMin === undefined && c.type !== "reminder") continue;
        const fireAt = start - (c.remindMin ?? 0) * 60_000;
        if (now < fireAt) continue;
        const missed = first.current && now - fireAt > 10 * 60_000;
        st.patchCal(c.id, { fired: true, missed });
        st.notify(missed ? `Missed: ${c.title}` : `⏰ ${c.title}`, missed ? "Snooze, reschedule or mark done in Calendar." : `Starts ${new Date(c.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`, { kind: "calendar" });
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

function Menu({ label, button, children, align = "right", wide = false }: { label: string; button: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; wide?: boolean }) {
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
            className={clsx("absolute top-12 z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft", wide ? "w-[min(92vw,380px)]" : "w-72", align === "right" ? "right-0" : "left-0")}>
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
  const home = path === "/" || path === "/messages";
  // pages designed to fit one screen: no page scroll on desktop
  const fit = /^\/(short-videos|videos)(\/|$)/.test(path);
  const [cal, setCal] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  useEffect(() => { try { setRailOpen(localStorage.getItem("creatorai-rail") !== "0"); } catch { /* storage unavailable */ } }, []);
  const toggleRail = () => setRailOpen((o) => { try { localStorage.setItem("creatorai-rail", o ? "0" : "1"); } catch { /* storage unavailable */ } return !o; });
  const minimal = true;
  const qc = useQueryClient();
  const hydrated = useHydrated();
  const loggedIn = useStore((s) => s.loggedIn);
  const notices = useStore((s) => s.notices);
  const messages = useStore((s) => s.messages);
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
    return <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading"><motion.div className="font-display text-3xl tracking-tight" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: [0.5, 1, 0.5], scale: 1 }} transition={{ opacity: { repeat: Infinity, duration: 1.6, ease: "easeInOut" }, scale: { duration: 0.4 } }}>Creator<span className="text-brand">Ai</span></motion.div></div>;
  }
  const unread = notices.filter((n) => !n.read).length;
  const dmUnread = Object.values(messages).reduce((n, t) => n + t.filter((m) => m.from === "them" && !m.read).length, 0);

  const homeRail = (
    <aside aria-label="Sidebar" className={clsx("fixed bottom-0 left-0 top-20 z-20 hidden flex-col justify-between border-r border-line bg-bg px-3 pb-5 pt-4 transition-[width] duration-300 lg:flex", railOpen ? "w-56" : "w-[76px]")}>
      <div>
        <nav aria-label="Sidebar" className="grid gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const on = isActive(path, href);
            return (
              <Link key={href} href={href} title={label} aria-current={on ? "page" : undefined}
                className={clsx("relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors", railOpen ? "" : "justify-center", on ? "bg-brand text-brand-ink" : "text-muted hover:bg-sunken hover:text-text")}>
                <span className="relative shrink-0"><Icon size={19} />{href === "/messages" && dmUnread > 0 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-brand-2 ring-2 ring-bg" />}</span>{railOpen && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <button onClick={toggleRail} aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={railOpen}
        className={clsx("flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-muted hover:bg-sunken hover:text-text", railOpen ? "justify-between" : "justify-center")}>
        {railOpen && <span>Collapse</span>}{railOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
      </button>
    </aside>
  );

  const minimalHeader = (
    <header className="relative z-30 mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-4 px-5 md:px-10">
      <div className="flex min-w-0 items-center">
        <Link href="/" className={clsx("mr-4 shrink-0 font-display text-[1.7rem] tracking-tight xl:mr-6", railOpen && "lg:mr-0 xl:mr-0 lg:min-w-[calc(17rem_-_2.5rem_-_max(0px,(100vw_-_1500px)/2))]")} aria-label="CreatorAi home">Creator<span className="text-brand">Ai</span></Link>
        <button onClick={() => setPalette(true)} className="glow-border flex h-10 items-center gap-2 rounded-pill px-4 text-[0.95rem] text-muted hover:text-text md:w-56 xl:w-80" aria-label="Search (Ctrl K)"><Search size={16} /><span className="hidden md:inline">Search</span></button>
      </div>
      <div className="flex items-center gap-3 xl:gap-4">
        <RubberSegment size="sm" label="Calendar" value={null} onChange={() => setCal(true)} items={[{ id: "cal", label: <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={15} /><span className="hidden md:inline">Calendar</span></span> }]} />
        <Menu label="Notifications" wide button={<span className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-sunken"><Bell size={18} />{unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand" />}</span>}>
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-sm font-semibold">Notifications</span><button className="text-xs text-brand" onClick={() => useStore.getState().markNoticesRead()}>Mark all read</button></div>
              <ul className="max-h-[420px] overflow-y-auto">
                {notices.map((n) => {
                  const Ico = n.kind === "calendar" ? CalendarDays : n.kind === "collab" ? MessageCircle : Bell;
                  const go = () => { close(); useStore.setState((s) => ({ notices: s.notices.map((x) => (x.id === n.id ? { ...x, read: true } : x)) })); if (n.kind === "calendar") setCal(true); else if (n.href) router.push(n.href); };
                  return (
                    <li key={n.id} className="border-b border-line last:border-0">
                      <button onClick={go} className={clsx("flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-sunken", !n.read && "bg-brand/5")}>
                        <span className={clsx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", n.kind === "collab" ? "bg-brand-2/25 text-brand-2" : n.kind === "calendar" ? "bg-accent/25 text-accent" : "bg-sunken text-muted")}><Ico size={15} /></span>
                        <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate font-medium">{n.title}</span>{!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}</span><span className="line-clamp-2 block text-xs text-muted">{n.body}</span><span className="mt-0.5 block text-[10px] text-muted">{relTime(n.at)}</span></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Menu>
        <ThemeToggle />
        <Menu label="Profile menu" button={<span className="flex items-center gap-2 text-[0.95rem] hover:opacity-60"><span className="hidden md:inline">Profile</span><span className="grid h-8 w-8 place-items-center rounded-full border-2 border-text text-sm font-semibold">A</span></span>}>
          {(close) => (
            <div className="p-2 text-sm">
              <div className="px-3 py-2"><div className="font-medium">Aarav</div><div className="text-xs text-muted">@aarav.makes · demo creator</div></div>
              <button role="menuitem" onClick={() => { close(); setSettings(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken"><Settings size={16} />Settings</button>
              <button role="menuitem" onClick={() => { close(); router.push("/profile-studio"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken"><UserCircle2 size={16} />Manage profile</button>
            </div>
          )}
        </Menu>
        <button onClick={requestLogout} className="flex items-center gap-2 text-[0.95rem] hover:opacity-60" aria-label="Log out"><LogOut size={16} /><span className="hidden md:inline">Logout</span></button>
      </div>
    </header>
  );

  return (
    <div className={clsx("min-h-screen", minimal && "sv-theme bg-bg text-text")}>
      <a href="#app-main" className="sr-only z-[200] rounded-pill bg-text px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>

      {/* left rail */}
      <aside className={clsx("fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center justify-between border-r border-line bg-bg py-5 lg:flex xl:w-60 xl:items-stretch xl:px-4", minimal && "!hidden")}>
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

      <div className={minimal ? "" : "lg:pl-[84px] xl:pl-60"}>
        {/* navbar */}
        {minimal ? minimalHeader : <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md md:px-8">
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
                </div>
              )}
            </Menu>
            <button onClick={requestLogout} className="btn-ghost h-10 py-0" aria-label="Log out"><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </header>}

        {homeRail}
        <main id="app-main" className={clsx("px-4 pb-28 pt-4 md:px-10 lg:pb-12 lg:transition-[padding] lg:duration-300", railOpen ? "lg:pl-[17rem]" : "lg:pl-[7rem]", home && "pt-2 lg:h-[calc(100dvh-5rem)] lg:overflow-hidden lg:pb-5", fit && "no-scrollbar lg:h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:pb-5 lg:pt-2")}>{children}</main>
      </div>

      {/* mobile bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {TABS.map(({ href, label, icon: Icon, ...rest }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium", on ? "text-brand" : "text-muted")}>
              <span className="relative"><Icon size={20} />{href === "/messages" && dmUnread > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-2" />}</span>{("short" in rest ? (rest as { short: string }).short : label.split(" ")[0])}
            </Link>
          );
        })}
      </nav>
      <button onClick={() => setCreate(true)} aria-label="Create" className="fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-ink shadow-soft lg:hidden"><Plus /></button>

      <CalendarOverlay open={cal} onClose={() => setCal(false)} />
      <CreateModal open={create} onClose={() => setCreate(false)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} onDemo={() => setDemo(true)} />
      <SettingsPanel open={settings} onClose={() => setSettings(false)} />
      <DemoPanel open={demo} onClose={() => setDemo(false)} />

      <Overlay open={confirmOut} onClose={() => setConfirmOut(false)} side="center" width="max-w-md" labelledBy="lo-h">
        <div className="p-8 pt-14">
          <h2 id="lo-h" className="t-h2">Unsaved Studio edits</h2>
          <p className="mt-2 text-sm text-muted">Your changes haven’t been saved yet. Save them before logging out?</p>
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
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 120, transition: { duration: 0.2 } }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.1, right: 0.8 }}
              onDragEnd={(_, i) => { if (i.offset.x > 90 || i.velocity.x > 500) useStore.getState().dismissToast(t.id); }}
              role="status" title="Swipe right to dismiss"
              className="pointer-events-auto relative cursor-grab touch-pan-y overflow-hidden rounded-2xl border border-line bg-text px-4 py-3 text-bg shadow-soft active:cursor-grabbing">
              <div className="text-sm font-medium">{t.title}</div>{t.body && <div className="text-xs opacity-70">{t.body}</div>}
              <motion.span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: t.ms / 1000, ease: "linear" }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
