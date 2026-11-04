import { test, expect } from "@playwright/test";
import { buildReviewProposals, deriveReviewItems } from "../src/lib/review/proposals";
import {
  approvedFixFilename,
  buildApprovedFixBundle,
} from "../src/lib/review/export";
import type { ScanReport, ViolationIssue } from "../src/lib/scanner/types";
import type { ReviewEvent } from "../src/lib/review/types";

function makeViolation(
  overrides: Partial<ViolationIssue> & Pick<ViolationIssue, "ruleId" | "title">,
): ViolationIssue {
  return {
    description: "Test finding",
    impact: "critical",
    wcag: ["WCAG 1.1.1"],
    tags: ["wcag2a"],
    helpUrl: "https://example.com/rules",
    elementCount: 1,
    elements: [{ selector: "img", html: '<img src="hero.png">' }],
    remediation: { summary: "Fix it", steps: [] },
    ...overrides,
  };
}

function makeReport(): ScanReport {
  return {
    id: "report-1",
    mode: "demo",
    requestedUrl: "demo-site/index.html",
    finalUrl: "file:///private/path/demo-site/index.html",
    pageTitle: "Demo page",
    scannedAt: "2026-01-01T00:00:00.000Z",
    durationMs: 1000,
    viewport: { width: 1366, height: 900 },
    engine: {
      name: "axe-core",
      version: "4.14.0",
      tags: ["wcag2a"],
      browser: "Chromium",
    },
    stats: {
      violationRules: 2,
      affectedElements: 3,
      needsReviewRules: 0,
      automatedRulePasses: 10,
      severity: { critical: 2, serious: 0, moderate: 0, minor: 0 },
    },
    violations: [
      makeViolation({
        ruleId: "image-alt",
        title: "Images must have alternative text",
        elementCount: 2,
        elements: [
          { selector: "img.hero", html: '<img src="hero.png">' },
          { selector: "img.card", html: '<img src="card.png">' },
        ],
      }),
      makeViolation({
        ruleId: "button-name",
        title: "Buttons must have discernible text",
        elements: [
          {
            selector: "button.icon",
            html: '<button type="button"><svg aria-hidden="true"></svg></button>',
          },
        ],
      }),
    ],
    needsReview: [],
    manualChecks: [],
    notes: [],
  };
}

function makeEvent(
  proposalId: string,
  action: ReviewEvent["action"],
  overrides: Partial<ReviewEvent> = {},
): ReviewEvent {
  return {
    id: `event-${proposalId}-${action}`,
    proposalId,
    reportId: "report-1",
    ruleId: "image-alt",
    proposalTitle: "Images must have alternative text",
    pageTitle: "Demo page",
    selector: "img.hero",
    action,
    note: "",
    at: "2026-01-02T00:00:00.000Z",
    original: '<img src="hero.png">',
    proposed: '<img src="hero.png" alt="Hikers on a ridge">',
    ...overrides,
  };
}

test.describe("Approved fix export", () => {
  test("contains only approved snapshots and a clearly labeled fragment diff", () => {
    const report = makeReport();
    const proposals = buildReviewProposals(report);
    const approved = proposals.find(
      (proposal) => proposal.id === "report-1:image-alt:0",
    )!;
    const rejected = proposals.find(
      (proposal) => proposal.id === "report-1:image-alt:1",
    )!;

    const items = deriveReviewItems(proposals, {
      version: 1,
      drafts: {
        [approved.id]: {
          proposed: '<img src="hero.png" alt="Changed after approval">',
          updatedAt: "2026-01-03T00:00:00.000Z",
        },
      },
      events: [
        makeEvent(approved.id, "approved", {
          note: "Checked against the source image.",
        }),
        makeEvent(rejected.id, "rejected", {
          id: "event-rejected",
          selector: "img.card",
          original: '<img src="card.png">',
          proposed: '<img src="card.png" alt="Card">',
        }),
      ],
    });

    const bundle = buildApprovedFixBundle(
      report,
      items,
      "2026-01-04T00:00:00.000Z",
    );

    expect(bundle.summary.approvedChanges).toBe(1);
    expect(bundle.changes).toHaveLength(1);
    expect(bundle.changes[0].proposalId).toBe(approved.id);
    expect(bundle.changes[0].proposedHtml).toBe(
      '<img src="hero.png" alt="Hikers on a ridge">',
    );
    expect(bundle.changes[0].note).toBe("Checked against the source image.");
    expect(bundle.report.url).toBe("demo-site/index.html");
    expect(bundle.limitations.join(" ")).toContain("not an applyable Git patch");
    expect(bundle.fragmentDiff).toContain(
      "--- a/accessforge-fragments/001-image-alt.html",
    );
    expect(bundle.fragmentDiff).toContain(
      '+<img src="hero.png" alt="Hikers on a ridge">',
    );
    expect(bundle.fragmentDiff).toContain("# Approved changes: 1");
    expect(bundle.fragmentDiff).not.toContain("Changed after approval");
    expect(bundle.fragmentDiff).not.toContain("card.png");
  });

  test("returns an explicit empty diff when nothing is approved", () => {
    const report = makeReport();
    const items = deriveReviewItems(buildReviewProposals(report), {
      version: 1,
      drafts: {},
      events: [],
    });
    const bundle = buildApprovedFixBundle(
      report,
      items,
      "2026-01-04T00:00:00.000Z",
    );

    expect(bundle.summary.approvedChanges).toBe(0);
    expect(bundle.changes).toEqual([]);
    expect(bundle.fragmentDiff).toContain("No approved changes were available");
  });

  test("creates filesystem-safe export filenames", () => {
    expect(approvedFixFilename("report:one/two", "json")).toBe(
      "accessforge-approved-fixes-report-one-two.json",
    );
    expect(approvedFixFilename("report-1", "diff")).toBe(
      "accessforge-approved-fixes-report-1.diff",
    );
  });
});
