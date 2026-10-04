/** Hardcoded Legal & Safety reviews for the two legal demo videos (legal1 = high risk, legal2 = medium-high). */
export type Risk = "HIGH" | "MEDIUM-HIGH" | "LOW-MEDIUM" | "LOW";
export interface Related { at: number; ts: string; text: string; kind: string; risk: Risk; note: string }
export interface LegalReview {
  groupId: string; overall: Risk; headline: string;
  flagged: { at: number; ts: string; text: string; kind: string; target: string; conduct: string; evidence: string; risk: Risk; why: string[] };
  related: Related[];
  rewrites: string[];
  evidence: string[];
  warning: string;
}

const WARN = "CreatorAI cannot determine whether the allegation is legally true or defamatory. If you intend to retain the statement, verify the underlying claim and consider obtaining appropriate legal advice.";

export const LEGAL: Record<string, LegalReview> = {
  legal1: {
    groupId: "legal1", overall: "HIGH",
    headline: "The transcript contains a potentially defamatory or commercially disparaging factual allegation directed at a brand/company.",
    flagged: {
      at: 74, ts: "01:14", text: "Brand X runs a scam.", kind: "Factual allegation", target: "Brand / Company", conduct: "Fraudulent or deceptive business activity", evidence: "None", risk: "HIGH",
      why: ["The statement is phrased as a definitive assertion of wrongdoing, rather than as an expression of personal opinion or experience.", "Adding phrases such as “in my opinion” does not necessarily change the underlying nature of a specific factual accusation.", "CreatorAI recommends verifying the claim and supporting it with reliable evidence before publication."],
    },
    related: [
      { at: 48, ts: "00:48", text: "They charged me twice for the same order.", kind: "Personal factual experience", risk: "LOW-MEDIUM", note: "This appears to describe the creator’s own experience. Consider retaining supporting evidence such as receipts, invoices or order records." },
      { at: 92, ts: "01:32", text: "I would never buy from them again.", kind: "Opinion / recommendation", risk: "LOW", note: "This is presented as the creator’s personal judgement and does not directly allege illegal conduct." },
    ],
    rewrites: ["Based on my experience with Brand X, I found their practices misleading and would not recommend the company.", "In my experience, I had serious issues with Brand X’s customer service and billing."],
    evidence: ["Receipts or invoices", "Order records", "Correspondence with the company", "Independent documentation", "Reliable third-party reporting", "Other evidence supporting the specific allegation"],
    warning: `Your video contains a direct allegation that a company engages in fraudulent or deceptive conduct. ${WARN}`,
  },
  legal2: {
    groupId: "legal2", overall: "MEDIUM-HIGH",
    headline: "The transcript contains potentially defamatory or commercially disparaging factual allegations directed at a brand/company.",
    flagged: {
      at: 42, ts: "00:42", text: "Cashify is basically scamming people with these offers.", kind: "Factual allegation", target: "Cashify", conduct: "Deceptive or fraudulent business practices", evidence: "Limited", risk: "HIGH",
      why: ["The statement characterises the company’s business practices as fraudulent or deceptive, presenting the accusation as a factual conclusion rather than solely as the creator’s personal opinion.", "Phrases such as “basically” or “in my opinion” do not necessarily remove the underlying allegation if the statement still implies that the company is engaging in specific wrongdoing.", "CreatorAI recommends verifying the underlying claim and distinguishing clearly between documented facts, personal experience and personal opinion before publication."],
    },
    related: [
      { at: 21, ts: "00:21", text: "They offered me much less than I expected for my phone.", kind: "Personal factual experience", risk: "LOW", note: "This describes the creator’s own transaction and can generally be presented as their personal experience. Consider retaining screenshots, quotations or transaction records." },
      { at: 51, ts: "00:51", text: "I wouldn’t recommend selling your phone to them.", kind: "Opinion / recommendation", risk: "LOW", note: "This is presented as a personal recommendation based on the creator’s experience and does not directly allege illegal conduct." },
    ],
    rewrites: ["Based on my experience, I found Cashify’s offer significantly lower than I expected and wouldn’t recommend selling your phone through them.", "My experience with Cashify was disappointing, particularly because the final offer was much lower than I expected."],
    evidence: ["The original phone valuation", "Final quoted price", "Screenshots of the offer", "Order or transaction records", "Correspondence with Cashify", "Documentation supporting any broader claim about the company’s practices", "Reliable independent reporting if making a claim about the company generally"],
    warning: `Your video contains a direct allegation that a company engages in deceptive or fraudulent conduct. ${WARN}`,
  },
};
