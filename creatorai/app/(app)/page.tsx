"use client";
import { useState } from "react";
import { Discovery } from "@/components/home/Discovery";
import { FeatureCards } from "@/components/home/FeatureCards";

export default function Home() {
  const [sub, setSub] = useState<"discover" | "tracker">("discover");
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 lg:h-[calc(100dvh-5rem-1.75rem)]">
      <div className="flex min-h-[480px] flex-1 flex-col lg:min-h-0"><Discovery sub={sub} onSub={setSub} /></div>
      {sub === "discover" && <div className="h-[200px] shrink-0 lg:h-[30%] lg:max-h-[240px] lg:min-h-[170px]"><FeatureCards /></div>}
    </div>
  );
}
