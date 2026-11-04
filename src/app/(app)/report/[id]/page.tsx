import type { Metadata } from "next";
import { ReportView } from "@/components/report/report-view";

export const metadata: Metadata = {
  title: "Accessibility report",
  description:
    "Review automated accessibility findings, affected elements, WCAG references, and suggested remediation from an AccessForge scan.",
};

export default function ReportPage() {
  return <ReportView />;
}
