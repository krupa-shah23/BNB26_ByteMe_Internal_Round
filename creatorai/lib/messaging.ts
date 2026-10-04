import type { Msg } from "./types";

/**
 * Local stand-in for a DM backend. Every contact has their own reason for writing and a short scripted conversation:
 * an opening message, then rounds where the creator picks a reply and the other person answers *that* reply.
 * BACKEND-SLOT(messages): GET/POST /api/v1/messages.
 */
const min = 60_000;

export interface Option { text: string; reply: string }
export interface Script {
  /** what they write first (seeded threads), or their greeting back after your opener (generic threads) */
  opening: string;
  /** the short line shown in the inbox list while their opening is unanswered */
  preview: string;
  /** rounds of reply options; each reply is the other person's answer to that option */
  turns: Option[][];
  closing: string;
  /** why they are writing, shown under their name */
  topic: string;
}

/** Turning something down. Appended to the first round for every contact. */
const DECLINES: Option[] = [
  { text: "Thanks for thinking of me, but I’ll have to pass this time.", reply: "No worries at all, thanks for letting me know. Maybe another time!" },
  { text: "I appreciate the offer, but I’m not taking on anything new right now.", reply: "Totally understand. Good luck with everything, and let’s stay in touch." },
  { text: "Thanks for reaching out. It’s not quite the right fit for my content at the moment.", reply: "That’s fair, thanks for being upfront. Maybe we’ll find something that fits later." },
];

export const SCRIPTS: Record<string, Script> = {
  c25: {
    topic: "Creator collaboration",
    opening: "Hey! I’ve been seeing your recent videos and I think our audiences overlap quite a bit. Would you be interested in doing a joint Reel?",
    preview: "Would you be interested in doing a joint Reel?",
    turns: [
      [
        { text: "Definitely. What did you have in mind?", reply: "I was thinking of a short Q&A-style Reel where we each answer the questions our followers ask the most. Nothing too scripted." },
        { text: "I’d be open to that. Want to brainstorm a concept?", reply: "Yes please! I’ll send over three rough ideas tonight and we can pick one." },
        { text: "Sure! What kind of Reel were you thinking?", reply: "Something casual: a “things we both recommend” format, about 30 seconds." },
      ],
      [
        { text: "I’m free Thursday evening. Would that work?", reply: "Thursday works for me! How about 6:30 pm? We could meet at the studio and shoot for about an hour." },
        { text: "Could we do a quick call first?", reply: "Absolutely. I’ll send you a call invite for tomorrow afternoon so we can run through the idea and timeline." },
        { text: "I can do this weekend. What time works for you?", reply: "Saturday afternoon works. Around 3 pm?" },
      ],
    ],
    closing: "Perfect, see you then!",
  },
  c27: {
    topic: "Brand campaign",
    opening: "Hi! I’m working on a small creator campaign for a skincare brand and thought your content would be a great fit. Can I send you the brief?",
    preview: "Can I send you the campaign brief?",
    turns: [
      [
        { text: "Absolutely, send it over.", reply: "Of course. I’ll send the brief, deliverables and posting timeline here shortly." },
        { text: "Sure. What are the campaign deliverables?", reply: "One Reel and two Stories, with a short caption mentioning the product. Usage rights for 30 days." },
        { text: "I’d be happy to take a look. What’s the timeline?", reply: "We’re hoping to go live in about three weeks, with a draft a week before that." },
      ],
      [
        { text: "What platforms are you looking to run this on?", reply: "Primarily Instagram, with an optional YouTube Short if you’re up for it." },
        { text: "Could you send over the brief and deliverables?", reply: "Sending the full brief now. Let me know if anything is unclear." },
        { text: "Thanks for reaching out. What are the campaign requirements?", reply: "Mainly an honest review, one product shot and the brand’s hashtag. We’ll share the full list in the brief." },
      ],
    ],
    closing: "Thanks! I’ll be in touch once the brand confirms.",
  },
  c24: {
    topic: "Event invitation",
    opening: "Hey! We’re putting together a creator meetup next Saturday and would love to have you there. Are you around?",
    preview: "We’d love to have you at our creator meetup.",
    turns: [
      [
        { text: "That sounds fun. Where is it happening?", reply: "It’s at a café studio in Bandra, with about 40 creators from across Mumbai." },
        { text: "I might be free. What time is the event?", reply: "It runs from 4 to 8 pm, so you can drop in whenever suits you." },
        { text: "I’d love to hear more about it.", reply: "It’s a relaxed meetup: a few short talks, an open mic for creators, and plenty of time to network." },
      ],
      [
        { text: "Is this a speaking opportunity or a creator appearance?", reply: "Both are possible. We’d love you to do a 10-minute talk, or you can simply join the creator panel." },
        { text: "Sounds good. Could you send me the event details?", reply: "Sending the schedule and venue details over now." },
        { text: "When and where is it happening?", reply: "Next Saturday from 4 pm at the café studio in Bandra. I’ll drop the pin here." },
      ],
    ],
    closing: "Great, I’ll add you to the list!",
  },
  c30: {
    topic: "Content feedback",
    opening: "That editing style in your last video was really good. Did you edit the whole thing yourself?",
    preview: "Did you edit the whole thing yourself?",
    turns: [
      [
        { text: "Yep! I edited the whole thing myself.", reply: "Wow, nice. What software do you use? The pacing was great." },
        { text: "Thank you! Yeah, I handled the edit.", reply: "That’s impressive. Did you plan the cuts beforehand or find them as you edited?" },
        { text: "Glad you liked it. What part stood out to you?", reply: "The transitions in the middle and how the captions landed on the beat. Really clean." },
      ],
      [
        { text: "Thanks! I’ve got a few more videos like that coming.", reply: "Looking forward to it! Tag me when the next one goes up." },
        { text: "Appreciate it. I’d love to hear your thoughts on the next one.", reply: "Happy to give feedback. Send me a draft link whenever it’s ready." },
        { text: "Glad you enjoyed it. I’m working on something similar.", reply: "Nice! Would love to see it. Is it part of a series?" },
      ],
    ],
    closing: "Awesome, catch you later!",
  },
  c32: {
    topic: "Cross-promotion",
    opening: "I’m putting together a small creator round-up for next week. Would you be interested in being featured?",
    preview: "Would you be interested in being featured?",
    turns: [
      [
        { text: "Sure, I’d be interested. What does the feature involve?", reply: "Just a short intro about you and your favourite video, plus a link to your channel. About 50 words." },
        { text: "That sounds good. Send me the details.", reply: "Great! I’ll send over the format and the word count shortly." },
        { text: "Absolutely. When are you planning to post it?", reply: "Next Wednesday evening. I’d need your blurb by Monday." },
      ],
      [
        { text: "I’d be up for a joint post. What did you have in mind?", reply: "A shared story post once the round-up is live, so both our audiences see it." },
        { text: "Sure, what kind of collaboration were you thinking?", reply: "Nothing heavy: we feature each other in one post and tag each other." },
        { text: "That could be fun. Want to put together a rough idea?", reply: "Yes! I’ll draft a quick outline and send it over." },
      ],
    ],
    closing: "Thanks, this is going to be great!",
  },
  c16: {
    topic: "Video collaboration",
    opening: "I have an idea for a short challenge video that I think would work really well with your style. Want to hear it?",
    preview: "Want to hear my idea for a challenge video?",
    turns: [
      [
        { text: "Definitely. Tell me the idea.", reply: "A 60-second one-take challenge: we each have to explain a concept using only things on the desk." },
        { text: "I’m interested. What’s the challenge?", reply: "Whoever makes the best design out of just three colours wins. The audience votes in the comments." },
        { text: "Sure, send it over.", reply: "Sending the outline now. It’s a short one-page idea." },
      ],
      [
        { text: "I can do this weekend. What time works for you?", reply: "Saturday at 3 pm works. It should take about an hour." },
        { text: "I’m fairly flexible next week. Let me know what works.", reply: "Let’s do Tuesday evening then. I’ll confirm the time tomorrow." },
        { text: "Could we do a quick call first?", reply: "Sure! I’ll send an invite for tomorrow afternoon and we can plan the shots." },
      ],
    ],
    closing: "Brilliant, it’s a plan!",
  },
  c34: {
    topic: "Professional opportunity",
    opening: "Hey! I’m helping organise a creator panel next month and wondered if you’d be interested in joining as a panellist.",
    preview: "Would you be interested in joining our creator panel?",
    turns: [
      [
        { text: "That sounds interesting. What would the panel cover?", reply: "Building an audience as a student creator: workflows, burnout and monetisation. About 45 minutes." },
        { text: "I’d definitely consider it. Could you send me the details?", reply: "Of course. I’ll send the agenda, the other panellists and the format." },
        { text: "Sure. When is the panel?", reply: "The first Saturday of next month, 11 am, at the university auditorium." },
      ],
      [
        { text: "Is this a speaking opportunity or a creator appearance?", reply: "It’s a panel discussion: a short intro from each panellist, then moderated questions and audience Q&A." },
        { text: "When and where is it happening?", reply: "First Saturday next month, 11 am, at the university auditorium. There’s a livestream too." },
        { text: "Sounds good. Could you send me the event details?", reply: "Sending them over now. Let me know if you need anything on your end." },
      ],
    ],
    closing: "Thanks, that’s great to hear!",
  },
  c40: {
    topic: "Collaboration proposal",
    opening: "Your recent college vlog gave me an idea. What if we did a “day in the life” video together?",
    preview: "What if we did a day-in-the-life video together?",
    turns: [
      [
        { text: "That could actually be really fun.", reply: "Right? We could swap: you spend a morning at my campus, I spend an afternoon at yours." },
        { text: "I’m interested. What did you have in mind?", reply: "A split-screen day in the life: same hours, different campuses. Short and punchy." },
        { text: "Sure! Where were you thinking of filming?", reply: "My campus for the first half and yours for the second, if that works." },
      ],
      [
        { text: "I can do this weekend. What time works for you?", reply: "Saturday works best for me. Morning start, maybe 10?" },
        { text: "I can make time tomorrow afternoon.", reply: "Tomorrow afternoon works. I’ll bring a camera and we can scout locations." },
        { text: "Could we do a quick call first?", reply: "Sure! I’ll send a call invite for tomorrow afternoon so we can plan the shots." },
      ],
    ],
    closing: "Awesome, can’t wait!",
  },
  c21: {
    topic: "Networking",
    opening: "Hey! I’m also working on lifestyle content and would love to connect. Are you open to chatting about creator workflows sometime?",
    preview: "Are you open to chatting about creator workflows?",
    turns: [
      [
        { text: "Definitely. What are you working on at the moment?", reply: "A weekly lifestyle series plus music covers on the side. Currently figuring out how to batch-edit." },
        { text: "Sure, I’d love to chat.", reply: "Lovely! I’m mostly curious how you plan and schedule your content." },
        { text: "Absolutely. When are you usually free?", reply: "Weekday evenings are best for me, after 7." },
      ],
      [
        { text: "I’m fairly flexible next week. Let me know what works.", reply: "Wednesday evening, 7:30? We can do a video call." },
        { text: "Could we do a quick call first?", reply: "Of course. I’ll send a link for tomorrow evening." },
        { text: "I can make time tomorrow afternoon.", reply: "Tomorrow afternoon works. I’ll send a call link in a bit." },
      ],
    ],
    closing: "Looking forward to it!",
  },
};

/** For creators you message first (Who to collab with): they greet you back, then the same collaboration → scheduling rounds. */
export const OPENER = "Hey! Loved your content. I think our audiences overlap a lot. Want to collaborate on something?";
export const GENERIC: Script = {
  topic: "Collaboration",
  opening: "Hey, thanks for reaching out! I’d be open to a collab. What kind of idea did you have in mind?",
  preview: "",
  turns: [
    [
      { text: "Sounds interesting. What did you have in mind?", reply: "I was thinking of a short Reel where we both share our takes on the same topic. I can send over a rough concept." },
      { text: "Yeah, I’d be open to that. Tell me more.", reply: "Perfect! I was thinking we could film a quick two-person video around our different approaches. Nothing too formal." },
      { text: "Sure, what kind of content are you thinking?", reply: "Something casual rather than heavily scripted. Maybe a short Q&A or a “things we both recommend” format." },
      { text: "I’m interested. When were you thinking?", reply: "Early next week would be ideal. Does that suit you?" },
      { text: "That could work. What’s the idea?", reply: "A short Reel where we each react to the other’s most popular video." },
      { text: "Definitely. Send me the details when you can.", reply: "Will do. I’ll send a quick outline shortly." },
    ],
    [
      { text: "I’m free Thursday evening. Would that work?", reply: "Thursday works for me! How about 6:30 pm? We could meet at the studio and shoot for about an hour." },
      { text: "I can do this weekend. What time works for you?", reply: "Saturday afternoon works. Around 3 pm?" },
      { text: "I’m fairly flexible next week. Let me know what works.", reply: "Great. I’ll check my schedule and suggest a couple of slots." },
      { text: "Could we do a quick call first?", reply: "Absolutely. I’ll send you a call invite for tomorrow afternoon. We can run through the idea and timeline." },
      { text: "I can make time tomorrow afternoon.", reply: "Tomorrow afternoon works. I’ll send a call link in a bit." },
    ],
  ],
  closing: "Sounds good, talk soon!",
};

export function seedMessages(): Record<string, Msg[]> {
  const ago = (m: number) => new Date(Date.now() - m * min).toISOString();
  const offsets = [14, 38, 65, 110, 170, 260, 410, 720, 1300];
  const out: Record<string, Msg[]> = {};
  Object.keys(SCRIPTS).forEach((id, i) => { out[id] = [{ id: `m_${id}_1`, from: "them", text: SCRIPTS[id].opening, at: ago(offsets[i] ?? 600) }]; });
  return out;
}

/** The thread's script: the contact's own, or the generic collaboration flow for threads you started. */
const scriptOf = (cid: string): Script => SCRIPTS[cid] ?? GENERIC;
const seeded = (cid: string) => cid in SCRIPTS;
const declined = (cid: string, msgs: Msg[]) => msgs.some((m) => m.from === "me" && DECLINES.some((d) => d.text === m.text));

/** Index of the round the creator is about to answer, or -1 if there is nothing to pick (waiting, finished, or turned down). */
function roundOf(cid: string, msgs: Msg[]): number {
  const me = msgs.filter((m) => m.from === "me").length;
  return seeded(cid) ? me : me - 1;
}

/** The reply options to show right now: only when it is the creator's turn. */
export function optionsFor(cid: string, msgs: Msg[]): Option[] {
  const last = msgs[msgs.length - 1];
  if (!last || last.from !== "them" || declined(cid, msgs)) return [];
  const round = roundOf(cid, msgs);
  const s = scriptOf(cid);
  if (round < 0 || round >= s.turns.length) return [];
  return round === 0 ? [...s.turns[0], ...DECLINES] : s.turns[round];
}

/** What the other person says back to `text`, given the thread as it was before `text` was sent. null = stay quiet. */
export function replyTo(cid: string, before: Msg[], text: string): string | null {
  const s = scriptOf(cid);
  if (!seeded(cid) && before.filter((m) => m.from === "me").length === 0) return s.opening; // you opened the thread
  const round = roundOf(cid, before);
  const picked = [...(s.turns[round] ?? []), ...(round === 0 ? DECLINES : [])].find((o) => o.text === text);
  if (picked) return picked.reply;
  if (declined(cid, before)) return null;
  if (round >= s.turns.length) return before.some((m) => m.from === "them" && m.text === s.closing) ? null : s.closing;
  // free-typed message: a neutral answer that keeps the conversation going
  return /\b(when|time|free|tomorrow|thursday|weekend|call|monday|tuesday|wednesday|friday|saturday|sunday)\b/i.test(text)
    ? "That works for me. I’ll confirm the details shortly."
    : "Sounds good! Let me think it over and get back to you with the details.";
}

/** How many scripted rounds this thread has in total, for the progress hint. */
export const roundsIn = (cid: string) => scriptOf(cid).turns.length;
export const topicOf = (cid: string) => scriptOf(cid).topic;
export const previewOf = (cid: string, m: Msg) => (m.id === `m_${cid}_1` && SCRIPTS[cid] ? SCRIPTS[cid].preview : m.text);

export type Tick = "sent" | "delivered" | "read";
/** One tick = sent, two ticks = delivered, two blue ticks = read. Derived from message age so it survives a reload. */
export function tickOf(m: Msg, now: number): Tick {
  const age = now - new Date(m.at).getTime();
  return age < 1500 ? "sent" : age < 4000 ? "delivered" : "read";
}
