import type { Impact } from "@/lib/scanner/types";

interface IssueAudience {
  audience: string;
  detail: string;
}

const RULE_AUDIENCE: Record<string, IssueAudience> = {
  "image-alt": {
    audience: "People using screen readers or text-only browsing",
    detail:
      "Without a useful text alternative, the image has no accessible meaning.",
  },
  "button-name": {
    audience: "People using screen readers, voice control, or speech input",
    detail:
      "A control without a name cannot be identified or operated reliably without sight.",
  },
  "link-name": {
    audience: "People using screen readers, voice control, or speech input",
    detail:
      "A link without a name does not explain where it goes or what it does.",
  },
  "label": {
    audience: "People using screen readers and voice control",
    detail:
      "Form fields need a programmatic label so assistive technology can announce their purpose.",
  },
  "select-name": {
    audience: "People using screen readers and voice control",
    detail:
      "A select control needs an accessible name so its purpose is announced.",
  },
  "input-button-name": {
    audience: "People using screen readers and voice control",
    detail:
      "Input buttons need visible or programmatic text that identifies their action.",
  },
  "color-contrast": {
    audience: "People with low vision or color-vision differences",
    detail:
      "Low contrast makes text and important boundaries difficult to perceive.",
  },
  "html-has-lang": {
    audience: "People using screen readers and translation tools",
    detail:
      "The page language helps assistive technology choose the right pronunciation and translation rules.",
  },
  "heading-order": {
    audience: "People using screen readers and keyboard navigation",
    detail:
      "A predictable heading order makes it easier to understand and navigate the page structure.",
  },
  "landmark-one-main": {
    audience: "People using screen readers and keyboard navigation",
    detail:
      "Landmarks provide fast navigation between the main regions of a page.",
  },
  "region": {
    audience: "People using screen readers and keyboard navigation",
    detail:
      "Page content should sit inside labeled regions so users can move between sections efficiently.",
  },
  "list": {
    audience: "People using screen readers",
    detail:
      "List semantics tell assistive technology how many items exist and how they relate.",
  },
  "listitem": {
    audience: "People using screen readers",
    detail:
      "List items need valid list structure so their grouping is announced correctly.",
  },
  "table-fake-caption": {
    audience: "People using screen readers",
    detail:
      "A programmatic caption helps users understand what the table contains before navigating it.",
  },
  "th-has-data-cells": {
    audience: "People using screen readers",
    detail:
      "Header cells need associated data cells so table relationships are announced.",
  },
  "frame-title": {
    audience: "People using screen readers",
    detail:
      "Frames and iframes need a title so their embedded purpose is clear.",
  },
  "aria-allowed-attr": {
    audience: "People using screen readers and other assistive technology",
    detail:
      "Invalid ARIA can produce missing, conflicting, or misleading announcements.",
  },
  "aria-valid-attr-value": {
    audience: "People using screen readers and other assistive technology",
    detail:
      "Invalid ARIA values can prevent controls from exposing their state or role correctly.",
  },
  "duplicate-id": {
    audience: "People using assistive technology and keyboard navigation",
    detail:
      "Duplicate identifiers can make labels, anchors, and scripted references point to the wrong element.",
  },
};

const IMPACT_FALLBACK: Record<Impact, IssueAudience> = {
  critical: {
    audience: "People who rely on assistive technology",
    detail:
      "This finding can block or seriously interrupt a core task for some users.",
  },
  serious: {
    audience: "People with disabilities using assistive technology",
    detail:
      "This finding can make an important task difficult or confusing.",
  },
  moderate: {
    audience: "People with disabilities and some mobile or low-vision users",
    detail:
      "This finding adds friction or reduces clarity for some users.",
  },
  minor: {
    audience: "Some users, depending on their setup and needs",
    detail:
      "This finding is usually a smaller barrier, but it still deserves review.",
  },
};

export function getIssueAudience(
  ruleId: string,
  impact: Impact,
): IssueAudience {
  return RULE_AUDIENCE[ruleId] ?? IMPACT_FALLBACK[impact];
}
