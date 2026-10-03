import { Suspense } from "react";
import { Messages } from "@/components/messages/Messages";

export const metadata = { title: "Messages · CreatorAi" };
export default function Page() {
  return <Suspense><Messages /></Suspense>;
}
