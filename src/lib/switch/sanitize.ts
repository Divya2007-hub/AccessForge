const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/g;
const OTHER_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export interface SanitizedText {
  text: string;
  truncated: boolean;
}

export function sanitizeSwitchText(
  value: string,
  options: { maxLength: number; singleLine?: boolean },
): SanitizedText {
  let text = value
    .replace(/\r\n?/g, "\n")
    .replace(BIDI_CONTROLS, "")
    .replace(OTHER_CONTROLS, " ");

  if (options.singleLine) {
    text = text.replace(/\s+/g, " ");
  }

  text = text.trim();
  const truncated = text.length > options.maxLength;
  if (truncated) {
    text = `${text.slice(0, options.maxLength).trimEnd()}...`;
  }

  return { text, truncated };
}
