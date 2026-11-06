import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "See which fixes were reviewed and approved, check real agent availability, and understand what still needs a person.",
};

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string | string[] }>;
}) {
  const params = await searchParams;
  const reportId = Array.isArray(params.report)
    ? params.report[0]
    : params.report;

  return <ProgressView initialReportId={reportId ?? null} />;
}
