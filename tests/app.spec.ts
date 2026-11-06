import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

test.describe("Accessible application pages", () => {
  test("landing page renders a scan-first experience and passes axe", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /find and fix accessibility issues/i,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Website URL")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /run accessibility scan/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /open dashboard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "AccessForge home" }),
    ).toBeVisible();
    await expectNoA11yViolations(page, "Landing page");
  });

  test("public mobile navigation is keyboard accessible and responsive", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /navigation menu/i });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveAccessibleName("Open navigation menu");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAccessibleName("Close navigation menu");

    const mobileNav = page.getByRole("navigation", {
      name: "Primary mobile",
    });
    await expect(mobileNav).toBeVisible();
    for (const label of [
      "How it works",
      "Dashboard",
      "Review Fixes",
      "Progress",
      "Help",
      "Demo website",
    ]) {
      await expect(
        mobileNav.getByRole("link", { name: new RegExp(label, "i") }).first(),
      ).toBeVisible();
    }

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(overflow.documentWidth).toBeLessThanOrEqual(
      overflow.viewportWidth + 1,
    );

    await expectNoA11yViolations(page, "Mobile navigation open");

    await page.keyboard.press("Tab");
    await expect(
      mobileNav.getByRole("link", { name: "How it works" }),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await expect(mobileNav).toHaveCount(0);

    await trigger.click();
    await mobileNav.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/\/#how-it-works$/);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).toHaveCount(0);

    await trigger.click();
    await mobileNav.getByRole("link", { name: "Help" }).click();
    await expect(page).toHaveURL(/\/help$/);
    await expect(mobileNav).toHaveCount(0);
  });

  test("public desktop navigation includes all workspace links", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const desktopNav = page.getByRole("navigation", { name: "Primary" });
    await expect(desktopNav).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "How it works" }),
    ).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "Help" }),
    ).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "Review Fixes" }),
    ).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "Progress" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /navigation menu/i }),
    ).toBeHidden();
  });

  test("app shell uses minimal navigation and developer mode is opt-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Your scans" }),
    ).toBeVisible();

    const navigation = page.getByRole("navigation", {
      name: "Main",
      exact: true,
    });
    await expect(
      navigation.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("href", "/");
    await expect(navigation.getByRole("link", { name: "My scans" })).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Review fixes" }),
    ).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Progress" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Help" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Workspace" }),
    ).toHaveCount(0);
    await expect(page.getByText("Developer Mode is on.")).toHaveCount(0);

    await page
      .getByRole("button", { name: "Developer mode" })
      .click();
    await expect(page.getByText("Developer Mode is on.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Developer details" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Developer on" }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText("Developer Mode is on.")).toBeVisible();

    await expectNoA11yViolations(page, "Dashboard with developer mode");
  });

  test("dashboard renders the empty state and passes axe", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Your scans" }),
    ).toBeVisible();
    await expect(page.getByText("No saved checks yet")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Check a website" }),
    ).toBeVisible();
    await expect(page.getByText("No scans yet")).toHaveCount(0);
    await expectNoA11yViolations(page, "Dashboard");
  });

  test("help page explains the workflow and passes axe", async ({ page }) => {
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: "How AccessForge works" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The workflow" }),
    ).toBeVisible();
    await expect(page.getByText("Not a compliance certificate")).toBeVisible();
    await expectNoA11yViolations(page, "Help");
  });

  test("scanner validates input and passes axe", async ({ page }) => {
    await page.goto("/scanner");
    await expect(
      page.getByRole("heading", { name: "Check a website" }),
    ).toBeVisible();
    await expect(page.getByText("Scan method")).toHaveCount(0);

    await page.getByRole("button", { name: /run accessibility scan/i }).click();
    await expect(page.getByText("Enter a website URL to scan.")).toBeVisible();

    await expectNoA11yViolations(page, "Scanner");

    await page
      .getByRole("button", { name: "Developer mode" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Scan method" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Safety boundaries" }),
    ).toBeVisible();
  });

  test("scanner blocks localhost through the real API", async ({ page }) => {
    await page.goto("/scanner");
    await page.getByLabel("Website URL").fill("http://127.0.0.1:3100");
    await page.getByRole("button", { name: /run accessibility scan/i }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /scan could not be completed/i }),
    ).toContainText(/only standard ports|blocked/i);
    await expect(
      page.getByRole("button", { name: /run accessibility scan/i }),
    ).toBeEnabled();
  });

  test("review workspace asks for a check when storage is empty", async ({
    page,
  }) => {
    await page.goto("/review");
    await expect(
      page.getByRole("heading", { name: "Review fixes" }),
    ).toBeVisible();
    await expect(page.getByText("There is nothing to review yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Check a website" }).first(),
    ).toBeVisible();

    await expectNoA11yViolations(page, "Fix review empty state");
  });

  test("report shows a plain summary and hides developer details by default", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.goto("/scanner");
    await page.getByRole("button", { name: /run demo audit/i }).click();
    await page.waitForURL(/\/report\/[^/]+$/, { timeout: 90_000 });

    await expect(
      page.getByRole("heading", { name: "Bundled demo site" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What we found" }),
    ).toBeVisible();
    await expect(
      page.getByText("Images must have alternative text").first(),
    ).toBeVisible();
    await expect(
      page.getByText(/no single accessibility score is shown/i),
    ).toBeVisible();
    await expect(page.getByText("The problem").first()).toBeVisible();
    await expect(page.getByText("Who this affects").first()).toBeVisible();
    await expect(page.getByText("Suggested fix").first()).toBeVisible();
    await expect(
      page.getByText("Technical details and affected HTML"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Developer details" }),
    ).toHaveCount(0);

    await expectNoA11yViolations(page, "Demo report");

    await page
      .getByRole("button", { name: "Developer mode" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Developer details" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export JSON" }),
    ).toBeVisible();
    await expect(
      page.getByText("Technical details and affected HTML").first(),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Manual checks" }).click();
    await expect(
      page.getByText(/these checks need a person/i),
    ).toBeVisible();
  });

  test("review flow approves, exports, and reports honest progress", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await page.goto("/scanner");
    await page.getByRole("button", { name: /run demo audit/i }).click();
    await page.waitForURL(/\/report\/[^/]+$/, { timeout: 90_000 });

    const reportUrl = page.url();
    const reportId = new URL(reportUrl).pathname.split("/").pop();
    expect(reportId).toBeTruthy();

    const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumbs.getByRole("link", { name: "My scans" }),
    ).toHaveAttribute("href", "/dashboard");
    await expect(
      breadcrumbs.getByText("Results", { exact: true }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByRole("main")
      .getByRole("link", { name: "Review fixes", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/review\?report=/);
    const reviewUrl = page.url();
    await expect(
      page.getByRole("heading", { name: "Review fixes" }),
    ).toBeVisible();
    await expect(
      breadcrumbs.getByRole("link", { name: "Results" }),
    ).toHaveAttribute("href", `/report/${reportId}`);
    await expect(
      breadcrumbs.getByText("Review fixes", { exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByText(/nothing changes automatically/i),
    ).toBeVisible();
    await expect(
      page.getByText(/fix 1 of \d+/i).first(),
    ).toBeVisible();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const imageHeading = page.getByRole("heading", {
        name: "Images must have alternative text",
        exact: true,
      });
      if ((await imageHeading.count()) > 0) break;
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await expect(
      page.getByRole("heading", {
        name: "Images must have alternative text",
        exact: true,
      }),
    ).toBeVisible();

    const approve = page.getByRole("button", { name: "Approve this fix" });
    await expect(approve).toBeDisabled();

    const editor = page.getByLabel("Suggested code");
    await expect(editor).toHaveValue(/\[Describe the image purpose\]/);
    await editor.fill(
      '<img src="./demo-hero.svg" width="1200" height="700" alt="Two hikers crossing a snowy ridge at sunrise" />',
    );
    await page.getByRole("button", { name: "Save my edit" }).click();
    await expect(page.getByText("Draft saved in this browser.")).toBeVisible();
    await expect(approve).toBeEnabled();

    await page
      .getByLabel("Add a note (optional)")
      .fill("Checked against the hero image.");
    await approve.click();

    await expect(page.getByText("Approved in this browser")).toBeVisible();
    await expect(
      page.getByText(/no files or agents were changed/i),
    ).toBeVisible();
    await expect(page.getByLabel("Suggested code")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Send approved fixes to the agents" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Send suggestions to the Fix Agent" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Developer mode" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Local audit trail" }),
    ).toBeVisible();

    const bundleDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export approved bundle" }).click();
    const bundleDownload = await bundleDownloadPromise;
    expect(bundleDownload.suggestedFilename()).toContain(
      "accessforge-approved-fixes-",
    );
    const bundlePath = await bundleDownload.path();
    expect(bundlePath).not.toBeNull();
    const bundleText = await readFile(bundlePath!, "utf8");
    expect(bundleText).toContain('"approvedChanges": 1');
    expect(bundleText).toContain(
      "Two hikers crossing a snowy ridge at sunrise",
    );
    expect(bundleText).toContain("not an applyable Git patch");

    const diffDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download fragment diff" }).click();
    const diffDownload = await diffDownloadPromise;
    expect(diffDownload.suggestedFilename()).toContain(
      "accessforge-approved-fixes-",
    );
    expect(diffDownload.suggestedFilename()).toContain(".diff");
    const diffPath = await diffDownload.path();
    expect(diffPath).not.toBeNull();
    const diffText = await readFile(diffPath!, "utf8");
    expect(diffText).toContain("# AccessForge approved fragment diff");
    expect(diffText).toContain('+<img src="./demo-hero.svg"');

    await page.getByRole("link", { name: "View progress" }).first().click();
    await expect(page).toHaveURL(/\/progress\?report=/);
    const progressUrl = page.url();
    expect(new URL(progressUrl).searchParams.get("report")).toBe(reportId);
    await expect(
      page.getByRole("heading", { name: "Your progress" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Approved fixes" }),
    ).toBeVisible();
    await expect(
      page.getByText("Images must have alternative text").first(),
    ).toBeVisible();
    await expect(page.getByText("Not tracked here").first()).toBeVisible();
    await expect(
      breadcrumbs.getByRole("link", { name: "Results" }),
    ).toHaveAttribute("href", `/report/${reportId}`);
    await expect(
      breadcrumbs.getByText("Progress", { exact: true }),
    ).toHaveAttribute("aria-current", "page");

    await page.goBack();
    await expect(page).toHaveURL(reviewUrl);
    await page.goForward();
    await expect(page).toHaveURL(progressUrl);

    await page.getByRole("link", { name: "Back to result" }).click();
    await expect(page).toHaveURL(reportUrl);
    await page.getByRole("link", { name: "Back to my scans" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(reviewUrl);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if ((await page.getByText("Approved in this browser").count()) > 0) {
        break;
      }
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    await expect(page.getByText("Approved in this browser")).toBeVisible();
    await page.getByRole("button", { name: "Reopen review" }).click();
    await expect(
      page.getByRole("button", { name: "Approve this fix" }),
    ).toBeVisible();
    await expect(page.getByLabel("Suggested code")).toBeEnabled();
    await expect(page.getByText("Reopened").first()).toBeVisible();

    await expectNoA11yViolations(page, "Fix review");
  });
});

test.describe("Scanner API", () => {
  test("rejects private targets without launching a browser", async ({
    request,
  }) => {
    const response = await request.post("/api/scan", {
      data: { url: "http://169.254.169.254/latest/meta-data" },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("BLOCKED_TARGET");
  });

  test("rejects malformed request bodies", async ({ request }) => {
    const response = await request.post("/api/scan", {
      data: { target: "https://example.com" },
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_URL");
  });

  test("demo audit returns real axe-core findings", async ({ request }) => {
    test.setTimeout(120_000);

    const response = await request.post("/api/demo-scan");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.report.mode).toBe("demo");
    expect(body.report.engine.name).toBe("axe-core");
    expect(body.report.stats.affectedElements).toBeGreaterThan(0);
    expect(body.report.stats.violationRules).toBeGreaterThan(0);
    expect(body.report.manualChecks.length).toBeGreaterThan(0);
    expect(body.report).not.toHaveProperty("score");

    const ruleIds = body.report.violations.map(
      (violation: { ruleId: string }) => violation.ruleId,
    );
    expect(ruleIds).toContain("html-has-lang");
    expect(ruleIds).toContain("image-alt");
    expect(ruleIds).toContain("select-name");
    expect(ruleIds).toContain("button-name");
    expect(ruleIds).toContain("color-contrast");
  });

  test("demo audit flows into a saved report page", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/scanner");
    await page.getByRole("button", { name: /run demo audit/i }).click();
    await page.waitForURL(/\/report\/[^/]+$/, { timeout: 90_000 });

    await expect(
      page.getByRole("heading", { name: "Bundled demo site" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What we found" }),
    ).toBeVisible();
    await expect(
      page.getByText("Images must have alternative text").first(),
    ).toBeVisible();
    await expect(
      page.getByText(/no single accessibility score is shown/i),
    ).toBeVisible();
    await expect(page.getByText("The problem").first()).toBeVisible();
    await expect(page.getByText("Who this affects").first()).toBeVisible();

    await expectNoA11yViolations(page, "Demo report");
  });
});
