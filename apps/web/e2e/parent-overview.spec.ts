// The parent's lesson overview end to end (dl-uukj.30.4) against the real local api and Postgres:
// a child plays the featured equal-groups lesson, answering 2 × 5 right and saying "Not sure yet"
// to the rest; an adult saves it the way parent.spec.ts does, opens the overview of its assignment
// from the parent home, sees one row and the legend, opens a column's sheet, and follows a cell to
// the attempt's page. On a phone's width the grid scrolls inside its wrapper and the page does not.
//
// It runs only in the `api` project (JW_E2E_API=1), with the api and e2e/auth-server.ts started as
// parent.spec.ts's header says.
import { expect, type Page, test } from "@playwright/test";

/** Plays equal-groups: 2 × 5 right on the first try, "Not sure yet" to every other question. */
async function play(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  await expect(page.locator("[data-step-shell]").getByText("2 × 5").first()).toBeVisible();
  await page.locator("[data-field]").first().click();
  await page.keyboard.type("10");
  await page.locator("[data-check]").click();
  await expect(page.locator("[data-bar]")).toHaveAttribute("data-band", "right");
  await page.locator("[data-next]").click();

  const results = page.locator("[data-results]");
  for (let i = 0; i < 12; i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) return;
    await page.locator("[data-bulb]").click();
    await page.locator("[data-dont-know]").click();
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }
  await expect(results).toBeVisible();
}

/** Follows "Zapisz postępy", signs in with the code, adds a child and lets the claim land. */
async function saveForAChild(page: Page): Promise<void> {
  await page.locator("[data-save-link]").click();
  await page.locator("[data-email]").fill(`rodzic-${Date.now()}@example.com`);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
  await page.locator("[data-first-name]").fill("Ola");
  const claimed = page.waitForResponse(
    (r) => /\/api\/v1\/attempts\/att_[0-9a-z]{26}\/claims$/.test(r.url()) && r.status() === 201,
  );
  await page.locator("[data-add]").click();
  await claimed;
}

test("a parent opens a lesson's overview: one row, the legend, a question's sheet, a cell to the attempt", async ({
  page,
}) => {
  await play(page);
  await saveForAChild(page);

  const lesson = page.locator("[data-learner-card]").locator("li[data-attempt]");
  await expect(lesson).toHaveCount(1);
  await lesson.locator("a[data-overview-link]").click();
  await expect(page).toHaveURL(/\/parent\/assignments\/asg_[0-9a-z]{26}$/);

  // One row, counts and never a percentage, and the legend's 6 outcomes.
  const header = page.locator("[data-overview-header]");
  await expect(header.getByRole("heading", { name: "Równe grupy" })).toBeVisible();
  await expect(header.locator("[data-attempts]")).toHaveAttribute("data-attempts", "1");
  const grid = page.locator("[data-overview-grid]");
  await expect(grid.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("%");
  await expect(page.locator("[data-legend] [data-legend-outcome]")).toHaveCount(6);
  const first = grid.locator("tbody [data-cell]").first();
  await expect(first).toHaveAttribute("data-cell", "first_try");
  await expect(first).toHaveAccessibleName("Pytanie 1: Od razu");

  // A column's sheet: the question and the one attempt's line.
  await grid.getByRole("button", { name: "Pytanie 1" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Pytanie 1" })).toBeVisible();
  await expect(sheet.locator("[data-sheet-line]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // On a phone the grid scrolls inside its wrapper; the page itself does not scroll sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  const widths = await page.evaluate(() => {
    const wrapper = document.querySelector("[data-overview-grid] [data-slot=table-container]");
    return {
      wrapper: wrapper === null ? 0 : wrapper.scrollWidth - wrapper.clientWidth,
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(widths.wrapper).toBeGreaterThan(0);
  expect(widths.page).toBe(0);

  // A cell goes to that attempt's own page.
  await first.click();
  await expect(page).toHaveURL(/\/parent\/attempts\/att_[0-9a-z]{26}\?learner=lrn_[0-9a-z]{26}$/);
  await expect(page.locator("[data-review-header]")).toBeVisible();
});
