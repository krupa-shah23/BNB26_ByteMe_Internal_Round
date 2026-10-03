import type { ReactNode } from "react";

/** Decorative tiles in the cream / green / lime / teal / tan palette. Colours are fixed on purpose so the set looks the same in both themes. */
const INK = "#0E1A17", GREEN = "#0B5D4F", LIME = "#D9E56B", TEAL = "#B5D9D6", TAN = "#A89B6B", CREAM = "#F8F5EE";

export type GlyphName = "reels" | "shorts" | "stories" | "ads" | "upload" | "diamond" | "sketch" | "orb" | "podcast" | "lecture" | "vlog" | "other";

export function Glyph({ name, size = 72, className }: { name: GlyphName; size?: number; className?: string }) {
  const shapes: Record<GlyphName, ReactNode> = {
    reels: (<><rect x="8" y="8" width="64" height="64" rx="14" fill={INK} /><circle cx="24" cy="24" r="4" fill={TEAL} /><circle cx="56" cy="24" r="4" fill={LIME} /><circle cx="24" cy="56" r="4" fill={TAN} /><circle cx="56" cy="56" r="4" fill={GREEN} /></>),
    shorts: (<><path d="M40 10 70 26 40 42 10 26Z" fill={LIME} /><path d="M10 26v10l30 16 30-16V26L40 42Z" fill={CREAM} /><path d="M10 38v8l30 16 30-16v-8L40 54Z" fill={INK} /></>),
    stories: (<g transform="rotate(-8 40 40)"><rect x="8" y="12" width="64" height="56" rx="12" fill={TEAL} /><circle cx="40" cy="40" r="15" fill="none" stroke={GREEN} strokeWidth="4" /><circle cx="58" cy="22" r="7" fill={LIME} /></g>),
    ads: (<><rect x="10" y="10" width="60" height="60" rx="14" transform="rotate(45 40 40)" fill={GREEN} /><path d="M40 20v40M20 40h40M26 26l28 28M54 26 26 54" stroke={LIME} strokeWidth="1.8" strokeLinecap="round" /></>),
    upload: (<><rect x="8" y="8" width="64" height="64" rx="18" fill={TAN} /><path d="M40 54V28m0 0-12 12m12-12 12 12" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>),
    diamond: (<><path d="M40 6 74 40 40 74 6 40Z" fill={LIME} /><path d="M40 22v36M22 40h36" stroke={GREEN} strokeWidth="3" strokeLinecap="round" /></>),
    sketch: (<><rect x="6" y="6" width="68" height="68" rx="20" fill={TAN} /><path d="M18 50c10-30 14-6 20-16s10 14 24-8M22 58c14-6 24 4 38-6" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" /></>),
    podcast: (<><rect x="8" y="8" width="64" height="64" rx="18" fill={INK} /><rect x="32" y="16" width="16" height="30" rx="8" fill={LIME} /><path d="M24 40a16 16 0 0 0 32 0M40 56v8M32 64h16" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round" fill="none" /></>),
    lecture: (<><rect x="8" y="14" width="64" height="44" rx="8" fill={GREEN} /><path d="M18 28h28M18 38h38M18 48h20" stroke={CREAM} strokeWidth="3" strokeLinecap="round" /><path d="M30 58 22 70M50 58l8 12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" /><circle cx="58" cy="26" r="5" fill={LIME} /></>),
    vlog: (<g transform="rotate(6 40 40)"><rect x="8" y="16" width="46" height="48" rx="12" fill={TEAL} /><path d="M54 32 74 22v36L54 48Z" fill={TAN} /><circle cx="26" cy="40" r="9" fill="none" stroke={GREEN} strokeWidth="4" /><circle cx="44" cy="26" r="4" fill={LIME} /></g>),
    other: (<><path d="M40 8 70 24v32L40 72 10 56V24Z" fill={LIME} /><path d="M10 24 40 40 70 24M40 40v32" stroke={GREEN} strokeWidth="3" strokeLinejoin="round" fill="none" /><circle cx="40" cy="40" r="5" fill={INK} /></>),
    orb: (<><circle cx="40" cy="40" r="26" fill={GREEN} /><circle cx="52" cy="32" r="9" fill={LIME} /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 80 80" className={className} aria-hidden="true">{shapes[name]}</svg>;
}
