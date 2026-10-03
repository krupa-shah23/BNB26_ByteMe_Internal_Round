"use client";
import { useParams } from "next/navigation";
import { Editor } from "@/components/studio/Editor";

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Editor projectId={projectId} />;
}
