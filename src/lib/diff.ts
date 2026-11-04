export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export function diffLines(original: string, proposed: string): DiffLine[] {
  const left = original.split("\n");
  const right = proposed.split("\n");
  const table: number[][] = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({
        type: "context",
        text: left[i],
        oldLine,
        newLine,
      });
      i += 1;
      j += 1;
      oldLine += 1;
      newLine += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({
        type: "removed",
        text: left[i],
        oldLine,
        newLine: null,
      });
      i += 1;
      oldLine += 1;
    } else {
      lines.push({
        type: "added",
        text: right[j],
        oldLine: null,
        newLine,
      });
      j += 1;
      newLine += 1;
    }
  }

  while (i < left.length) {
    lines.push({
      type: "removed",
      text: left[i],
      oldLine,
      newLine: null,
    });
    i += 1;
    oldLine += 1;
  }

  while (j < right.length) {
    lines.push({
      type: "added",
      text: right[j],
      oldLine: null,
      newLine,
    });
    j += 1;
    newLine += 1;
  }

  return lines;
}
