import { z } from "zod";
import { ApiError, body, ok, parse, withRoute } from "@/lib/server/http";
import { generateContent } from "@/lib/server/gemini";
import { rateLimit } from "@/lib/server/llm";
export const runtime = "nodejs";

const chatBody = z.strictObject({
  messages: z.array(z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) })).min(1).max(40),
  system: z.string().max(2000).optional(),
});

export const POST = withRoute(async (req) => {
  rateLimit(req);
  const b = parse(chatBody, await body(req));
  if (b.messages[b.messages.length - 1].role !== "user") throw new ApiError("VALIDATION_FAILED", 400, "The last message must be from the user");
  const { json, model } = await generateContent({
    ...(b.system ? { systemInstruction: { parts: [{ text: b.system }] } } : {}),
    contents: b.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
  }, 30_000);
  const j = json as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const reply = (j.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
  if (!reply) throw new ApiError("UPSTREAM_ERROR", 502, "Gemini returned no reply");
  return ok({ reply, model });
});
