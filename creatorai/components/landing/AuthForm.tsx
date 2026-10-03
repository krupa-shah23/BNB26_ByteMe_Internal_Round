"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AuthSwitch, type AuthMode } from "@/components/landing/AuthSwitch";
import { Glyph, type GlyphName } from "@/components/short/Glyphs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { authenticate, register } from "@/lib/auth";
import { useHydrated, useStore } from "@/lib/store";

const email = z.string().trim().email("Enter a valid email");
const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name"),
  email,
  password: z.string().min(8, "Use at least 8 characters"),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don’t match" });

type Errors = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

const ORBIT: { g: GlyphName; x: string; y: string; r: string; d: string }[] = [
  { g: "reels", x: "9%", y: "20%", r: "-8deg", d: "6s" }, { g: "shorts", x: "91%", y: "14%", r: "6deg", d: "7s" },
  { g: "diamond", x: "94%", y: "78%", r: "0deg", d: "5s" }, { g: "sketch", x: "6%", y: "80%", r: "8deg", d: "8s" },
];

function Field({ id, label, error, children, toggled = false }: { id: string; label: string; error?: string; children: React.ReactNode; toggled?: boolean }) {
  return (
    <motion.div layout initial={toggled ? { opacity: 0, height: 0 } : false} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </motion.div>
  );
}

export function AuthForm({ mode: initialMode }: { mode: AuthMode }) {
  const router = useRouter();
  const ready = useHydrated();
  const loggedIn = useStore((s) => s.loggedIn);
  const signIn = useStore((s) => s.signIn);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  useEffect(() => { if (ready && loggedIn) router.replace("/"); }, [ready, loggedIn, router]);

  /** Switch without a page navigation (so the highlight can slide) while keeping the URL honest for refresh/share. */
  const switchMode = (m: AuthMode) => {
    if (m === mode) return;
    setMode(m); setErrors({}); setFormError(""); setShow(false);
    window.history.replaceState(null, "", m === "signup" ? "/signup" : "/login");
    document.title = m === "signup" ? "Sign up — CreatorAi" : "Log in — CreatorAi";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const res = (signup ? signupSchema : loginSchema).safeParse(f);
    if (!res.success) {
      const next: Errors = {};
      for (const i of res.error.issues) { const k = i.path[0] as keyof Errors; next[k] ??= i.message; }
      setErrors(next); return;
    }
    setErrors({}); setBusy(true);
    const out = signup ? await register(f.name, f.email, f.password) : await authenticate(f.email, f.password);
    if (!out.ok) { setBusy(false); setFormError(out.error); return; }
    signIn(out.user);
    router.push("/");
  };
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  const aria = (k: keyof Errors) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <div className="sv-theme relative h-dvh w-full overflow-hidden bg-bg text-text">
      <header className="relative z-20 flex h-[72px] items-center justify-between px-[6.5%]">
        <Link href="/welcome" className="font-display text-[clamp(1.4rem,2vw,1.9rem)] font-semibold tracking-tight">Creator<span className="text-brand">Ai</span></Link>
        <div className="flex items-center gap-4"><ThemeToggle /><AuthSwitch active={mode} onSelect={switchMode} /></div>
      </header>

      <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="52" rx="42" ry="44" fill="none" stroke="rgb(var(--text))" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="1.2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
        {ORBIT.map((o) => <div key={o.g} className="orbit-bob absolute -translate-x-1/2 -translate-y-1/2" style={{ left: o.x, top: o.y, ["--r" as string]: o.r, ["--d" as string]: o.d }}><Glyph name={o.g} size={56} /></div>)}
      </div>

      <main className="relative z-10 mx-auto grid h-[calc(100dvh-72px)] max-w-lg place-items-center px-5 pb-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <h1 className="text-center font-serif text-[clamp(1.9rem,min(6vw,7vh),3.4rem)] leading-none tracking-[-0.02em]">{signup ? "Create your account" : "Welcome back"}</h1>
              <p className="mt-2 text-center text-muted [@media(max-height:640px)]:hidden">{signup ? "Start turning raw footage into posts." : "Log in to pick up where you left off."}</p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={submit} noValidate className="mt-5 grid gap-3 rounded-[24px] border border-text/10 bg-surface p-5 shadow-soft [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:gap-2 [@media(max-height:640px)]:p-4">
            <AnimatePresence initial={false}>
              {signup && <Field key="name" toggled id="name" label="Name" error={errors.name}><input id="name" autoComplete="name" className="input !py-2.5" placeholder="Aarav" {...bind("name")} {...aria("name")} /></Field>}
            </AnimatePresence>
            <Field id="email" label="Email" error={errors.email}><input id="email" type="email" autoComplete="email" className="input !py-2.5" placeholder="you@example.com" {...bind("email")} {...aria("email")} /></Field>
            <Field id="password" label="Password" error={errors.password}>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} className="input !py-2.5 pr-12" {...bind("password")} {...aria("password")} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Field>
            <AnimatePresence initial={false}>
              {signup && <Field key="confirm" toggled id="confirm" label="Confirm password" error={errors.confirm}><input id="confirm" type={show ? "text" : "password"} autoComplete="new-password" className="input !py-2.5" {...bind("confirm")} {...aria("confirm")} /></Field>}
            </AnimatePresence>
            {formError && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">{formError}</p>}
            <button className="btn-primary mt-1 h-11" disabled={busy}>{busy ? "One moment…" : signup ? "Sign up" : "Log in"}{!busy && <ArrowRight size={16} />}</button>
          </form>


          <p className="mt-4 text-center text-sm text-muted [@media(max-height:640px)]:mt-2">
            {signup ? "Already have an account? " : "New to CreatorAi? "}
            <button type="button" onClick={() => switchMode(signup ? "login" : "signup")} className="font-medium text-text underline underline-offset-4">{signup ? "Log in" : "Sign up"}</button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
