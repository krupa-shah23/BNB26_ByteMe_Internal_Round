"use client";
import { CalendarSection } from "@/components/home/Calendar";
import { Reveal } from "@/components/ui/bits";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal className="mb-8"><p className="t-label text-muted">Plan</p><h1 className="t-h1 mt-2">Calendar</h1></Reveal>
      <CalendarSection />
    </div>
  );
}
