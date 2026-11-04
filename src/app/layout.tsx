import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AccessForge — Build a web everyone can access",
    template: "%s · AccessForge",
  },
  description:
    "AccessForge is an AI-assisted accessibility analysis and repair workspace. Scan a public website, understand real WCAG findings, and review human-approved fixes.",
  applicationName: "AccessForge",
  keywords: [
    "accessibility",
    "WCAG",
    "axe-core",
    "Playwright",
    "web accessibility",
    "audit",
    "remediation",
  ],
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
