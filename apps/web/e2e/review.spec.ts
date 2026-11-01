// The child's lesson review end to end (dl-uukj.30.1): a child plays the featured equal-groups
// lesson against a real api, misses one question, finishes, opens that question from the end list
// and sees the answer given and the right answer under it; a question answered right shows no
// right-answer block. It runs in the `api` project (playwright.config.ts) and needs the same seeded
// database and api as e2e/play.spec.ts, whose header says how to run it locally.
//
// No imported lesson carries reveal lines yet (the importer writes no `why` or worked lines into a
// key), so the speech bubble is checked by the component tests (src/review/ReviewStep.test.tsx).
import { expect, type Locator, type Page, test } from "@playwright/test";

const field = (page: Page): Locator => page.locator("[data-field]").first();
const band = (page: Page): Locator => page.locator("[data-bar]");

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

async function onQuestion(page: Page, text: string): Promise<void> {
  await expect(page.locator("[data-step-shell]").getByText(text).first()).toBeVisible();
}

test("a child finishes a lesson and opens the question it missed, and one it got right", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  await expect(page).toHaveURL(/\/play\/asg_[0-9a-z]{26}$/);

  // 2 × 5 right; 3 × 4 missed with 7, then "Not sure yet"; "Not sure yet" to everything after.
  await onQuestion(page, "2 × 5");
  await answer(page, "10");
  await expect(band(page)).toHaveAttribute("data-band", "right");
  await page.locator("[data-next]").click();
  await onQuestion(page, "3 × 4");
  await answer(page, "7");
  await expect(band(page)).toHaveAttribute("data-band", "miss");
  await notSureYet(page);

  const results = page.locator("[data-results]");
  for (let i = 0; i < 8 && !(await results.isVisible()); i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) break;
    await notSureYet(page);
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }

  // The end: the congratulation first, then the questions as cards.
  await expect(page.locator("[data-congrats]")).toHaveText("Brawo! To już wszystko na dziś.");
  const rows = results.locator("li[data-seq]");
  await expect(rows.nth(0)).toHaveAttribute("data-ended", "correct");
  await expect(rows.nth(1)).toHaveAttribute("data-ended", "skipped");
  // Under it a kind line with no number, the walk from the first question, and each card's answer
  // (dl-uukj.30.6): the right one on the first, the right answer drawn on the skipped one.
  await expect(page.locator("[data-results-summary]")).toContainText("jeszcze poćwiczymy");
  await expect(page.locator("[data-review-walk]")).toHaveAttribute("href", /\/review\/1(\?|$)/);
  await expect(rows.nth(0).locator("[data-card-answer]")).toContainText("10");
  await expect(rows.nth(1).locator("[data-card-answer]")).toContainText("12");
  await expect(results).not.toContainText("%");
  const congrats = await page.locator("[data-congrats]").boundingBox();
  const firstCard = await rows.nth(0).boundingBox();
  expect(congrats !== null && firstCard !== null && congrats.y < firstCard.y).toBe(true);

  // The missed one: the answer given, then the right answer, in view without a tap.
  await rows.nth(1).locator("[data-review-card]").click();
  await expect(page).toHaveURL(/\/play\/asg_[0-9a-z]{26}\/review\/2$/);
  const step = page.locator("[data-review-step]");
  await expect(step.locator("[data-review-title]")).toHaveText(/^Pytanie 2 z \d+$/);
  // The navigator (dl-uukj.30.8): every question, the open one marked, visible without a menu.
  const nav = page.locator("[data-review-nav]");
  await expect(nav).toBeVisible();
  await expect(nav.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(nav.locator('li[data-seq="2"] [aria-current="step"]')).toHaveCount(1);
  await expect(step.locator("[data-review-ended]")).toHaveText("Wrócimy do tego");
  await expect(step.locator("[data-review-answer]")).toContainText("7");
  const solution = step.locator("[data-review-solution]");
  await expect(solution).toContainText("Tak wygląda dobra odpowiedź:");
  await expect(solution).toContainText("12");
  await solution.scrollIntoViewIfNeeded();
  await expect(solution).toBeInViewport();
  await expect(step).not.toContainText("%");

  // A reload on the review path opens the same question again.
  await page.reload();
  await expect(page.locator("[data-review-title]")).toHaveText(/^Pytanie 2 z \d+$/);

  // Back to the list, and the one answered right: no right-answer block, and no arrow back.
  await page.locator("[data-review-all]").click();
  await expect(page.locator("[data-congrats]")).toBeVisible();
  await rows.nth(0).locator("[data-review-card]").click();
  await expect(page.locator("[data-review-title]")).toHaveText(/^Pytanie 1 z \d+$/);
  await expect(page.locator("[data-review-ended]")).toHaveText("Udało się");
  await expect(page.locator("[data-review-answer]")).toContainText("10");
  await expect(page.locator("[data-review-solution]")).toHaveCount(0);
  await expect(page.locator("[data-review-prev]")).toHaveCount(0);
  await page.locator("[data-review-next]").click();
  await expect(page.locator("[data-review-title]")).toHaveText(/^Pytanie 2 z \d+$/);
});
