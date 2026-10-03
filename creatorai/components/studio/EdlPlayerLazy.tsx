"use client";
import dynamic from "next/dynamic";

/** Remotion is only downloaded when a player is actually shown. */
export const EdlPlayerLazy = dynamic(() => import("./EdlPlayer"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });
