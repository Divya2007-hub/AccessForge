import type { Metadata } from "next";
import { ReviewWorkspace } from "@/components/review/review-workspace";

export const metadata: Metadata = {
  title: "Review fixes",
  description:
    "Review rule-based accessibility fix drafts generated from a saved scan, record human decisions, export approved snapshots, and optionally send them to Switch.",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string | string[] }>;
}) {
  const params = await searchParams;
  const reportId = Array.isArray(params.report)
    ? params.report[0]
    : params.report;

  return <ReviewWorkspace initialReportId={reportId ?? null} />;
}
