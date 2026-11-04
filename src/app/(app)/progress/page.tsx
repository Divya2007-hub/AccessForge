import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "See which fixes were reviewed and approved, check real agent availability, and understand what still needs a person.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
