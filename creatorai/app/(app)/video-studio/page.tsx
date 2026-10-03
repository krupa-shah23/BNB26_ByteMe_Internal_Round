import { Suspense } from "react";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";

export const metadata = { title: "Video Studio — CreatorAi" };
export default function Page() {
  return <Suspense><UploadWorkspace kind="video" /></Suspense>;
}
