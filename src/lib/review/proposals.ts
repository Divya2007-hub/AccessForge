import type { Impact, ScanReport } from "@/lib/scanner/types";
import type {
  ReviewItem,
  ReviewProposal,
  ReviewState,
  ReviewStatus,
  UnsupportedFinding,
} from "./types";

interface RuleRecipe {
  attribute: string;
  placeholder: string;
  explanation: string[];
  risk: string;
  checks: string[];
}

const SEVERITY_WEIGHT: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

const RULE_RECIPES: Record<string, RuleRecipe> = {
  "image-alt": {
    attribute: "alt",
    placeholder: "[Describe the image purpose]",
    explanation: [
      "axe-core found an image without an alternative text attribute.",
      "The draft adds an alt attribute so the image can be named by assistive technology.",
      "Replace the bracketed placeholder with text that describes the image's purpose in context.",
    ],
    risk:
      "Low code risk. The wording is content-specific and must be confirmed by the page owner. Use alt=\"\" only when the image is purely decorative.",
    checks: [
      "Re-run the image-alt rule against the updated source.",
      "Confirm a screen reader announces a useful image description.",
      "Check that nearby text does not repeat the same description.",
    ],
  },
  "button-name": {
    attribute: "aria-label",
    placeholder: "[Describe the button action]",
    explanation: [
      "axe-core found a button without a discernible accessible name.",
      "The draft adds aria-label so the control can be announced by assistive technology.",
      "Replace the bracketed placeholder with the action a person should expect, such as Search or Close.",
    ],
    risk:
      "No visual change is required, but the label must match the real action. If the button opens a panel, focus and expanded state also need review.",
    checks: [
      "Re-run the button-name rule.",
      "Confirm the control is announced as the intended action followed by button.",
      "Operate the control with the keyboard and confirm focus behavior.",
    ],
  },
  "link-name": {
    attribute: "aria-label",
    placeholder: "[Describe the link destination]",
    explanation: [
      "axe-core found a link without text that assistive technology can announce.",
      "The draft adds aria-label to the link fragment.",
      "Replace the bracketed placeholder with the destination or purpose of the link.",
    ],
    risk:
      "The label must make sense out of context. Visible link text is usually preferable to aria-label because everyone sees the same wording.",
    checks: [
      "Re-run the link-name rule.",
      "Review the link list out of context in a screen reader.",
      "Confirm the label matches the destination.",
    ],
  },
  "select-name": {
    attribute: "aria-label",
    placeholder: "[Describe the select purpose]",
    explanation: [
      "axe-core found a select control without an accessible name.",
      "The draft adds aria-label to the select fragment.",
      "Replace the bracketed placeholder with the choice being made, such as Choose a region.",
    ],
    risk:
      "A visible label is usually clearer than aria-label. Adding aria-label does not place new text on screen, so visual users still need nearby instructions.",
    checks: [
      "Re-run the select-name rule.",
      "Confirm the select is announced with its purpose.",
      "Check that the visible instructions match the accessible name.",
    ],
  },
  label: {
    attribute: "aria-label",
    placeholder: "[Describe the field purpose]",
    explanation: [
      "axe-core found a form field without an associated accessible label.",
      "The draft adds aria-label to the field fragment.",
      "Replace the bracketed placeholder with the field purpose. A visible label connected with for/id is generally the stronger fix.",
    ],
    risk:
      "Placeholder text is not a persistent label. The final source should usually include a visible label, and any error message must be associated with the field.",
    checks: [
      "Re-run the label and form-field rules.",
      "Confirm the field name is announced when focused.",
      "Test invalid input and confirm errors are announced and associated.",
    ],
  },
  "input-button-name": {
    attribute: "value",
    placeholder: "[Describe the button action]",
    explanation: [
      "axe-core found an input button without a useful accessible name.",
      "The draft adds a value attribute to the input button fragment.",
      "Replace the bracketed placeholder with the action the button performs.",
    ],
    risk:
      "This changes the visible button text. Confirm the wording with the design owner and check that the new text fits the layout.",
    checks: [
      "Re-run the input-button-name rule.",
      "Confirm the visible text and accessible name match.",
      "Check the button at narrow viewports and increased text size.",
    ],
  },
  "html-has-lang": {
    attribute: "lang",
    placeholder: "[language-code]",
    explanation: [
      "axe-core found that the html element does not declare a language.",
      "The draft adds a lang attribute to the html fragment.",
      "Replace the bracketed placeholder with a valid BCP 47 tag such as en or en-GB.",
    ],
    risk:
      "An incorrect language tag can cause the wrong pronunciation in screen readers. Confirm the page's primary language before approving.",
    checks: [
      "Re-run the html-has-lang rule.",
      "Confirm the page language is announced correctly.",
      "Check any passages in another language are marked separately.",
    ],
  },
  "frame-title": {
    attribute: "title",
    placeholder: "[Describe the frame content]",
    explanation: [
      "axe-core found a frame without a title.",
      "The draft adds a title attribute to the frame fragment.",
      "Replace the bracketed placeholder with a short description of the embedded content.",
    ],
    risk:
      "The title is exposed to assistive technology and should describe the frame's content, not repeat the page title.",
    checks: [
      "Re-run the frame-title rule.",
      "Confirm the frame is announced with its title.",
      "Check that the embedded content is still usable with a keyboard.",
    ],
  },
};

function findInsertionPoint(openTag: string) {
  let quote: string | null = null;
  let lastOutsideQuote = -1;

  for (let index = 0; index < openTag.length; index += 1) {
    const character = openTag[index];

    if (quote) {
      if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (!/\s/.test(character)) lastOutsideQuote = index;
  }

  if (lastOutsideQuote !== -1 && openTag[lastOutsideQuote] === "/") {
    return { index: lastOutsideQuote, selfClosing: true };
  }

  return { index: openTag.length, selfClosing: false };
}

function addAttribute(html: string, name: string, value: string): string | null {
  const closeIndex = html.indexOf(">");
  if (closeIndex === -1) return null;

  const openTag = html.slice(0, closeIndex);
  const attributePattern = new RegExp(`(^|\\s)${name}\\s*=`, "i");
  if (attributePattern.test(openTag)) return null;

  const insertion = findInsertionPoint(openTag);
  const before = openTag.slice(0, insertion.index).replace(/\s+$/, "");
  const escapedValue = value.replace(/"/g, "&quot;");
  const selfClosingSlash = insertion.selfClosing ? "/" : "";

  return `${before} ${name}="${escapedValue}"${selfClosingSlash}${html.slice(closeIndex)}`;
}

export function buildReviewProposals(report: ScanReport): ReviewProposal[] {
  const pageUrl =
    report.mode === "demo" ? "demo-site/index.html" : report.finalUrl;
  const proposals: ReviewProposal[] = [];

  for (const violation of report.violations) {
    const recipe = RULE_RECIPES[violation.ruleId];
    if (!recipe) continue;

    violation.elements.forEach((element, elementIndex) => {
      const proposed = addAttribute(
        element.html,
        recipe.attribute,
        recipe.placeholder,
      );
      if (!proposed) return;

      proposals.push({
        id: `${report.id}:${violation.ruleId}:${elementIndex}`,
        reportId: report.id,
        ruleId: violation.ruleId,
        ruleTitle: violation.title,
        description: violation.description,
        impact: violation.impact,
        wcag: violation.wcag,
        helpUrl: violation.helpUrl,
        pageTitle: report.pageTitle,
        pageUrl,
        scannedAt: report.scannedAt,
        selector: element.selector,
        elementIndex,
        elementCount: violation.elementCount,
        original: element.html,
        proposed,
        placeholder: recipe.placeholder,
        explanation: [
          ...recipe.explanation,
          "This is a deterministic draft based on the stored element fragment. It is not agent output and has not been applied to any file.",
        ],
        risk: recipe.risk,
        checks: recipe.checks,
        truncated: element.html.length >= 600,
      });
    });
  }

  return proposals.sort(
    (left, right) =>
      SEVERITY_WEIGHT[left.impact] - SEVERITY_WEIGHT[right.impact] ||
      left.ruleTitle.localeCompare(right.ruleTitle) ||
      left.elementIndex - right.elementIndex,
  );
}

export function getUnsupportedFindings(
  report: ScanReport,
  proposals: ReviewProposal[],
): UnsupportedFinding[] {
  const coveredRules = new Set(proposals.map((proposal) => proposal.ruleId));

  return report.violations
    .filter((violation) => !coveredRules.has(violation.ruleId))
    .map((violation) => ({
      ruleId: violation.ruleId,
      title: violation.title,
      impact: violation.impact,
      elementCount: violation.elementCount,
      helpUrl: violation.helpUrl,
    }));
}

export function deriveReviewItems(
  proposals: ReviewProposal[],
  state: ReviewState,
): ReviewItem[] {
  return proposals.map((proposal) => {
    const draft = state.drafts[proposal.id];
    const currentProposed = draft?.proposed ?? proposal.proposed;
    const lastEvent =
      state.events.find((event) => event.proposalId === proposal.id) ?? null;

    const status: ReviewStatus =
      !lastEvent || lastEvent.action === "reopened"
        ? "pending"
        : lastEvent.action;

    const needsAuthorInput =
      currentProposed.trim().length === 0 ||
      currentProposed.trim() === proposal.original.trim() ||
      (proposal.placeholder.length > 0 &&
        currentProposed.includes(proposal.placeholder));

    return {
      ...proposal,
      currentProposed,
      status,
      lastEvent,
      isEdited: Boolean(draft && draft.proposed !== proposal.proposed),
      needsAuthorInput,
    };
  });
}

export function isReviewableRule(ruleId: string): boolean {
  return Object.prototype.hasOwnProperty.call(RULE_RECIPES, ruleId);
}
