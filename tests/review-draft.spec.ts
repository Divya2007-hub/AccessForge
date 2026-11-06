import { test, expect, type Page } from "@playwright/test";

const VALID_IMAGE_ALT =
  '<img src="./demo-hero.svg" width="1200" height="700" alt="Two hikers crossing a snowy ridge at sunrise" />';
const PLACEHOLDER_IMAGE_ALT =
  '<img src="./demo-hero.svg" width="1200" height="700" alt="[Describe the image purpose] hikers on a ridge" />';

async function openImageAltItem(page: Page) {
  await expect(page.getByText(/fix 1 of \d+/i).first()).toBeVisible();

  const heading = page.getByRole("heading", {
    name: "Images must have alternative text",
    exact: true,
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if ((await heading.count()) > 0) break;
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }

  await expect(heading).toBeVisible();
}

test("saves valid edits, blocks placeholders, and keeps the current draft at the cap", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto("/scanner");
  await page.getByRole("button", { name: /run demo audit/i }).click();
  await page.waitForURL(/\/report\/[^/]+$/, { timeout: 90_000 });
  const reportId = new URL(page.url()).pathname.split("/").pop();
  if (!reportId) throw new Error("The demo report did not include an id.");
  const targetId = `${reportId}:image-alt:0`;

  await page
    .getByRole("main")
    .getByRole("link", { name: "Review fixes", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/review\?report=/);
  await openImageAltItem(page);

  const approve = page.getByRole("button", { name: "Approve this fix" });
  const editor = page.getByLabel("Suggested code");
  const savedMessage = page.getByText("Draft saved in this browser.");

  await expect(approve).toBeDisabled();

  await editor.fill(VALID_IMAGE_ALT);
  await page.getByRole("button", { name: "Save my edit" }).click();
  await expect(savedMessage).toBeVisible();
  await expect(approve).toBeEnabled();

  await editor.fill(PLACEHOLDER_IMAGE_ALT);
  await page.getByRole("button", { name: "Save my edit" }).click();
  await expect(savedMessage).toBeVisible();
  await expect(approve).toBeDisabled();

  const placeholderDraft = await page.evaluate((id) => {
    const raw = window.localStorage.getItem("accessforge.review.v1");
    if (!raw) return null;
    const state = JSON.parse(raw) as {
      drafts?: Record<string, { proposed?: string }>;
    };
    return state.drafts?.[id]?.proposed ?? null;
  }, targetId);
  expect(placeholderDraft).toContain("[Describe the image purpose]");

  await page.evaluate(
    ({ id }) => {
      const drafts: Record<string, { proposed: string; updatedAt: string }> =
        {};
      drafts[id] = {
        proposed:
          '<img src="./demo-hero.svg" width="1200" height="700" alt="[Describe the image purpose]" />',
        updatedAt: new Date().toISOString(),
      };
      for (let index = 0; index < 300; index += 1) {
        drafts[`filler-${index}`] = {
          proposed: `<p>filler ${index}</p>`,
          updatedAt: new Date().toISOString(),
        };
      }
      window.localStorage.setItem(
        "accessforge.review.v1",
        JSON.stringify({ version: 1, drafts, events: [] }),
      );
    },
    { id: targetId },
  );

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review fixes" }),
  ).toBeVisible();
  await openImageAltItem(page);
  await expect(editor).toHaveValue(/\[Describe the image purpose\]/);
  await expect(approve).toBeDisabled();

  await editor.fill(VALID_IMAGE_ALT);
  await page.getByRole("button", { name: "Save my edit" }).click();
  await expect(savedMessage).toBeVisible();
  await expect(approve).toBeEnabled();

  const cappedState = await page.evaluate((id) => {
    const raw = window.localStorage.getItem("accessforge.review.v1");
    if (!raw) return { draft: null, count: 0 };
    const state = JSON.parse(raw) as {
      drafts?: Record<string, { proposed?: string }>;
    };
    return {
      draft: state.drafts?.[id]?.proposed ?? null,
      count: Object.keys(state.drafts ?? {}).length,
    };
  }, targetId);

  expect(cappedState.draft).toContain("Two hikers");
  expect(cappedState.count).toBeLessThanOrEqual(300);
});
