// The parent app's frame (dl-uukj.47.4, decision dl-xo0q) and its lesson workspace (dl-uukj.47.5), what happy-dom cannot measure: the one
// 56 px line across the sidebar's logo row and the top bar, the sidebar at 232 px folded to a 60 px
// rail and remembered across a reload, and nothing to press in the top bar on a laptop. Signs in
// with the email code against e2e/auth-server.ts (every code is 123456), with no child: a child is
// never a gate. Runs in the `api` project (JW_E2E_API=1), as parent.spec.ts says how.
import { expect, type Page, test } from "@playwright/test";
import { agreeToAi } from "./consent.ts";

async function signIn(page: Page): Promise<void> {
  await page.goto("/parent");
  await page.locator("[data-email]").fill(`rodzic-${Date.now()}@example.com`);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
  await expect(page.locator("[data-top-bar]")).toBeVisible();
}

const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).first().boundingBox();
  if (found === null) throw new Error(`${selector} is not drawn`);
  return found;
};

test.beforeEach(({ page }) => agreeToAi(page));

test("one 56 px line runs across the logo row and the top bar, which holds the breadcrumb only", async ({
  page,
}) => {
  await signIn(page);
  const bar = await box(page, "[data-top-bar]");
  const logoRow = await box(page, "#parent-sidebar > div:first-child");
  expect(Math.round(bar.height)).toBe(56);
  expect(Math.round(logoRow.height)).toBe(56);
  expect(Math.round(logoRow.y + logoRow.height)).toBe(Math.round(bar.y + bar.height));
  await expect(page.locator("[data-top-bar]").getByRole("button")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Gdzie jesteś" })).toContainText(
    "Lekcje/Nowa lekcja",
  );
});

test("the sidebar is 232 px, folds to a 60 px rail, and stays folded after a reload", async ({
  page,
}) => {
  await signIn(page);
  const sidebar = page.locator("#parent-sidebar");
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(232);
  await page.getByRole("button", { name: "Zwiń menu" }).click();
  await expect(sidebar).toHaveAttribute("data-sidebar", "folded");
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(60);
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-sidebar", "folded");
  await page.getByRole("button", { name: "Rozwiń menu" }).click();
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(232);
});

// The lesson workspace (dl-uukj.47.5): chat 360 | lesson | details folded to its 52 px strip, and
// one 68 px band under the chat and the lesson.
test("the workspace: chat 360, details folded to 52, one 68 px band under the chat and the lesson", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/parent/lessons/cnv_00000000000000000000000001");
  await expect(page.locator("[data-workspace]")).toBeVisible();
  expect(Math.round((await box(page, "#parent-chat")).width)).toBe(360);
  expect(Math.round((await box(page, "#parent-details")).width)).toBe(52);
  const band = await box(page, "[data-chat-band]");
  const footer = await box(page, "[data-lesson-footer]");
  expect(Math.round(band.height)).toBe(68);
  expect(Math.round(footer.height)).toBe(68);
  expect(Math.round(band.y + band.height)).toBe(Math.round(footer.y + footer.height));
  await page.getByRole("button", { name: "Rozwiń szczegóły" }).click();
  await expect.poll(async () => Math.round((await box(page, "#parent-details")).width)).toBe(290);
});
