import { notFound } from "next/navigation";
import { CreateFlow, type FormatKey } from "@/components/short/CreateFlow";

const FORMATS = ["reels", "shorts", "stories", "ads"] as const;
export const dynamicParams = false;
export const generateStaticParams = () => FORMATS.map((format) => ({ format }));
export const metadata = { title: "Create — CreatorAi" };

export default function Page({ params }: { params: { format: string } }) {
  if (!(FORMATS as readonly string[]).includes(params.format)) notFound();
  return <CreateFlow format={params.format as FormatKey} />;
}
