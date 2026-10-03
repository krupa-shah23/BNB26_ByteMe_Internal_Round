import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import { WelcomeHero } from "@/components/landing/WelcomeHero";

const serif = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = { title: "CreatorAi" };

export default function Welcome() {
  return (
    <div className={serif.variable}>
      <WelcomeHero />
    </div>
  );
}
