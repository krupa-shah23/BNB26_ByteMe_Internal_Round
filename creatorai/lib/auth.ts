/**
 * Fully hardcoded demo authentication (no server).
 *  - HARDCODED_USERS are built in and always work.
 *  - Accounts created on the Sign up page are kept in this browser only (localStorage), password stored as a SHA-256 hash.
 * Replace `authenticate` / `register` with real API calls later; the UI only depends on these two functions.
 */
export interface AuthUser { name: string; email: string }
interface StoredUser extends AuthUser { hash: string }

/** Built-in accounts — shown on the login page so anyone can try the app. */
export const HARDCODED_USERS: (AuthUser & { password: string })[] = [
  { name: "Aarav", email: "demo@creatorai.app", password: "Demo@1234" },
  { name: "Judge", email: "judge@creatorai.app", password: "BitNBuild@26" },
];
export const DEMO_LOGIN = { email: HARDCODED_USERS[0].email, password: HARDCODED_USERS[0].password };

const KEY = "creatorai-users";
const mem: StoredUser[] = [];

const readUsers = (): StoredUser[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredUser[]; } catch { return mem; }
};
const writeUsers = (u: StoredUser[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { mem.splice(0, mem.length, ...u); }
};

const norm = (e: string) => e.trim().toLowerCase();

async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return `plain:${text}`; // very old / insecure-context fallback
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`creatorai:${text}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  await delay(500); // feels like a round-trip
  const e = norm(email);
  const built = HARDCODED_USERS.find((u) => norm(u.email) === e);
  if (built) return built.password === password ? { ok: true, user: { name: built.name, email: built.email } } : { ok: false, error: "Incorrect email or password." };
  const stored = readUsers().find((u) => norm(u.email) === e);
  if (stored && stored.hash === (await sha256(password))) return { ok: true, user: { name: stored.name, email: stored.email } };
  return { ok: false, error: stored ? "Incorrect email or password." : "No account found for that email. Sign up first, or use the demo account." };
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  await delay(600);
  const e = norm(email);
  if (HARDCODED_USERS.some((u) => norm(u.email) === e) || readUsers().some((u) => norm(u.email) === e)) {
    return { ok: false, error: "An account with this email already exists. Log in instead." };
  }
  const user = { name: name.trim(), email: email.trim() };
  writeUsers([...readUsers(), { ...user, hash: await sha256(password) }]);
  return { ok: true, user };
}
