import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = path.join(root, "demo-site");
const baselinePath = path.join(demoDir, "index.html");
const repairedPath = path.join(demoDir, "index.repaired.html");
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function formatTarget(target) {
  return Array.isArray(target) ? target.join(" ") : String(target);
}

async function openFile(browser, filePath, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(pathToFileURL(filePath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function analyze(page) {
  const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();

  return {
    violations: results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      targets: violation.nodes.map((node) => formatTarget(node.target)),
    })),
  };
}

function printSummary(label, result) {
  const elementCount = result.violations.reduce(
    (total, violation) => total + violation.nodes,
    0,
  );

  console.log(
    `\n${label}: ${result.violations.length} violations / ${elementCount} elements`,
  );

  for (const violation of result.violations) {
    console.log(
      `  - ${violation.id} (${violation.impact ?? "unknown"}): ${violation.nodes} element${violation.nodes === 1 ? "" : "s"}`,
    );
    for (const target of violation.targets) {
      console.log(`      ${target}`);
    }
  }

  return elementCount;
}

async function checkKeyboard(browser) {
  const { context, page } = await openFile(browser, repairedPath, {
    width: 1366,
    height: 900,
  });

  try {
    const searchLink = page.locator('a.icon-button[href="#gear-search"]');
    await searchLink.waitFor({ state: "visible" });
    await searchLink.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.activeElement?.id === "gear-search",
    );

    const afterEnter = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      id: document.activeElement?.id,
      role: document.activeElement?.getAttribute("role"),
    }));

    await page.keyboard.press("Tab");
    const afterTab = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      type: document.activeElement?.getAttribute("type"),
      name: document.activeElement?.getAttribute("name"),
    }));

    check(
      afterEnter.tag === "FORM" &&
        afterEnter.id === "gear-search" &&
        afterEnter.role === "search",
      `Keyboard: expected Enter to focus FORM#gear-search with role="search", got ${JSON.stringify(afterEnter)}`,
    );
    check(
      afterTab.tag === "INPUT" &&
        afterTab.type === "search" &&
        afterTab.name === "q",
      `Keyboard: expected Tab to focus the search input, got ${JSON.stringify(afterTab)}`,
    );

    console.log(
      `\nKeyboard: Enter -> ${afterEnter.tag}#${afterEnter.id}; Tab -> ${afterTab.tag}[type="${afterTab.type}"][name="${afterTab.name}"]`,
    );
  } finally {
    await context.close();
  }
}

async function checkMobile(browser) {
  const { context, page } = await openFile(browser, repairedPath, {
    width: 375,
    height: 667,
  });

  try {
    const searchLinkVisible = await page
      .locator('a.icon-button[href="#gear-search"]')
      .isVisible();
    const gearVisible = await page
      .locator('header.site .nav a[href="#gear"]')
      .isVisible();
    const guidesVisible = await page
      .locator('header.site .nav a[href="#guides"]')
      .isVisible();
    const journalVisible = await page
      .locator('header.site .nav a[href="#journal"]')
      .isVisible();

    check(searchLinkVisible, "Mobile: expected the search link to be visible");
    check(
      !gearVisible && !guidesVisible && !journalVisible,
      "Mobile: expected Gear, Guides, and Journal links to be hidden",
    );

    console.log(
      `\nMobile 375x667: search link visible=${searchLinkVisible}; Gear=${gearVisible}; Guides=${guidesVisible}; Journal=${journalVisible}`,
    );
  } finally {
    await context.close();
  }
}

async function main() {
  await readFile(baselinePath, "utf8");
  await readFile(repairedPath, "utf8");

  const browser = await chromium.launch();

  try {
    const baseline = await openFile(browser, baselinePath, {
      width: 1366,
      height: 900,
    });
    let baselineResult;

    try {
      baselineResult = await analyze(baseline.page);
    } finally {
      await baseline.context.close();
    }

    const repaired = await openFile(browser, repairedPath, {
      width: 1366,
      height: 900,
    });
    let repairedResult;

    try {
      repairedResult = await analyze(repaired.page);
    } finally {
      await repaired.context.close();
    }

    const baselineElements = printSummary(
      "Baseline demo-site/index.html",
      baselineResult,
    );
    const repairedElements = printSummary(
      "Repaired demo-site/index.repaired.html",
      repairedResult,
    );

    const baselineIds = new Set(
      baselineResult.violations.map((violation) => violation.id),
    );
    const repairedIds = new Set(
      repairedResult.violations.map((violation) => violation.id),
    );

    check(
      baselineResult.violations.length === 6,
      `Baseline: expected 6 violations, got ${baselineResult.violations.length}`,
    );
    check(
      baselineElements === 19,
      `Baseline: expected 19 affected elements, got ${baselineElements}`,
    );
    check(
      repairedResult.violations.length === 4,
      `Repaired: expected 4 violations, got ${repairedResult.violations.length}`,
    );
    check(
      repairedElements === 14,
      `Repaired: expected 14 affected elements, got ${repairedElements}`,
    );
    check(
      baselineIds.has("button-name"),
      "Baseline: expected the button-name violation",
    );
    check(
      baselineIds.has("image-alt"),
      "Baseline: expected the image-alt violation",
    );
    check(
      !repairedIds.has("button-name"),
      "Repaired: button-name should be resolved",
    );
    check(
      !repairedIds.has("image-alt"),
      "Repaired: image-alt should be resolved",
    );

    for (const ruleId of repairedIds) {
      check(
        baselineIds.has(ruleId),
        `Repaired: unexpected new rule ${ruleId} that was not in the baseline`,
      );
    }

    await checkKeyboard(browser);
    await checkMobile(browser);
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nAll demo accessibility comparison checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
