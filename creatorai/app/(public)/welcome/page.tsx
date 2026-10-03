import { redirect } from "next/navigation";

// Legacy URL: the landing page now lives at "/".
export default function Welcome() {
  redirect("/");
}
