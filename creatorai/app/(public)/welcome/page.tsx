import { redirect } from "next/navigation";

// The landing page now lives at "/".
export default function Welcome() {
  redirect("/");
}
