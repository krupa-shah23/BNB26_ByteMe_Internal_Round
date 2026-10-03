"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";
import { Reveal, SlidingNav, useDemoDelay, Skeleton } from "@/components/ui/bits";
import { CalendarSection } from "@/components/home/Calendar";
import { Collabs } from "@/components/home/Collabs";
import { Library, Overview, Trends } from "@/components/home/HomeSections";
import { useSection } from "@/lib/useSection";

const SECTIONS = ["overview", "trends", "library", "collabs", "calendar"] as const;
type S = (typeof SECTIONS)[number];
const NAV: { id: S; label: string }[] = [{ id: "overview", label: "Overview" }, { id: "trends", label: "Trends" }, { id: "library", label: "Library" }, { id: "collabs", label: "Collabs" }, { id: "calendar", label: "Calendar" }];

function HomeInner() {
  const [section, setSection] = useSection(SECTIONS, "overview");
  const ready = useDemoDelay(450);
  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal className="mb-8"><p className="t-label text-muted">Workspace</p><h1 className="t-h1 mt-2">Home</h1></Reveal>
      <div className="mb-8"><SlidingNav id="home" items={NAV} value={section} onChange={setSection} /></div>
      {!ready ? <div className="grid gap-4"><Skeleton className="h-56" /><div className="grid grid-cols-4 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div> : (
        <AnimatePresence mode="wait">
          <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {section === "overview" && <Overview go={setSection} />}
            {section === "trends" && <Trends />}
            {section === "library" && <Library />}
            {section === "collabs" && <Collabs />}
            {section === "calendar" && <CalendarSection />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function Home() {
  return <Suspense><HomeInner /></Suspense>;
}
