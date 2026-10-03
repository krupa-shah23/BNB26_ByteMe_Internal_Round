import { z } from "zod";
import captions from "@/fixtures/captions.json";
import scripts from "@/fixtures/scripts.json";
import home from "@/fixtures/home.json";
import { captionsBody, hooksBody, scriptBody, ideasBody, bioBody, captionOut, hooksOut, scriptOut, ideasOut, bioOut } from "@/lib/schemas/ai";
import { generateJson, clip, tidyTags } from "./llm";

type In<S extends z.ZodType> = z.infer<S>;
const lang = (l?: string) => (l === "hinglish" ? " Write in Hinglish (Hindi in Latin script mixed with English)." : "");
const CAPTION_LIMIT: Record<string, number> = { x: 260, linkedin: 600 };
const DEFAULT_TAGS = ["#creator", "#reels", "#shorts"];

type Opt = { id: string; caption: string; cta: string };
const captionFixture = (tone: string): Opt[] => (captions.options as Record<string, Opt[]>)[tone] ?? captions.options.witty;

export function suggestCaptions(i: In<typeof captionsBody>, tags: string[] = []) {
  const limit = CAPTION_LIMIT[i.platform] ?? 220;
  const fallbackTags = tidyTags(tags.length ? tags : DEFAULT_TAGS);
  const language = i.language ?? (i.tone === "Hinglish" ? "hinglish" : "en");
  return generateJson({
    route: "captions", input: i, schema: captionOut,
    prompt: `Write 3 social captions for ${i.platform}. Topic: ${i.topic}. ${i.text ? `Context: ${i.text}.` : ""} Tone: ${i.tone}.${lang(language)} Return JSON: {"options":[{"id":"1","caption":"...","cta":"...","hashtags":["#a"]}]}. Each caption under ${limit} characters.`,
    shape: (o) => o.options.slice(0, 3).map((x, n) => ({ id: `l${n}`, caption: clip(x.caption, limit), cta: clip(x.cta, 80), hashtags: tidyTags(x.hashtags.length ? x.hashtags : fallbackTags) })),
    fixture: () => captionFixture(i.tone).map((o) => ({ ...o, hashtags: fallbackTags })),
  }).then((r) => ({ options: r.data, language, source: r.source }));
}

export function generateHooks(i: In<typeof hooksBody>) {
  return generateJson({
    route: "hooks", input: i, schema: hooksOut,
    prompt: `Write ${i.count} scroll-stopping opening hooks (under 100 characters each) for a short video about: ${i.topic}. Tone: ${i.tone}.${lang(i.language)} Return JSON: {"hooks":["..."]}`,
    shape: (o) => o.hooks.slice(0, i.count).map((h) => clip(h, 100)),
    fixture: () => {
      const line = (n: string) => `${n}: ${i.topic}`;
      return [line("Nobody tells you this about"), line("I tried it so you don't have to"), line("The mistake everyone makes with"), line("Stop scrolling, this changes"), line("3 things I wish I knew about")].slice(0, i.count);
    },
  }).then((r) => ({ hooks: r.data, source: r.source }));
}

export function generateScript(i: In<typeof scriptBody>) {
  const lines = (scripts as Record<string, string[]>)[i.groupId ?? "_default"] ?? scripts._default;
  return generateJson({
    route: "script", input: i, schema: scriptOut,
    prompt: `Write a ${i.lengthSec}-second video script about: ${i.topic}. Tone: ${i.tone}. One spoken line per array item, 4 to 8 lines. Return JSON: {"lines":["..."]}`,
    shape: (o) => o.lines.slice(0, 12).map((l) => clip(l, 200)),
    fixture: () => lines,
  }).then((r) => ({ lines: r.data, source: r.source }));
}

export function trendIdeas(i: In<typeof ideasBody>) {
  const kinds = { meme: "meme concepts", reel: "Reel concepts", hook: "hooks", format: "video formats", story: "story ideas" };
  return generateJson({
    route: "ideas", input: i, schema: ideasOut,
    prompt: `Give ${i.count} ${kinds[i.kind]} for a creator in the niche: ${i.niche}. Return JSON: {"ideas":[{"title":"...","why":"..."}]}`,
    shape: (o) => o.ideas.slice(0, i.count).map((x) => ({ title: clip(x.title, 120), why: clip(x.why, 160) })),
    fixture: () => home.ideas.slice(0, i.count).map((x) => ({ title: x.title, why: x.why })),
  }).then((r) => ({ ideas: r.data, kind: i.kind, source: r.source }));
}

export function writeBio(i: In<typeof bioBody>) {
  const handle = i.handle ?? "@you";
  return generateJson({
    route: "bio", input: i, schema: bioOut,
    prompt: `Write 3 Instagram bios (each under 150 characters) for a ${i.niche} creator ${handle}. Tone: ${i.tone}.${lang(i.language)} Return JSON: {"bios":["..."]}`,
    shape: (o) => o.bios.slice(0, 3).map((b) => clip(b, 150)),
    fixture: () => [`${i.niche}, made simple. New posts every week.`, `Building in public: ${i.niche}. Follow along.`, `${handle} | ${i.niche} | Learning out loud`],
  }).then((r) => ({ bios: r.data, source: r.source }));
}
