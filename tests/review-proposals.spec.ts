import { test, expect } from "@playwright/test";
import {
  buildReviewProposals,
  deriveReviewItems,
  getUnsupportedFindings,
} from "../src/lib/review/proposals";
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
    mode: "remote",
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    pageTitle: "Example page",
    scannedAt: "2026-01-01T00:00:00.000Z",
    durationMs: 1200,
    viewport: { width: 1366, height: 900 },
    engine: {
      name: "axe-core",
      version: "4.14.0",
      tags: ["wcag2a"],
      browser: "Chromium",
    },
    stats: {
      violationRules: 3,
      affectedElements: 4,
      needsReviewRules: 0,
      automatedRulePasses: 10,
      severity: { critical: 2, serious: 1, moderate: 0, minor: 0 },
    },
    violations: [
      makeViolation({
        ruleId: "image-alt",
        title: "Images must have alternative text",
        elementCount: 2,
        elements: [
          { selector: "img.hero", html: '<img src="hero.png">' },
          { selector: "img.card", html: '<img src="card.png" />' },
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
      makeViolation({
        ruleId: "color-contrast",
        title: "Elements must meet minimum color contrast ratio thresholds",
        impact: "serious",
        elements: [{ selector: "p.low", html: '<p class="low">Text</p>' }],
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
  id = "event-1",
): ReviewEvent {
  return {
    id,
    proposalId,
    reportId: "report-1",
    ruleId: "image-alt",
    proposalTitle: "Images must have alternative text",
    pageTitle: "Example page",
    selector: "img.hero",
    action,
    note: "",
    at: "2026-01-01T00:00:00.000Z",
    original: '<img src="hero.png">',
    proposed: '<img src="hero.png" alt="Hero">',
  };
}

test.describe("Review proposal generation", () => {
  test("builds deterministic drafts for supported rules only", () => {
    const report = makeReport();
    const proposals = buildReviewProposals(report);

    expect(proposals).toHaveLength(3);
    expect(proposals.map((proposal) => proposal.ruleId).sort()).toEqual([
      "button-name",
      "image-alt",
      "image-alt",
    ]);

    const images = proposals.filter(
      (proposal) => proposal.ruleId === "image-alt",
    );
    const hero = images.find((proposal) => proposal.original.includes("hero"));
    const card = images.find((proposal) => proposal.original.includes("card"));

    expect(hero?.proposed).toBe(
      '<img src="hero.png" alt="[Describe the image purpose]">',
    );
    expect(card?.proposed).toBe(
      '<img src="card.png" alt="[Describe the image purpose]"/>',
    );
    expect(hero?.id).toBe("report-1:image-alt:0");
    expect(card?.id).toBe("report-1:image-alt:1");
    expect(hero?.pageUrl).toBe("https://example.com/");
    expect(hero?.placeholder).toBe("[Describe the image purpose]");
  });

  test("adds names to buttons without duplicating existing attributes", () => {
    const report = makeReport();
    const button = buildReviewProposals(report).find(
      (proposal) => proposal.ruleId === "button-name",
    );

    expect(button?.proposed).toContain('aria-label="[Describe the button action]"');
    expect(button?.proposed).toContain('type="button"');
  });

  test("keeps unsupported rules out of the queue", () => {
    const report = makeReport();
    const proposals = buildReviewProposals(report);
    const unsupported = getUnsupportedFindings(report, proposals);

    expect(unsupported).toHaveLength(1);
    expect(unsupported[0].ruleId).toBe("color-contrast");
  });

  test("derives pending, edited, approved, and reopened states", () => {
    const proposals = buildReviewProposals(makeReport());
    const image = proposals.find(
      (proposal) => proposal.id === "report-1:image-alt:0",
    )!;

    const pending = deriveReviewItems(proposals, {
      version: 1,
      drafts: {},
      events: [],
    }).find((item) => item.id === image.id)!;

    expect(pending.status).toBe("pending");
    expect(pending.needsAuthorInput).toBe(true);

    const edited = deriveReviewItems(proposals, {
      version: 1,
      drafts: {
        [image.id]: {
          proposed: '<img src="hero.png" alt="Hikers on a ridge">',
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      events: [],
    }).find((item) => item.id === image.id)!;

    expect(edited.status).toBe("pending");
    expect(edited.isEdited).toBe(true);
    expect(edited.needsAuthorInput).toBe(false);

    const approved = deriveReviewItems(proposals, {
      version: 1,
      drafts: {},
      events: [makeEvent(image.id, "approved")],
    }).find((item) => item.id === image.id)!;

    expect(approved.status).toBe("approved");
    expect(approved.lastEvent?.action).toBe("approved");

    const reopened = deriveReviewItems(proposals, {
      version: 1,
      drafts: {},
      events: [makeEvent(image.id, "reopened", "event-2"), makeEvent(image.id, "approved")],
    }).find((item) => item.id === image.id)!;

    expect(reopened.status).toBe("pending");
    expect(reopened.lastEvent?.action).toBe("reopened");
  });

  test("keeps approval blocked while the placeholder remains after an edit", () => {
    const proposals = buildReviewProposals(makeReport());
    const image = proposals.find(
      (proposal) => proposal.id === "report-1:image-alt:0",
    )!;

    const item = deriveReviewItems(proposals, {
      version: 1,
      drafts: {
        [image.id]: {
          proposed:
            '<img src="hero.png" alt="[Describe the image purpose] hikers on a ridge">',
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      events: [],
    }).find((entry) => entry.id === image.id)!;

    expect(item.isEdited).toBe(true);
    expect(item.needsAuthorInput).toBe(true);
  });
});
