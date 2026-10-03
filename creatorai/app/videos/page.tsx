import { redirect } from "next/navigation";

// Legacy URL: long-form workspace moved to /video-studio.
export default function Videos() {
  redirect("/video-studio");
}
