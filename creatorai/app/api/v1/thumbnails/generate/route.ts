import { z } from "zod";
import { ApiError, body, ok, parse, withRoute } from "@/lib/server/http";
import { geminiConfig, geminiFetch } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/llm";
export const runtime = "nodejs";

const generateBody = z.strictObject({
  prompt: z.string().min(3).max(1000),
  /** headline to render on the thumbnail, optional */
  text: z.string().max(60).optional(),
  template: z.enum(["brand", "blur", "bold"]).optional(),
  aspect: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
});

const STYLE = { brand: "clean, on-brand, soft gradients", blur: "blurred cinematic background, shallow depth of field", bold: "high-contrast, saturated, punchy colours" } as const;

export const POST = withRoute(async (req) => {
  rateLimit(req, 5, 6000);
  const b = parse(generateBody, await body(req));
  const { key, model } = geminiConfig("GEMINI_IMAGE_MODEL");
  const aspect = b.aspect ?? "16:9";
  const prompt = [
    `Create a ${aspect} social media video thumbnail: ${b.prompt}.`,
    b.template ? `Style: ${STYLE[b.template]}.` : "",
    b.text ? `Render the exact headline "${b.text}" in large, legible type.` : "Do not include any text.",
  ].filter(Boolean).join(" ");

  const j = (await geminiFetch(`models/${model}:generateContent`, key, {
    timeoutMs: 60_000,
    body: { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect } } },
  })) as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }[] } }[] };

  const part = (j.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data || p.inline_data?.data);
  const mimeType = part?.inlineData?.mimeType ?? part?.inline_data?.mime_type ?? "image/png";
  const data = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!data) throw new ApiError("UPSTREAM_ERROR", 502, "Gemini returned no image (the prompt may have been blocked)");
  return ok({ image: `data:${mimeType};base64,${data}`, mimeType, model, aspect });
});
