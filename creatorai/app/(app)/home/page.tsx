"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, useDemoDelay } from "@/components/ui/bits";
import { Collabs } from "@/components/home/Collabs";
import { Library, Overview, Trends } from "@/components/home/HomeSections";

export default function Home() {
  const router = useRouter();
  const ready = useDemoDelay(450);

  const go = (id: "trends" | "library" | "collabs" | "calendar") => {
    if (id === "calendar") return router.push("/calendar");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // deep links like /home#library
  useEffect(() => {
    if (!ready || !location.hash) return;
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" }), 120);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready) {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-4">
        <Skeleton className="h-56" />
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-[1400px] gap-16">
      <Overview go={go} />
      <section id="trends" className="scroll-mt-24" aria-labelledby="trends-h"><h2 id="trends-h" className="t-h1 mb-6">Trends</h2><Trends /></section>
      <section id="library" className="scroll-mt-24" aria-labelledby="library-h"><h2 id="library-h" className="t-h1 mb-6">Library</h2><Library /></section>
      <section id="collabs" className="scroll-mt-24" aria-labelledby="collabs-h"><h2 id="collabs-h" className="t-h1 mb-6">Collabs</h2><Collabs /></section>
    </div>
  );
}
