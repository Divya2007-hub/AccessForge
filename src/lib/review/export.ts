import type { Impact, ScanReport } from "@/lib/scanner/types";
import { diffLines } from "@/lib/diff";
import type { ReviewItem } from "./types";

export interface ApprovedFixChange {
  proposalId: string;
  ruleId: string;
  ruleTitle: string;
  impact: Impact;
  wcag: string[];
  helpUrl: string;
  pageUrl: string;
  pageTitle: string;
  selector: string;
  originalHtml: string;
  proposedHtml: string;
  approvedAt: string;
  note: string;
}

export interface ApprovedFixBundle {
  kind: "accessforge-local-approved-fixes";
  version: 1;
  generatedAt: string;
  report: {
    id: string;
    mode: ScanReport["mode"];
    url: string;
    pageTitle: string;
    scannedAt: string;
  };
  summary: {
    approvedChanges: number;
  };
  limitations: string[];
  changes: ApprovedFixChange[];
  fragmentDiff: string;
}

export const APPROVED_FIX_LIMITATIONS = [
  "This bundle contains captured HTML fragments, not source files. AccessForge does not store repository paths, source line numbers, or project configuration.",
  "The fragment diff is a review aid, not an applyable Git patch. Do not run git apply against it.",
  "Nothing in this bundle has been applied, tested, committed, or opened as a pull request.",
  "Each change must be applied in the source repository, then verified with a fresh accessibility check and human review.",
];

function fragmentPath(index: number, ruleId: string) {
  const slug =
    ruleId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "finding";

  return `accessforge-fragments/${String(index + 1).padStart(3, "0")}-${slug}.html`;
}

function singleLine(value: string, maxLength: number) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function buildFragmentDiff(
  changes: ApprovedFixChange[],
  generatedAt: string,
) {
  const header = [
    "# AccessForge approved fragment diff",
    "# Review aid only. This is not an applyable Git patch.",
    "# Source file paths and line numbers are not stored.",
    `# Generated: ${singleLine(generatedAt, 100)}`,
    `# Approved changes: ${changes.length}`,
  ];

  if (changes.length === 0) {
    return [...header, "", "# No approved changes were available."].join("\n");
  }

  const sections: string[] = [];

  changes.forEach((change, index) => {
    const path = fragmentPath(index, change.ruleId);
    const lines = diffLines(change.originalHtml, change.proposedHtml);
    const oldCount = lines.filter((line) => line.type !== "added").length;
    const newCount = lines.filter((line) => line.type !== "removed").length;

    sections.push(
      [
        "# ------------------------------------------------------------------",
        `# Rule: ${singleLine(change.ruleId, 200)}`,
        `# Selector: ${singleLine(change.selector, 4000)}`,
        `# Page: ${singleLine(change.pageUrl, 2000)}`,
        `# Approved: ${singleLine(change.approvedAt, 100)}`,
        `--- a/${path}`,
        `+++ b/${path}`,
        `@@ -1,${oldCount} +1,${newCount} @@`,
        ...lines.map((line) => {
          if (line.type === "added") return `+${line.text}`;
          if (line.type === "removed") return `-${line.text}`;
          return ` ${line.text}`;
        }),
      ].join("\n"),
    );
  });

  return [...header, "", ...sections].join("\n\n");
}

export function buildApprovedFixBundle(
  report: ScanReport,
  items: ReviewItem[],
  generatedAt = new Date().toISOString(),
): ApprovedFixBundle {
  const changes: ApprovedFixChange[] = items
    .filter(
      (item) => item.status === "approved" && item.lastEvent?.action === "approved",
    )
    .map((item) => {
      const event = item.lastEvent!;

      return {
        proposalId: item.id,
        ruleId: item.ruleId,
        ruleTitle: item.ruleTitle,
        impact: item.impact,
        wcag: item.wcag,
        helpUrl: item.helpUrl,
        pageUrl: item.pageUrl,
        pageTitle: item.pageTitle,
        selector: item.selector,
        originalHtml: event.original,
        proposedHtml: event.proposed,
        approvedAt: event.at,
        note: event.note,
      };
    });

  return {
    kind: "accessforge-local-approved-fixes",
    version: 1,
    generatedAt,
    report: {
      id: report.id,
      mode: report.mode,
      url: report.mode === "demo" ? "demo-site/index.html" : report.finalUrl,
      pageTitle: report.pageTitle,
      scannedAt: report.scannedAt,
    },
    summary: {
      approvedChanges: changes.length,
    },
    limitations: APPROVED_FIX_LIMITATIONS,
    changes,
    fragmentDiff: buildFragmentDiff(changes, generatedAt),
  };
}

export function approvedFixFilename(
  reportId: string,
  extension: "json" | "diff",
) {
  const safeId = reportId.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `accessforge-approved-fixes-${safeId}.${extension}`;
}
