/** Client-only Banuba WebAR helpers. Everything here must be called from the browser (the SDK is imported dynamically). */
import type { Player } from "@banuba/webar";

export interface BanubaEffect { file: string; label: string; group: string }
export type Sdk = typeof import("@banuba/webar");
export interface Ctx { sdk: Sdk; player: Player }

const SDK_DIR = "/banuba/sdk/";
const MODULES = ["face_tracker", "eyes", "lips", "skin", "background"];
export const effectUrl = (file: string) => `/banuba/effects/${file}`;
export const hasToken = () => !!process.env.NEXT_PUBLIC_BANUBA_TOKEN;

export async function loadEffects(): Promise<BanubaEffect[]> {
  const r = await fetch("/banuba/effects.json");
  if (!r.ok) return [];
  return ((await r.json()) as { effects: BanubaEffect[] }).effects;
}

/** Creates a player (WebGL + wasm), loads the tracking modules and renders into `container`. */
export async function createPlayer(container: HTMLElement): Promise<Ctx> {
  const clientToken = process.env.NEXT_PUBLIC_BANUBA_TOKEN;
  if (!clientToken) throw new Error("NEXT_PUBLIC_BANUBA_TOKEN is not set");
  const sdk = await import("@banuba/webar");
  if (!sdk.isBrowserSupported()) throw new Error("This browser does not support WebGL 2");
  const player = await sdk.Player.create({ clientToken, locateFile: (f: string) => SDK_DIR + f });
  await player.addModule(...MODULES.map((m) => new sdk.Module(`${SDK_DIR}modules/${m}.zip`)));
  sdk.Dom.render(player, container);
  return { sdk, player };
}

export async function destroyPlayer(ctx: Ctx | null, container: HTMLElement | null) {
  if (!ctx) return;
  try { if (container) ctx.sdk.Dom.unmount(container); } catch { /* already gone */ }
  try { await ctx.player.destroy(); } catch { /* already gone */ }
}

/** Trim as a media fragment, so the preview and the export both play only the kept range. */
export const clipUrl = (src: string, from: number, to: number) => `${src}#t=${from.toFixed(2)},${to.toFixed(2)}`;

export async function setEffect(ctx: Ctx, file: string | null) {
  if (!file) { await ctx.player.clearEffect(); return; }
  await ctx.player.applyEffect(new ctx.sdk.Effect(effectUrl(file)));
}

/** Plays the (trimmed) video through the chosen effect off-screen and records the result in real time. */
export async function renderFiltered(src: string, from: number, to: number, file: string, onProgress?: (p: number) => void): Promise<Blob> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:640px;height:360px;opacity:0;pointer-events:none";
  document.body.appendChild(host);
  let ctx: Ctx | null = null;
  try {
    ctx = await createPlayer(host);
    await setEffect(ctx, file);
    ctx.player.use(new ctx.sdk.Video(clipUrl(src, from, to), { loop: false }));
    const mimeType = ["video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new ctx.sdk.VideoRecorder(ctx.player, { mimeType });
    ctx.player.play();
    rec.start();
    const ms = Math.max(1, to - from) * 1000;
    const t0 = performance.now();
    await new Promise<void>((res) => { const id = setInterval(() => { const p = (performance.now() - t0) / ms; onProgress?.(Math.min(1, p)); if (p >= 1) { clearInterval(id); res(); } }, 250); });
    return await rec.stop();
  } finally {
    await destroyPlayer(ctx, host);
    host.remove();
  }
}
