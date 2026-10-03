/**
 * Shapes for Studio's four review lanes (ad-safety, PII, claims, consent).
 * Everything here is plain JSON so a real detector (BACKEND-SLOT(compliance)) can return the same structure
 * and the project can persist it unchanged.
 */

/** Normalised 0-100 box inside the video frame (independent of aspect ratio). */
export interface Box { x: number; y: number; w: number; h: number }

/** A subtitle / transcript cue. `text` is what is currently shown; `original` is what the detector heard. */
export interface Cue { id: string; at: number; dur: number; text: string; original: string }

export type MonKind = "profanity" | "violence" | "sensitive";
export interface MonIssue {
  id: string; kind: MonKind; at: number; dur: number;
  /** severity before the strict-first-15s rule */
  severity: "limited" | "red";
  title: string;
  /** short reason, shown in the timeline tooltip after the timestamp */
  reason: string;
  cueId?: string;
  /** profanity only: where each word lands, so Auto-Clean can drop a bleep on it */
  words?: { word: string; at: number }[];
  autoFixable: boolean;
  status: "open" | "cleaned";
}
export interface Bleep { id: string; issueId: string; at: number; dur: number }

export type PiiKind = "email" | "phone" | "address";
export interface PiiIssue {
  id: string; kind: PiiKind; at: number; dur: number;
  /** what was read off the screen */
  text: string; label: string; title: string; box: Box;
  status: "open" | "blurred" | "ignored";
}

export interface ClaimIssue {
  id: string; at: number; dur: number; cueId: string;
  statement: string; note: string; suggestion: string;
  status: "open" | "applied" | "kept";
}

export type ConsentStatus = "consented" | "unknown" | "opted_out";
export interface Appearance { at: number; dur: number; box: Box }
export interface Person {
  id: string; label: string; hue: number; name: string;
  status: ConsentStatus; release?: string;
  appearances: Appearance[];
}

/** A blur / mask overlay. Start/end are editable; the box stays tied to the thing it hides. */
export interface Blur {
  id: string; kind: "pii" | "person";
  refId: string; label: string;
  start: number; end: number; box: Box;
}

export interface Compliance {
  version: 1;
  cues: Cue[];
  monetization: MonIssue[];
  bleeps: Bleep[];
  pii: PiiIssue[];
  claims: ClaimIssue[];
  people: Person[];
  blurs: Blur[];
}

export type MonStatus = "safe" | "limited" | "red";
export interface StripBlock { id: string; start: number; end: number; status: MonStatus; issueId?: string; label: string }
