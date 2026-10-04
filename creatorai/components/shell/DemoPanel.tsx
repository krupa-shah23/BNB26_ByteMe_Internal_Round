"use client";
import { useRouter } from "next/navigation";
import { Overlay } from "@/components/ui/Overlay";
import { groups } from "@/lib/match";
import { useStore } from "@/lib/store";

/** Ctrl+Shift+D — force a group, reset data, slow network, fast-forward time. */
export function DemoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { forceGroup, slowNetwork, timeOffsetMs, set, toast, projects } = useStore();
  const reelProject = projects.find((p) => p.groupId === "photo-reel");
  return (
    <Overlay open={open} onClose={onClose} labelledBy="demo-h" width="max-w-md">
      <div className="p-8 pt-20">
        <h2 id="demo-h" className="t-h2">Demo Panel</h2>
        <p className="mt-2 text-sm text-muted">Rehearsal controls. Ctrl+Shift+D toggles this drawer.</p>

        <h3 className="t-label mt-8 text-muted">Force a group (next sample upload)</h3>
        <div className="mt-3 grid gap-2">
          {groups.map((g) => (
            <button key={g.id} onClick={() => { set({ forceGroup: forceGroup === g.id ? undefined : g.id }); toast(`Forced ${g.id.toUpperCase()}`, g.title); }}
              aria-pressed={forceGroup === g.id} className={`rounded-xl border px-4 py-3 text-left text-sm ${forceGroup === g.id ? "border-brand bg-brand/10" : "border-line hover:bg-sunken"}`}>
              <b>{g.id.toUpperCase()}</b> · {g.title} <span className="text-muted">({g.format}{g.kind === "photo-reel" ? `, ${g.inputs.length} photos` : ""})</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => { onClose(); router.push("/short-videos"); }}>Go to Short Videos</button>
          <button className="btn-ghost flex-1" onClick={() => { onClose(); router.push("/videos"); }}>Go to Videos</button>
        </div>

        <h3 className="t-label mt-8 text-muted">Photo dump → reel</h3>
        <div className="mt-3 grid gap-2">
          <button className="btn-ghost" disabled={!reelProject} onClick={() => { if (!reelProject) return; onClose(); router.push(`/studio/${reelProject.id}`); }}>{reelProject ? "Open the generated reel in Studio" : "Open in Studio (generate it first)"}</button>
          <button className="btn-ghost" onClick={() => { set({ projects: projects.filter((p) => p.groupId !== "photo-reel"), assets: useStore.getState().assets.filter((a) => a.groupId !== "photo-reel"), forceGroup: undefined }); toast("Photo reel reset", "Upload the 18 photos again to re-run it"); }}>Reset this scenario only</button>
        </div>

        <h3 className="t-label mt-8 text-muted">Network</h3>
        <label className="mt-3 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">Slow network (×2.5 job time)
          <input type="checkbox" checked={slowNetwork} onChange={(e) => set({ slowNetwork: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--brand))]" /></label>

        <h3 className="t-label mt-8 text-muted">Time travel</h3>
        <p className="mt-1 text-xs text-muted">Offset now: {(timeOffsetMs / 3_600_000).toFixed(1)} h, triggers calendar alarms.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["+1 h", 3_600_000], ["+1 day", 86_400_000], ["+3 days", 3 * 86_400_000]].map(([l, ms]) => (
            <button key={l as string} className="btn-ghost py-2" onClick={() => { set({ timeOffsetMs: timeOffsetMs + (ms as number) }); toast("Time fast-forwarded", l as string); }}>{l as string}</button>
          ))}
          <button className="btn-ghost py-2" onClick={() => set({ timeOffsetMs: 0 })}>Real time</button>
        </div>

        <h3 className="t-label mt-8 text-muted">Export note</h3>
        <p className="mt-1 text-sm text-muted">Studio export returns the group's pre-baked MP4 (or a staged render job). Nothing is rendered on stage. For the photo reel, a trimmed export returns the full pre-baked file.</p>

        <button className="btn-primary mt-8 w-full" onClick={() => { useStore.getState().reset(); toast("Seed restored", "Projects, calendar and permissions reset"); onClose(); router.push("/home"); }}>Reset to seed state</button>
      </div>
    </Overlay>
  );
}
