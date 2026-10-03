import { Suspense } from "react";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";

export const metadata = { title: "Short Videos — CreatorAi" };
export default function Page() {
  return <Suspense><UploadWorkspace kind="short" /></Suspense>;
}
