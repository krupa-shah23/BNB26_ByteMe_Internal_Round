/**
 * Hardcoded Legal & Safety reviews for the two legal demo videos. They demonstrate the Assertion vs Opinion classifier:
 * legal1 = carnival game (medium), legal2 = Cashify (medium-high, a named company). Timestamps for legal1 are placeholders.
 * Copy says "potentially risky" / "may require substantiation", never "illegal".
 */
export type Risk = "HIGH" | "MEDIUM-HIGH" | "MEDIUM" | "LOW-MEDIUM" | "LOW";
export interface Related { at: number; ts: string; text: string; kind: string; risk: Risk; note: string }
export interface LegalReview {
  groupId: string; overall: Risk;
  /** short headline, e.g. "Potentially defamatory factual assertion detected" */
  title: string;
  /** one-line subtext under the headline */
  headline: string;
  flagged: { at: number; ts: string; text: string; kind: string; risk: Risk; why: string };
  /** how the classifier read the statement, and the lower-risk way to say the same thing */
  contrast: { detected: string; why: string; lowerLabel: string; lowerText: string };
  related: Related[];
  rewrites: string[];
  rewriteWhy: string[];
  /** the bar at the bottom: whether the creator must choose before continuing, and what it says */
  blocking: boolean;
  bar: string;
}

export const LEGAL: Record<string, LegalReview> = {
  legal1: {
    groupId: "legal1", overall: "MEDIUM",
    title: "Potentially risky factual assertion detected",
    headline: "The transcript uses language that may imply deceptive conduct by carnival game operators. Consider reframing it as an observation about the game’s design or your own experience.",
    flagged: {
      at: 18, ts: "00:18", text: "These carnival games are basically a scam.", kind: "Unsubstantiated factual assertion", risk: "MEDIUM",
      why: "“Scam” can imply fraudulent or deceptive conduct. The statement is broader than saying the game is difficult or that you personally wouldn’t play it.",
    },
    contrast: {
      detected: "Factual assertion",
      why: "Calling the games a “scam” can be read as claiming that the operators intentionally deceive players.",
      lowerLabel: "Commentary / opinion",
      lowerText: "This game is much harder than it looks, and here’s why.",
    },
    related: [
      { at: 9, ts: "00:09", text: "This game is really difficult to win.", kind: "Commentary / observation", risk: "LOW", note: "Describes the apparent difficulty of the game without alleging illegal or deceptive conduct." },
      { at: 27, ts: "00:27", text: "They make it look much easier than it actually is.", kind: "Potential factual assertion", risk: "LOW-MEDIUM", note: "Could imply that the operator intentionally misleads players. Consider saying this is your impression, unless you have evidence of intentional deception." },
      { at: 39, ts: "00:39", text: "I wouldn’t play this game.", kind: "Personal opinion", risk: "LOW", note: "Clearly your own choice, and it doesn’t allege misconduct." },
    ],
    rewrites: ["This game is much harder than it looks, and here’s why.", "The way this game is designed makes it surprisingly difficult to win.", "I wouldn’t spend my money on this game after seeing how it works."],
    rewriteWhy: ["Keeps the video’s central point and focuses on how the game works instead of alleging fraudulent conduct."],
    blocking: false,
    bar: "Review the flagged statement before publishing",
  },
  legal2: {
    groupId: "legal2", overall: "MEDIUM-HIGH",
    title: "Potentially defamatory factual assertion detected",
    headline: "The transcript contains a direct allegation about a named company that could be read as a factual claim of deceptive or fraudulent conduct.",
    flagged: {
      at: 42, ts: "00:42", text: "Cashify is basically scamming people with these offers.", kind: "Factual assertion", risk: "HIGH",
      why: "The statement calls Cashify’s business practices “scamming” rather than limiting the claim to your own experience. Because it implies deceptive or fraudulent conduct by a named company, it carries higher defamation and commercial-disparagement risk if it can’t be substantiated.",
    },
    contrast: {
      detected: "Factual assertion",
      why: "“Cashify is scamming people” makes a broad claim about the company’s conduct.",
      lowerLabel: "Personal experience / opinion",
      lowerText: "I received an offer that was much lower than I expected, so I wouldn’t recommend selling my phone through them.",
    },
    related: [
      { at: 21, ts: "00:21", text: "They offered me much less than I expected for my phone.", kind: "Personal experience", risk: "LOW", note: "Describes your own transaction rather than making a general claim about the company. An offer, quotation or transaction record can help support it." },
      { at: 51, ts: "00:51", text: "I wouldn’t recommend selling your phone to them.", kind: "Opinion / recommendation", risk: "LOW", note: "A recommendation based on your experience. It doesn’t accuse the company of fraud or illegal conduct." },
    ],
    rewrites: [
      "Based on my experience, I found Cashify’s offer significantly lower than I expected, and I personally wouldn’t recommend selling my phone through them.",
      "The offer I received from Cashify was much lower than I expected, so I decided not to sell my phone through them.",
      "I wasn’t satisfied with the offer I received from Cashify, and based on my experience, I wouldn’t recommend the service.",
    ],
    rewriteWhy: ["Keeps your criticism while clearly framing it as your own experience and recommendation, rather than a broad allegation of fraudulent conduct."],
    blocking: true,
    bar: "Replace or keep the flagged statement to continue",
  },
};
