"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Banner, ReachOut, SiteFooter, SiteHeader } from "./LandingChrome";
import { Counters, Hero, Niches, SelectedWork, Services, Statement } from "./LandingSections";
import { useHydrated, useStore } from "@/lib/store";

export function Landing() {
  const router = useRouter();
  useHydrated();
  const login = useStore((s) => s.login);
  const [reach, setReach] = useState(false);
  const enter = useCallback((href = "/") => { login(); router.push(href); }, [login, router]);
  return (
    <>
      <a href="#main" className="sr-only z-[200] rounded-pill bg-text px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Banner onEnter={() => enter("/")} />
      <SiteHeader onEnter={() => enter("/")} onReach={() => setReach(true)} />
      <main id="main">
        <Hero />
        <SelectedWork onEnter={enter} />
        <Statement />
        <Counters />
        <Niches onEnter={enter} />
        <Services onEnter={enter} />
      </main>
      <SiteFooter />
      <ReachOut open={reach} onClose={() => setReach(false)} />
    </>
  );
}
