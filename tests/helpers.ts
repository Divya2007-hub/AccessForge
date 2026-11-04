import { expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

export async function expectNoA11yViolations(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));

  expect(
    summary,
    `${label} has accessibility violations:\n${JSON.stringify(summary, null, 2)}`,
  ).toEqual([]);
}
