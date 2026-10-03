import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import { AuthForm } from "@/components/landing/AuthForm";

const serif = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = { title: "Log in — CreatorAi" };

export default function Page() {
  return (
    <div className={serif.variable}>
      <AuthForm mode="login" />
    </div>
  );
}
