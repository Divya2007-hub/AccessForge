import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website scanner",
  description:
    "Run a real Playwright and axe-core accessibility audit against a public website or the bundled inaccessible demo site.",
};

export default function ScannerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
