import { NextResponse } from "next/server";
import captions from "@/fixtures/captions.json";

export const runtime = "nodejs";

type Opt = { id: string; caption: string; cta: string };
const fixture = (tone: string): Opt[] => (captions.options as Record<string, Opt[]>)[tone] ?? captions.options.witty;

export async function POST(req: Request) {
  const { tone = "witty", platform = "ig_reel", topic = "creator", text = "", style = "" } = await req.json().catch(() => ({}));
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ options: fixture(tone), source: "demo" });

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash"; // pick the current flash-tier model at build time
  const prompt = `Write 3 social captions for ${platform}. Topic: ${topic}. ${text ? `Context: ${text}.` : ""} Tone: ${tone}. ${style ? `Match this creator's style: ${style}.` : ""} Return JSON: {"options":[{"id":"1","caption":"...","cta":"..."}]}. Keep each caption under 220 characters.`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3800);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    const j = await r.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(raw);
    const options: Opt[] = (parsed.options ?? []).slice(0, 3).map((o: Opt, i: number) => ({ id: `l${i}`, caption: String(o.caption).slice(0, 220), cta: String(o.cta ?? "").slice(0, 80) }));
    if (!options.length) throw new Error("empty");
    return NextResponse.json({ options, source: "live" });
  } catch {
    return NextResponse.json({ options: fixture(tone), source: "demo" });
  } finally {
    clearTimeout(timer);
  }
}
