"use client";
import { Film, Search, Smartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Overlay } from "@/components/ui/Overlay";
import { useStore } from "@/lib/store";

export function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (h: string) => { onClose(); router.push(h); };
  return (
    <Overlay open={open} onClose={onClose} side="center" width="max-w-2xl" labelledBy="create-h">
      <div className="p-8 pt-16 md:p-12 md:pt-16">
        <h2 id="create-h" className="t-h2">What are we making?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button data-autofocus onClick={() => go("/short-videos")} className="card group p-6 text-left transition-colors hover:border-brand">
            <Smartphone className="mb-8 text-brand" /><div className="font-display text-3xl">Short</div><p className="mt-1 text-sm text-muted">Reels, Shorts, Stories, Ads · 9:16</p>
          </button>
          <button onClick={() => go("/videos")} className="card group p-6 text-left transition-colors hover:border-brand">
            <Film className="mb-8 text-accent" /><div className="font-display text-3xl">Video</div><p className="mt-1 text-sm text-muted">Podcasts, lectures, vlogs · 16:9</p>
          </button>
        </div>
      </div>
    </Overlay>
  );
}

interface Cmd { id: string; label: string; hint: string; run: () => void }
export function CommandPalette({ open, onClose, onDemo }: { open: boolean; onClose: () => void; onDemo: () => void }) {
  const router = useRouter();
  const projects = useStore((s) => s.projects);
  const { setTheme, resolvedTheme } = useTheme();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (h: string) => () => router.push(h);
    return [
      { id: "home", label: "Home", hint: "Page", run: go("/home") },
      { id: "trends", label: "Trends", hint: "Home section", run: go("/home?section=trends") },
      { id: "library", label: "Library", hint: "Home section", run: go("/home?section=library") },
      { id: "collabs", label: "Collabs", hint: "Home section", run: go("/home?section=collabs") },
      { id: "calendar", label: "Calendar", hint: "Home section", run: go("/home?section=calendar") },
      { id: "short", label: "Short Videos", hint: "Page", run: go("/short-videos") },
      { id: "videos", label: "Videos", hint: "Page", run: go("/videos") },
      { id: "studio", label: "Studio", hint: "Page", run: go("/studio") },
      { id: "dash", label: "Dashboard", hint: "Page", run: go("/dashboard") },
      { id: "earn", label: "Earnings", hint: "Dashboard section", run: go("/dashboard?section=earnings") },
      { id: "aud", label: "Audience", hint: "Dashboard section", run: go("/dashboard?section=audience") },
      { id: "prof", label: "Manage profile", hint: "Page", run: go("/profile-studio") },
      { id: "theme", label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`, hint: "Action", run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") },
      { id: "demo", label: "Open Demo Panel", hint: "Ctrl+Shift+D", run: onDemo },
      ...projects.slice(0, 8).map((p) => ({ id: p.id, label: p.title, hint: `Project · ${p.status}`, run: go(`/studio/${p.id}`) })),
    ];
  }, [router, projects, resolvedTheme, setTheme, onDemo]);
  const list = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()) || c.hint.toLowerCase().includes(q.toLowerCase()));
  const run = (c?: Cmd) => { if (!c) return; onClose(); c.run(); };

  return (
    <Overlay open={open} onClose={onClose} side="center" width="max-w-xl" title="Command palette">
      <div className="p-3 pt-14">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input data-autofocus className="input pl-10" placeholder="Search pages, projects, actions…" value={q} role="combobox" aria-expanded="true" aria-controls="cmd-list"
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === "Enter") run(list[i]);
            }} />
        </div>
        <ul id="cmd-list" role="listbox" className="mt-2 max-h-[50vh] overflow-y-auto">
          {list.map((c, n) => (
            <li key={c.id} role="option" aria-selected={n === i}>
              <button onClick={() => run(c)} onMouseEnter={() => setI(n)} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm ${n === i ? "bg-sunken" : ""}`}>
                <span>{c.label}</span><span className="text-xs text-muted">{c.hint}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="px-4 py-6 text-center text-sm text-muted">Nothing found.</li>}
        </ul>
      </div>
    </Overlay>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors ${on ? "bg-brand" : "bg-sunken"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const perms = useStore((s) => s.permissions);
  const setPerms = useStore((s) => s.setPermissions);
  const services = useStore((s) => s.services);
  const set = useStore((s) => s.set);
  const [conn, setConn] = useState({ instagram: true, youtube: true });
  const [notif, setNotif] = useState({ browser: false, sound: true });
  const toast = useStore((s) => s.toast);

  const askNotif = async (v: boolean) => {
    if (v && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    setNotif((n) => ({ ...n, browser: v }));
  };
  const Row = ({ t, d, children }: { t: string; d?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4"><div><div className="text-sm font-medium">{t}</div>{d && <div className="text-xs text-muted">{d}</div>}</div>{children}</div>
  );
  return (
    <Overlay open={open} onClose={onClose} labelledBy="set-h" width="max-w-md">
      <div className="p-8 pt-20">
        <h2 id="set-h" className="t-h2">Settings</h2>
        <h3 className="t-label mt-8 text-muted">Connections</h3>
        {(["instagram", "youtube"] as const).map((k) => (
          <Row key={k} t={k === "instagram" ? "Instagram" : "YouTube"} d={conn[k] ? "Connected (demo account)" : "Not connected"}>
            <button className="btn-ghost py-1.5" onClick={() => setConn((c) => ({ ...c, [k]: !c[k] }))}>{conn[k] ? "Disconnect" : "Connect"}</button>
          </Row>
        ))}
        <h3 className="t-label mt-8 text-muted">Data permissions</h3>
        <Row t="Earnings" d="Per-post and monthly income"><Toggle label="Earnings access" on={perms.earnings} onChange={(v) => setPerms({ earnings: v, decided: true })} /></Row>
        <Row t="Reach" d="Reach, impressions, demographics"><Toggle label="Reach access" on={perms.reach} onChange={(v) => setPerms({ reach: v, decided: true })} /></Row>
        <Row t="Audience & comments" d="Sentiment and top questions"><Toggle label="Audience access" on={perms.audience} onChange={(v) => setPerms({ audience: v, comments: v, decided: true })} /></Row>
        <h3 className="t-label mt-8 text-muted">Notifications & alarms</h3>
        <Row t="Browser notifications" d="Works while the app is open"><Toggle label="Browser notifications" on={notif.browser} onChange={askNotif} /></Row>
        <Row t="Alarm sound"><Toggle label="Alarm sound" on={notif.sound} onChange={(v) => setNotif((n) => ({ ...n, sound: v }))} /></Row>
        <Row t="Timezone" d="Stored as UTC, shown in IST"><span className="chip">Asia/Kolkata</span></Row>
        <h3 className="t-label mt-8 text-muted">Theme</h3>
        <div className="mt-3 flex gap-2">
          {["light", "dark", "system"].map((t) => (
            <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t} className={`chip px-4 py-2 text-sm capitalize ${theme === t ? "border-brand bg-brand text-brand-ink" : ""}`}>{t}</button>
          ))}
        </div>
        <h3 className="t-label mt-8 text-muted">Demo toggles</h3>
        {Object.keys(services).map((k) => (
          <Row key={k} t={`${k} service`} d={services[k] === "live" ? "Live (falls back to fixtures)" : "Demo fixtures"}>
            <Toggle label={`${k} live`} on={services[k] === "live"} onChange={(v) => set({ services: { ...services, [k]: v ? "live" : "demo" } })} />
          </Row>
        ))}
        <button className="btn-ghost mt-6 w-full" onClick={() => { useStore.getState().reset(); toast("Demo data reset"); }}>Reset demo data</button>
      </div>
    </Overlay>
  );
}
