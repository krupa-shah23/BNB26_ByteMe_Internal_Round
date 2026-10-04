export function FlowCard({ eyebrow, steps, footer }: { eyebrow: string; steps: { title: string; sub?: string }[]; footer: string }) {
  return (
    <aside className="flex min-h-0 flex-col rounded-[28px] border border-text/10 bg-surface/60 p-6 md:p-7">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{eyebrow}</div>
      <ol className="my-5 flex flex-1 flex-col justify-between gap-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4">
            <span className="font-display text-sm tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="font-display text-xl leading-tight tracking-tight">{s.title}</div>
              {s.sub && <div className="mt-0.5 text-sm text-muted">{s.sub}</div>}
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-text/10 pt-4 text-sm text-muted">{footer}</p>
    </aside>
  );
}
