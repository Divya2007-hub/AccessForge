import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
import type { AxeResults, Result } from "axe-core";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type LaunchOptions,
  type Page,
} from "playwright";
import { getRemediation } from "./remediation";
import { MANUAL_CHECKS } from "./manual-checks";
import { TargetGuard } from "./url-guard";
import { wcagReferences } from "./wcag";
import {
  emptySeverityCounts,
  ScanError,
  type AffectedElement,
  type Impact,
  type NeedsReviewIssue,
  type ScanMode,
  type ScanReport,
  type SeverityCounts,
  type ViolationIssue,
} from "./types";

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
  "best-practice",
];

const VIEWPORT = { width: 1366, height: 900 };
const NAVIGATION_TIMEOUT_MS = 30_000;
const NETWORK_IDLE_TIMEOUT_MS = 3_000;
const AXE_TIMEOUT_MS = 25_000;
const MAX_CONCURRENT_SCANS = Number(
  process.env.ACCESSFORGE_MAX_CONCURRENT_SCANS ?? 2,
);
const MAX_ELEMENTS_PER_RULE = 10;
const MAX_HTML_LENGTH = 600;

let activeScans = 0;

export interface ScanOptions {
  mode: ScanMode;
  url?: string;
}

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ScanError("TIMEOUT", message, 504)),
      milliseconds,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function normalizeImpact(impact: string | null | undefined): Impact {
  if (
    impact === "critical" ||
    impact === "serious" ||
    impact === "moderate" ||
    impact === "minor"
  ) {
    return impact;
  }
  return "minor";
}

function formatSelector(target: Result["nodes"][number]["target"]): string {
  return target
    .map((entry) => (Array.isArray(entry) ? entry.join(" >>> ") : entry))
    .join(" » ");
}

function mapElements(result: Result): AffectedElement[] {
  return result.nodes.slice(0, MAX_ELEMENTS_PER_RULE).map((node) => ({
    selector: formatSelector(node.target) || "Unknown selector",
    html:
      node.html.length > MAX_HTML_LENGTH
        ? `${node.html.slice(0, MAX_HTML_LENGTH)}…`
        : node.html,
    failureSummary: node.failureSummary,
  }));
}

function mapViolation(result: Result): ViolationIssue {
  return {
    ruleId: result.id,
    title: result.help,
    description: result.description,
    impact: normalizeImpact(result.impact),
    wcag: wcagReferences(result.tags),
    tags: result.tags,
    helpUrl: result.helpUrl,
    elementCount: result.nodes.length,
    elements: mapElements(result),
    remediation: getRemediation(result.id),
  };
}

function mapNeedsReview(result: Result): NeedsReviewIssue {
  return {
    ruleId: result.id,
    title: result.help,
    description: result.description,
    impact: normalizeImpact(result.impact),
    wcag: wcagReferences(result.tags),
    helpUrl: result.helpUrl,
    elementCount: result.nodes.length,
  };
}

function calculateSeverity(violations: ViolationIssue[]): SeverityCounts {
  const counts = emptySeverityCounts();
  for (const violation of violations) {
    counts[violation.impact] += 1;
  }
  return counts;
}

async function installRequestGuard(
  context: BrowserContext,
  guard: TargetGuard,
): Promise<void> {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = request.url();

    if (
      requestUrl.startsWith("data:") ||
      requestUrl.startsWith("blob:") ||
      requestUrl.startsWith("about:")
    ) {
      await route.continue();
      return;
    }

    try {
      await guard.assertRequestUrl(requestUrl);
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });
}

function launchOptions(): LaunchOptions {
  const options: LaunchOptions = {
    headless: true,
    args: ["--disable-dev-shm-usage"],
  };

  if (process.env.PLAYWRIGHT_NO_SANDBOX === "true") {
    options.args?.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  return options;
}

function mapPlaywrightError(error: unknown): ScanError {
  if (error instanceof ScanError) return error;

  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Executable doesn't exist") ||
    message.includes("browserType.launch") ||
    message.includes("Failed to launch")
  ) {
    return new ScanError(
      "BROWSER_UNAVAILABLE",
      "Chromium is not available to the scanner. Run `npx playwright install chromium` on the server, then try again.",
      503,
    );
  }

  if (message.includes("ERR_BLOCKED_BY_CLIENT")) {
    return new ScanError(
      "BLOCKED_TARGET",
      "The page tried to load a blocked address, so the scan was stopped.",
      400,
    );
  }

  if (
    message.includes("ERR_NAME_NOT_RESOLVED") ||
    message.includes("ERR_NAME_RESOLUTION_FAILED")
  ) {
    return new ScanError(
      "DNS_FAILURE",
      "The hostname could not be resolved. Check the URL and try again.",
      422,
    );
  }

  if (
    message.includes("Timeout") ||
    message.includes("timeout") ||
    message.includes("ERR_TIMED_OUT")
  ) {
    return new ScanError(
      "TIMEOUT",
      "The page took too long to load. Try a lighter page or try again later.",
      504,
    );
  }

  if (
    message.includes("ERR_CERT") ||
    message.includes("ERR_SSL") ||
    message.includes("ERR_CONNECTION")
  ) {
    return new ScanError(
      "NAVIGATION_FAILED",
      "The browser could not establish a secure connection to that website.",
      502,
    );
  }

  return new ScanError(
    "SCAN_FAILED",
    "The scan could not be completed. The site may block automated browsers or be temporarily unavailable.",
    502,
  );
}

async function navigate(
  page: Page,
  targetUrl: string,
): Promise<{ status: number; title: string }> {
  const response = await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT_MS,
  });

  if (!response) {
    throw new ScanError(
      "NAVIGATION_FAILED",
      "The website did not return a response.",
      502,
    );
  }

  const status = response.status();
  if (status >= 400) {
    throw new ScanError(
      "NAVIGATION_FAILED",
      `The website returned HTTP ${status}. AccessForge can only audit pages it can load successfully.`,
      422,
    );
  }

  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
    .catch(() => undefined);

  const title = await page.title().catch(() => "");
  return { status, title: title.trim() || "Untitled page" };
}

async function resolveDemoFile(): Promise<string> {
  const filePath = path.join(process.cwd(), "demo-site", "index.html");
  try {
    await access(filePath);
    return filePath;
  } catch {
    throw new ScanError(
      "SCAN_FAILED",
      "The bundled demo site could not be found. Expected demo-site/index.html in the project root.",
      500,
    );
  }
}

export async function runScan(options: ScanOptions): Promise<ScanReport> {
  if (activeScans >= MAX_CONCURRENT_SCANS) {
    throw new ScanError(
      "BUSY",
      "The scanner is handling other audits right now. Please try again in a moment.",
      503,
    );
  }

  activeScans += 1;
  const startedAt = Date.now();
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    const mode = options.mode;
    let navigationUrl: string;
    let requestedUrl: string;
    let displayFinalUrl: string;
    let guard: TargetGuard | undefined;

    if (mode === "remote") {
      if (!options.url) {
        throw new ScanError("INVALID_URL", "A URL is required.", 400);
      }
      guard = new TargetGuard();
      const target = await guard.assertAllowed(options.url);
      navigationUrl = target.url.toString();
      requestedUrl = target.url.toString();
      displayFinalUrl = target.url.toString();
    } else {
      const demoFile = await resolveDemoFile();
      navigationUrl = pathToFileURL(demoFile).toString();
      requestedUrl = "Bundled demo site";
      displayFinalUrl = "Bundled demo site (demo-site/index.html)";
    }

    try {
      browser = await chromium.launch(launchOptions());
    } catch (error) {
      throw mapPlaywrightError(error);
    }

    const browserVersion = browser.version();

    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: "light",
      locale: "en-US",
      serviceWorkers: "block",
      acceptDownloads: false,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
    });

    if (guard) {
      await installRequestGuard(context, guard);
    }

    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.on("dialog", (dialog) => dialog.dismiss().catch(() => undefined));
    page.on("popup", (popup) => popup.close().catch(() => undefined));

    const { title } = await navigate(page, navigationUrl);

    if (guard) {
      await guard.assertAllowed(page.url());
      displayFinalUrl = page.url();
    }

    let results: AxeResults;
    try {
      results = await withTimeout(
        new AxeBuilder({ page }).withTags(AXE_TAGS).analyze(),
        AXE_TIMEOUT_MS,
        "The accessibility analysis took too long to complete.",
      );
    } catch (error) {
      throw mapPlaywrightError(error);
    }

    const violations = results.violations.map(mapViolation);
    const needsReview = results.incomplete.map(mapNeedsReview);
    const severity = calculateSeverity(violations);
    const affectedElements = violations.reduce(
      (total, violation) => total + violation.elementCount,
      0,
    );

    const notes = [
      "Automated checks cover a subset of accessibility requirements. A clean scan does not prove WCAG compliance.",
      "This audit covers one page at a 1366×900 desktop viewport using a light color scheme. Responsive breakpoints, mobile layouts, other pages, and dark-mode states were not scanned.",
      "axe-core flags patterns that need human verification. Findings marked as needing review were not counted as violations.",
    ];

    if (mode === "demo") {
      notes.unshift(
        "This is a real scan of the bundled demo-site/index.html file. No external website was fetched.",
      );
    }

    return {
      id: randomUUID(),
      mode,
      requestedUrl,
      finalUrl: displayFinalUrl,
      pageTitle: title,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      viewport: VIEWPORT,
      engine: {
        name: results.testEngine.name || "axe-core",
        version: results.testEngine.version,
        tags: AXE_TAGS,
        browser: `Chromium ${browserVersion} (Playwright)`,
      },
      stats: {
        violationRules: violations.length,
        affectedElements,
        needsReviewRules: needsReview.length,
        automatedRulePasses: results.passes.length,
        severity,
      },
      violations,
      needsReview,
      manualChecks: MANUAL_CHECKS,
      notes,
    };
  } catch (error) {
    throw mapPlaywrightError(error);
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    activeScans = Math.max(0, activeScans - 1);
  }
}
