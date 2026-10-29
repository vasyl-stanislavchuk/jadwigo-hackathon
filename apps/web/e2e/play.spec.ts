// The lesson player end to end (dl-5ssh.3.1): a child opens the app with no login and plays the
// featured equal-groups lesson against a real api, picked from the home page's list (dl-5ssh.3.6),
// to the congratulation and the list. It runs only in the `api` project, which playwright.config.ts
// adds when JW_E2E_API=1. To run it locally:
//
//   createdb jadwigo_e2e && make migrate db-seed DATABASE_URL=postgresql://localhost:5433/jadwigo_e2e
//   psql postgresql://localhost:5433/jadwigo_e2e \
//     -c "update assignment set after_not_sure = 'twin_now' where id = '0e66bf21-3b77-5a4a-a1ec-3b371dc97fc3'"
//   DATABASE_URL=postgresql://localhost:5433/jadwigo_e2e PORT=8787 bun apps/api/src/serve.ts &
//   cd apps/web && JW_E2E_API=1 JW_API_URL=http://127.0.0.1:8787 bunx playwright test --project=api
//
// The update gives a twin right after "Not sure yet" (twin_now), as the playground's twin-now.sql
// did in david-learns; the seed leaves the featured assignment on `next`, which asks no twin.
//
// The lesson as the seed writes it: 2 × 5, 3 × 4, ordering three products, and a true-or-false.
// The test misses 2 × 5 and then answers it, says "Not sure yet" on 3 × 4 after asking for help and
// answers its twin 3 × 5 after a pause and a reload, and says "Not sure yet" to the rest and their
// twins, which finishes the attempt.
import { expect, type Locator, type Page, test } from "@playwright/test";

const band = (page: Page): Locator => page.locator("[data-bar]");
const field = (page: Page): Locator => page.locator("[data-field]").first();
const fill = (page: Page): Locator => page.locator("[data-progress-fill]");

/** Waits for the top bar to stand at `done` of `total` questions (dl-e8ov.2.32.44). */
async function barAt(page: Page, done: number, total: number): Promise<void> {
  await expect(fill(page)).toHaveAttribute("style", `width: ${Math.round((done / total) * 100)}%;`);
}

/** Types `value` into the question's first field, replacing what is there, and presses Sprawdź. */
async function answer(page: Page, value: string): Promise<void> {
  await field(page).click();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
  await page.locator("[data-check]").click();
}

/** Opens the help note and says "Not sure yet". */
async function notSureYet(page: Page): Promise<void> {
  await page.locator("[data-bulb]").click();
  await page.locator("[data-dont-know]").click();
}

/** Waits for the question whose figure or prompt reads `text`. */
async function onQuestion(page: Page, text: string): Promise<void> {
  await expect(page.locator("[data-step-shell]").getByText(text).first()).toBeVisible();
}

test("a child plays equal-groups to the results, through a miss, a twin, a pause and a reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  await expect(page).toHaveURL(/\/play\/asg_[0-9a-z]{26}$/);

  // 2 × 5: a miss stays on the question, then the right answer and Dalej. The bar is drawn from
  // the 4 planned questions, so it starts at 0 and a quarter is done after the first.
  await onQuestion(page, "2 × 5");
  await barAt(page, 0, 4);
  await answer(page, "7");
  await expect(band(page)).toHaveAttribute("data-band", "miss");
  await answer(page, "10");
  await expect(band(page)).toHaveAttribute("data-band", "right");
  await page.locator("[data-next]").click();

  // 3 × 4: help, then "Not sure yet", and its twin comes next on its own, adding one to the total.
  await onQuestion(page, "3 × 4");
  await barAt(page, 1, 4);
  await notSureYet(page);
  await onQuestion(page, "3 × 5");
  await barAt(page, 2, 5);

  // Pause from the top bar, reload: the lesson waits, and goes back to the same question.
  await page.locator("[data-pause]").click();
  await page.locator("[data-pause-stop]").click();
  await expect(page.locator("[data-paused]")).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-paused]")).toBeVisible();
  await page.locator("[data-resume]").click();
  await onQuestion(page, "3 × 5");
  await barAt(page, 2, 5);
  await answer(page, "15");
  await expect(band(page)).toHaveAttribute("data-band", "right");
  await page.locator("[data-next]").click();

  // The rest: "Not sure yet" on each question and on each twin, until the attempt finishes.
  const results = page.locator("[data-results]");
  for (let i = 0; i < 8 && !(await results.isVisible()); i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) break;
    await notSureYet(page);
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }

  // The end: the congratulation and every question asked, with no score.
  await expect(page.locator("[data-congrats]")).toHaveText("Brawo! To już wszystko na dziś.");
  const rows = results.locator("li[data-seq]");
  await expect(rows).toHaveCount(7);
  await expect(rows.nth(0)).toHaveAttribute("data-ended", "correct");
  await expect(rows.nth(1)).toHaveAttribute("data-ended", "skipped");
  await expect(rows.nth(1)).toHaveAttribute("data-help-used", "1");
  await expect(rows.nth(2)).toHaveAttribute("data-added", "twin");
  await expect(rows.nth(2)).toHaveAttribute("data-ended", "correct");
  await expect(results).not.toContainText("%");
});

test("the gallery still renders at /playground", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByRole("heading", { name: "Question-type playground" })).toBeVisible();
});
