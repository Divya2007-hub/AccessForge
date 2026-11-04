import type { ManualCheck } from "./types";

export const MANUAL_CHECKS: ManualCheck[] = [
  {
    id: "keyboard-only",
    title: "Complete every task with the keyboard only",
    description:
      "Navigate the page with Tab, Shift+Tab, Enter, Space, Escape, and arrow keys. Confirm all interactive controls can be used without a mouse.",
    whyItMatters:
      "People who cannot use a mouse, including switch and keyboard users, must be able to reach and operate every action.",
    wcag: ["WCAG 2.1.1", "WCAG 2.1.2"],
  },
  {
    id: "focus-visibility",
    title: "Check focus visibility and focus order",
    description:
      "Confirm the keyboard focus indicator is clearly visible on every background and that focus moves in a logical order.",
    whyItMatters:
      "A visible focus indicator is the only way keyboard users can tell where they are on the page.",
    wcag: ["WCAG 2.4.3", "WCAG 2.4.7", "WCAG 2.4.11"],
  },
  {
    id: "screen-reader-order",
    title: "Listen to the page with a screen reader",
    description:
      "Test with VoiceOver, NVDA, or Narrator. Confirm headings, landmarks, names, states, and dynamic updates are announced in a useful order.",
    whyItMatters:
      "Automated rules can verify some markup, but announcement quality and reading order require listening to the actual experience.",
    wcag: ["WCAG 1.3.1", "WCAG 1.3.2", "WCAG 4.1.2"],
  },
  {
    id: "alt-quality",
    title: "Review the quality of alternative text",
    description:
      "Check that alt text describes the purpose of each image in context rather than its appearance, and that decorative images are ignored.",
    whyItMatters:
      "Automated tools can detect a missing alt attribute, but they cannot tell whether the description is useful.",
    wcag: ["WCAG 1.1.1"],
  },
  {
    id: "form-errors",
    title: "Submit forms with missing and invalid data",
    description:
      "Confirm errors are identified in text, associated with the relevant field, announced to assistive technology, and accompanied by instructions.",
    whyItMatters:
      "Clear error recovery is essential for people using screen readers, magnification, or cognitive accommodations.",
    wcag: ["WCAG 3.3.1", "WCAG 3.3.2", "WCAG 3.3.3", "WCAG 3.3.4"],
  },
  {
    id: "media-alternatives",
    title: "Verify captions, transcripts, and audio descriptions",
    description:
      "Watch and listen to media to confirm captions are synchronized and complete, transcripts are available, and visual information is described.",
    whyItMatters:
      "Automated tools cannot judge whether captions or transcripts accurately convey the content.",
    wcag: ["WCAG 1.2.2", "WCAG 1.2.3", "WCAG 1.2.5"],
  },
  {
    id: "timing-motion",
    title: "Check timing, motion, and auto-updating content",
    description:
      "Confirm time limits can be extended or turned off, moving content can be paused, and auto-updates can be controlled.",
    whyItMatters:
      "People who read slowly or are sensitive to motion need control over time limits and animation.",
    wcag: ["WCAG 2.2.1", "WCAG 2.2.2", "WCAG 2.3.1"],
  },
  {
    id: "reflow-zoom",
    title: "Test text resizing, zoom, and reflow",
    description:
      "Zoom to 200% and 400%, increase text spacing, and check that content remains readable without horizontal scrolling at 320 CSS pixels wide.",
    whyItMatters:
      "Low-vision users frequently enlarge text and zoom; layouts must adapt without losing content or functionality.",
    wcag: ["WCAG 1.4.4", "WCAG 1.4.10", "WCAG 1.4.12"],
  },
  {
    id: "custom-widgets",
    title: "Exercise custom widgets and dynamic content",
    description:
      "For menus, dialogs, comboboxes, tabs, and live updates, verify names, roles, states, keyboard behavior, and focus management.",
    whyItMatters:
      "Custom ARIA widgets often pass static checks while failing the interaction patterns users depend on.",
    wcag: ["WCAG 2.1.1", "WCAG 4.1.2", "WCAG 4.1.3"],
  },
];
