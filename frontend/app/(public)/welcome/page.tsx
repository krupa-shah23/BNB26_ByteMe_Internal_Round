import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = { title: "CreatorAi — turn raw footage into posts that work everywhere" };

export default function Welcome() {
  return <Landing />;
}
