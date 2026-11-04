import { AppShell } from "@/components/app/app-shell";
import { DeveloperModeProvider } from "@/components/developer-mode-provider";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <DeveloperModeProvider>
      <AppShell>{children}</AppShell>
    </DeveloperModeProvider>
  );
}
