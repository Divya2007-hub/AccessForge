const CRITERION_TAG = /^wcag(\d)(\d)(\d{1,2})$/;

const LEVEL_TAGS: Array<{ tag: string; level: "A" | "AA" | "AAA" }> = [
  { tag: "wcag2aaa", level: "AAA" },
  { tag: "wcag2aa", level: "AA" },
  { tag: "wcag2a", level: "A" },
  { tag: "wcag21aaa", level: "AAA" },
  { tag: "wcag21aa", level: "AA" },
  { tag: "wcag21a", level: "A" },
  { tag: "wcag22aaa", level: "AAA" },
  { tag: "wcag22aa", level: "AA" },
  { tag: "wcag22a", level: "A" },
];

export function wcagReferences(tags: string[]): string[] {
  const references = new Set<string>();

  for (const tag of tags) {
    const match = CRITERION_TAG.exec(tag);
    if (match) {
      references.add(`WCAG ${match[1]}.${match[2]}.${match[3]}`);
    }
  }

  return Array.from(references).sort((a, b) => {
    const left = a.replace("WCAG ", "").split(".").map(Number);
    const right = b.replace("WCAG ", "").split(".").map(Number);
    return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
  });
}

export function wcagLevel(tags: string[]): "A" | "AA" | "AAA" | null {
  for (const { tag, level } of LEVEL_TAGS) {
    if (tags.includes(tag)) return level;
  }
  return null;
}

export function isBestPractice(tags: string[]): boolean {
  return tags.includes("best-practice") && wcagReferences(tags).length === 0;
}
