// A child's page on a phone (dl-uukj.47.21), what happy-dom cannot measure: at 390 x 844 the 4 tabs
// (Przegląd · Umiejętności · Lekcje · Historia) stay one row, and the header's "Nowa lekcja · {name}"
// sits under the name instead of crowding it. Signs in with the email code against
// e2e/auth-server.ts (every code is 123456) and adds a child from the sidebar's "+" on a laptop, then
// opens the child's page at the phone's size. Runs in the `api` project (JW_E2E_API=1), as
// parent.spec.ts says how.
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

test("on a phone the child's 4 tabs share one row, and the header's action sits under the name", async ({
  page,
}) => {
  await signIn(page);
  await page.locator("#parent-sidebar").getByRole("button", { name: "Dodaj dziecko" }).click();
  const dialog = page.getByRole("dialog", { name: "Dodaj dziecko" });
  await dialog.getByRole("textbox").fill("Tymek");
  await dialog.locator("[data-add]").click();
  await expect(dialog).toBeHidden();
  const row = page.locator("#parent-sidebar [data-child-row]").first();
  const href = await row.getAttribute("href");
  if (href === null) throw new Error("the child's row has no link");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(href);
  const tabs = page.getByRole("tablist", { name: "Strony dziecka" }).getByRole("tab");
  await expect(tabs).toHaveCount(4);
  const tops = await Promise.all(
    (await tabs.all()).map(async (tab) => Math.round((await tab.boundingBox())?.y ?? -1)),
  );
  expect(new Set(tops).size).toBe(1);

  // The header: the name and the action never overlap; on a phone the action is under the name.
  const name = await box(page, "[data-child-header] h1");
  const action = await box(page, "[data-new-lesson-for]");
  const overlap =
    name.x < action.x + action.width &&
    action.x < name.x + name.width &&
    name.y < action.y + action.height &&
    action.y < name.y + name.height;
  expect(overlap).toBe(false);
  expect(action.y).toBeGreaterThanOrEqual(name.y + name.height);
  // Nothing on the page is wider than the phone.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(wide).toBeLessThanOrEqual(390);
});
