import type { Remediation } from "./types";

type RemediationTemplate = Omit<Remediation, "reference">;

const REMEDIATIONS: Record<string, RemediationTemplate> = {
  "image-alt": {
    summary:
      "Give each informative image a concise alternative text description, or mark purely decorative images as decorative.",
    steps: [
      "Decide whether the image conveys information that is not available in nearby text.",
      "For informative images, add an alt attribute that describes the image's purpose in context.",
      "For decorative images, use alt=\"\" (an empty alt attribute) so assistive technology ignores them.",
      "Avoid repeating the same text in the alt attribute and an adjacent caption.",
    ],
  },
  "input-image-alt": {
    summary:
      "Image inputs need an alt attribute that describes the action the button performs.",
    steps: [
      "Add an alt attribute to the input[type=\"image\"] element.",
      "Describe the action, such as \"Search\", rather than the image itself.",
    ],
  },
  "object-alt": {
    summary:
      "Embedded objects must expose equivalent text content for assistive technology.",
    steps: [
      "Add a text alternative inside the object element or replace the object with accessible markup.",
      "Ensure the alternative conveys the same information or functionality.",
    ],
  },
  "area-alt": {
    summary: "Image map areas need alternative text that describes their destination.",
    steps: [
      "Add an alt attribute to each area element inside the map.",
      "Use the destination or action as the alternative text, not the shape of the region.",
    ],
  },
  "role-img-alt": {
    summary:
      "Elements with role=\"img\" need an accessible name, usually through aria-label or aria-labelledby.",
    steps: [
      "Add aria-label with a concise description, or aria-labelledby pointing to visible text.",
      "Mark decorative elements with role=\"presentation\" or aria-hidden=\"true\" instead.",
    ],
  },
  "button-name": {
    summary:
      "Every button needs an accessible name that describes its action in context.",
    steps: [
      "Prefer visible text inside the button.",
      "For icon-only buttons, add aria-label with the action, or reference hidden text with aria-labelledby.",
      "Add a title attribute only as a last resort; do not rely on it as the sole label.",
    ],
  },
  "link-name": {
    summary:
      "Links need accessible text that makes sense out of context.",
    steps: [
      "Add visible, descriptive link text.",
      "When the link contains only an icon or image, provide alt text or an aria-label.",
      "Replace generic text such as \"click here\" with the destination or action.",
    ],
  },
  "frame-title": {
    summary: "Iframes must have a title that identifies their content.",
    steps: [
      "Add a title attribute to the iframe.",
      "Describe the embedded content, not the word \"iframe\".",
    ],
  },
  "html-has-lang": {
    summary: "The html element must declare the page's primary language.",
    steps: [
      "Add a lang attribute to the html element.",
      "Use a valid BCP 47 language tag, such as lang=\"en\" or lang=\"en-GB\".",
      "If the page mixes languages, mark language changes on the relevant elements.",
    ],
  },
  "html-lang-valid": {
    summary: "The document language value must be a valid language tag.",
    steps: [
      "Replace the current lang value with a valid BCP 47 tag.",
      "Use the shortest correct tag, such as \"en\" or \"fr-CA\".",
    ],
  },
  label: {
    summary:
      "Form controls need a programmatically associated label, not only a placeholder.",
    steps: [
      "Add a visible label element and connect it with the control using matching for and id attributes.",
      "Alternatively, use aria-label or aria-labelledby when a visible label is not feasible.",
      "Keep the label text visible after the user starts typing.",
    ],
  },
  "select-name": {
    summary: "Select controls need an accessible name that describes the choice.",
    steps: [
      "Add a label element with for pointing to the select's id.",
      "Use aria-label or aria-labelledby only when a visible label is not possible.",
    ],
  },
  "form-field-multiple-labels": {
    summary:
      "A form control should not have conflicting labels that produce an ambiguous accessible name.",
    steps: [
      "Keep one visible label associated with the control.",
      "Remove duplicate label elements or convert additional text to helper text with aria-describedby.",
    ],
  },
  "color-contrast": {
    summary:
      "Increase the contrast between the text and its background so it meets WCAG AA.",
    steps: [
      "Check the computed foreground and background colors for the affected element.",
      "Adjust the text color, background, or both until normal text reaches at least 4.5:1 and large text reaches at least 3:1.",
      "Re-test states such as hover, focus, disabled, and placeholder text.",
      "Do not rely on color alone to convey meaning.",
    ],
  },
  "color-contrast-enhanced": {
    summary:
      "For WCAG AAA, increase text contrast to at least 7:1 for normal text and 4.5:1 for large text.",
    steps: [
      "Measure the actual rendered colors, including opacity and overlays.",
      "Increase contrast or enlarge the text if the stricter AAA threshold is required.",
    ],
  },
  "heading-order": {
    summary:
      "Use heading levels in a logical sequence so screen reader users can navigate the page structure.",
    steps: [
      "Check the heading outline from h1 through h6.",
      "Change heading levels to reflect the content hierarchy rather than visual size.",
      "Use CSS for visual styling instead of choosing a heading level for its size.",
    ],
  },
  "page-has-heading-one": {
    summary: "Pages should expose a single top-level h1 that names the main content.",
    steps: [
      "Add an h1 near the start of the main content.",
      "If the page already has an h1, make sure it is not hidden or duplicated unnecessarily.",
    ],
  },
  "document-title": {
    summary: "Each page needs a unique, descriptive title element.",
    steps: [
      "Put a concise page-specific title inside the head element.",
      "Start with the page-specific information and end with the site name if useful.",
    ],
  },
  "landmark-one-main": {
    summary: "Wrap the primary page content in a main landmark.",
    steps: [
      "Use a single main element for the primary content.",
      "Do not nest main inside header, nav, aside, or footer landmarks.",
    ],
  },
  region: {
    summary:
      "All page content should be contained by a landmark region so screen reader users can navigate between areas.",
    steps: [
      "Place content in semantic elements such as header, nav, main, aside, and footer.",
      "Use ARIA landmark roles only when native HTML landmarks are not possible.",
      "Avoid putting unrelated content directly inside the body.",
    ],
  },
  bypass: {
    summary:
      "Provide a way to skip repeated blocks of content, such as a skip link or proper landmarks.",
    steps: [
      "Add a visible-on-focus \"Skip to main content\" link as the first focusable element.",
      "Ensure it targets the main content container and works with the keyboard.",
    ],
  },
  "duplicate-id": {
    summary: "IDs must be unique because they are used for labels, references, and navigation.",
    steps: [
      "Find every duplicate id value on the page.",
      "Rename duplicates and update any for, aria-labelledby, aria-describedby, or href references.",
    ],
  },
  "aria-allowed-attr": {
    summary:
      "Remove ARIA attributes that are not valid for the element's role, or use a role that supports them.",
    steps: [
      "Inspect the element's explicit or implicit role.",
      "Remove invalid ARIA attributes or change the role to one that permits them.",
      "Prefer native HTML semantics when they already provide the behavior.",
    ],
  },
  "aria-required-attr": {
    summary: "ARIA roles with required attributes are missing state or property values.",
    steps: [
      "Identify the role used on the element.",
      "Add every required ARIA attribute with a valid value.",
      "Prefer native HTML elements that supply the semantics automatically.",
    ],
  },
  "aria-valid-attr-value": {
    summary: "An ARIA attribute has an invalid value or points to a missing element.",
    steps: [
      "Check the attribute value against the ARIA specification.",
      "For ID references, make sure the target exists and has the expected type.",
    ],
  },
  "aria-valid-attr": {
    summary: "The element uses an ARIA attribute name that does not exist.",
    steps: [
      "Correct the misspelled ARIA attribute.",
      "Remove custom attributes that are not part of ARIA.",
    ],
  },
  "aria-hidden-focus": {
    summary:
      "Elements hidden from assistive technology must not contain focusable controls.",
    steps: [
      "Remove focusable controls from aria-hidden containers, or remove aria-hidden.",
      "Use the hidden attribute or display:none for content that should be completely unavailable.",
    ],
  },
  "nested-interactive": {
    summary:
      "Interactive controls must not be nested inside other interactive controls.",
    steps: [
      "Separate the nested control and the parent control into sibling elements.",
      "Wrap the larger area in a non-interactive container and keep one action per control.",
    ],
  },
  "target-size": {
    summary:
      "Touch and mouse targets should be large enough to activate reliably.",
    steps: [
      "Increase the target to at least 24 by 24 CSS pixels, or provide sufficient spacing around it.",
      "Check targets in every responsive breakpoint.",
    ],
  },
  tabindex: {
    summary:
      "Avoid positive tabindex values so focus order follows the visual and DOM order.",
    steps: [
      "Replace positive tabindex values with tabindex=\"0\" only where needed.",
      "Reorder the DOM instead of forcing focus order with tabindex.",
    ],
  },
  "meta-viewport": {
    summary:
      "Do not prevent users from zooming or scaling the page.",
    steps: [
      "Remove user-scalable=no and maximum-scale restrictions from the viewport meta tag.",
      "Keep the viewport width set to device-width.",
    ],
  },
  "video-caption": {
    summary: "Prerecorded video needs captions that include dialogue and meaningful sounds.",
    steps: [
      "Add a captions track in WebVTT format with kind=\"captions\".",
      "Verify the captions are synchronized and accurately describe important audio.",
    ],
  },
  "audio-caption": {
    summary: "Prerecorded audio needs a transcript or captions.",
    steps: [
      "Provide a text transcript near the audio player.",
      "Add a captions track if the audio contains speech that must be synchronized.",
    ],
  },
  "no-autoplay-audio": {
    summary:
      "Audio that plays automatically must be stoppable or last no more than three seconds.",
    steps: [
      "Remove autoplay, or provide an accessible pause and volume control.",
      "Keep automatically playing audio under three seconds.",
    ],
  },
  "scrollable-region-focusable": {
    summary:
      "Scrollable regions must be reachable and operable with the keyboard.",
    steps: [
      "Add tabindex=\"0\" to the scroll container so it can receive focus.",
      "Ensure the container has a visible focus indicator and an accessible name when needed.",
    ],
  },
  list: {
    summary: "List content must use valid list structure.",
    steps: [
      "Use ul or ol for lists and li for each item.",
      "Remove children that are not li elements from the list, or use role=\"list\" and role=\"listitem\" intentionally.",
    ],
  },
  listitem: {
    summary: "List items must be contained by a list.",
    steps: [
      "Move the li inside a ul or ol element.",
      "If a custom list is required, add the appropriate list roles to the container and items.",
    ],
  },
  "empty-heading": {
    summary: "Headings need text content that describes the section.",
    steps: [
      "Add visible text inside the heading.",
      "If the heading is decorative, remove it from the heading outline and use a different element.",
    ],
  },
  "label-content-name-mismatch": {
    summary:
      "The visible label text should be included in the accessible name so voice control users can activate the control.",
    steps: [
      "Make the accessible name start with the visible label text.",
      "Avoid aria-label values that replace the visible text with unrelated wording.",
    ],
  },
  "skip-link": {
    summary:
      "The skip link target must exist, be focusable, and move keyboard focus to the main content.",
    steps: [
      "Point the skip link href at an existing element ID.",
      "Add tabindex=\"-1\" to the target and move focus to it when activated.",
    ],
  },
  "th-has-data-cells": {
    summary: "Header cells must be associated with data cells in a data table.",
    steps: [
      "Use th elements for headers and td elements for data.",
      "Set scope=\"col\" or scope=\"row\" on headers to clarify their relationship.",
    ],
  },
  "td-headers-attr": {
    summary:
      "Cells that use the headers attribute must reference existing header cells.",
    steps: [
      "Verify each ID referenced by headers belongs to a th element.",
      "Prefer scope attributes where they are sufficient.",
    ],
  },
  "autocomplete-valid": {
    summary:
      "Autocomplete values must describe the field accurately to help users complete forms.",
    steps: [
      "Replace invalid autocomplete values with a valid token such as email, given-name, or current-password.",
      "Use the section-*, shipping, or billing prefixes when multiple fields share a purpose.",
    ],
  },
  "valid-lang": {
    summary: "Language changes must use valid language tags.",
    steps: [
      "Replace the invalid lang value with a valid BCP 47 tag.",
      "Remove lang attributes from elements that are not actually in another language.",
    ],
  },
};

const GENERIC_REMEDIATION: RemediationTemplate = {
  summary:
    "Review the affected element against the rule documentation and update the markup or styling.",
  steps: [
    "Use the selector to locate the affected element in the source.",
    "Open the linked rule documentation and compare the element with the expected pattern.",
    "Apply the smallest change that fixes the underlying pattern, not just this instance.",
    "Re-scan the page and verify with keyboard and screen reader testing.",
  ],
};

export function getRemediation(ruleId: string): Remediation {
  const template = REMEDIATIONS[ruleId] ?? GENERIC_REMEDIATION;
  return { ...template, steps: [...template.steps] };
}
