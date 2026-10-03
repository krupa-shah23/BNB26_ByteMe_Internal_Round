import { ProjectSync } from "@/components/shell/ProjectSync";
import { SettingsSync } from "@/components/shell/SettingsSync";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell><ProjectSync /><SettingsSync />{children}</AppShell>;
}
