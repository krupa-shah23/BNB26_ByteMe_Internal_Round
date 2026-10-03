import type { Msg } from "./types";

/** Local stand-in for a DM backend: seeded inbound threads and canned replies. BACKEND-SLOT(messages): GET/POST /api/v1/messages. */
const min = 60_000;
export function seedMessages(): Record<string, Msg[]> {
  const ago = (m: number) => new Date(Date.now() - m * min).toISOString();
  return {
    c3: [{ id: "m_c3_1", from: "them", text: "Hey Aarav! Loved your pitch reel. Want to do a joint video on startup life?", at: ago(22) }],
    c7: [
      { id: "m_c7_1", from: "me", text: "Hi! Big fan of your edits. Open to a collab?", at: ago(300), read: true },
      { id: "m_c7_2", from: "them", text: "Yes! Are you free for a collab shoot next week?", at: ago(180) },
    ],
  };
}

export const OPENER = "Hey! Loved your content. I think our audiences overlap a lot. Want to collaborate on something?";
const REPLIES = [
  "That sounds great! Let's do it. When are you free?",
  "Love the idea. I can do Thursday evening, does that work?",
  "Perfect. I'll send over a rough outline tomorrow.",
];
export const replyFor = (n: number) => REPLIES[Math.min(n, REPLIES.length - 1)];

export type Tick = "sent" | "delivered" | "read";
/** One tick = sent, two ticks = delivered, two blue ticks = read. Derived from message age so it survives a reload. */
export function tickOf(m: Msg, now: number): Tick {
  const age = now - new Date(m.at).getTime();
  return age < 1500 ? "sent" : age < 4000 ? "delivered" : "read";
}
