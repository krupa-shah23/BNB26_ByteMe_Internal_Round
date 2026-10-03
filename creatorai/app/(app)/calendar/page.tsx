"use client";
import { CalendarPanel } from "@/components/home/CalendarOverlay";
import { Reveal } from "@/components/ui/bits";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal className="mb-6"><p className="t-label text-muted">Plan</p><h1 className="t-h1 mt-2">Calendar</h1></Reveal>
      <CalendarPanel />
    </div>
  );
}
