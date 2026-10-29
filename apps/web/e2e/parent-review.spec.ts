// The parent's attempt page end to end (dl-uukj.30.2) against the real local api and Postgres: a
// child plays the featured equal-groups lesson, missing 2 × 5 once before answering it and saying
// "Not sure yet" to the rest; an adult saves it the way parent.spec.ts does, opens it from the
// parent home, sees a tile per question, and opens 2 × 5 to see its 2 tries.
//
// The featured assignment does not hold verdicts, so a wrong try stays open for a retry and no
// question of this run ends `missed` (apps/api/src/attempts.ts, answer()): the question with the
// miss is the one that ends right on its second try. It runs only in the `api` project
// (JW_E2E_API=1), with the api and e2e/auth-server.ts started as parent.spec.ts's header says.
import { expect, type Page, test } from "@playwright/test";

/** Types `value` into the question's first field, replacing what is there, and presses Sprawdź. */
async function answer(page: Page, value: string): Promise<void> {
  await page.locator("[data-field]").first().click();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
  await page.locator("[data-check]").click();
}

/** Plays equal-groups: 2 × 5 missed once and then answered, "Not sure yet" to every other question. */
async function playWithAMiss(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  await expect(page.locator("[data-step-shell]").getByText("2 × 5").first()).toBeVisible();
  await answer(page, "7");
  await expect(page.locator("[data-bar]")).toHaveAttribute("data-band", "miss");
  await answer(page, "10");
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

test("a parent opens a saved lesson, sees a tile per question, and the tries of the one with a miss", async ({
  page,
}) => {
  await playWithAMiss(page);
  await saveForAChild(page);

  const lesson = page.locator("[data-learner-card]").locator("li[data-attempt]");
  await expect(lesson).toHaveCount(1);
  await lesson.locator("a[data-attempt-link]").click();
  await expect(page).toHaveURL(/\/parent\/attempts\/att_[0-9a-z]{26}\?learner=lrn_[0-9a-z]{26}$/);

  // The header counts, never a percentage, and a tile per question asked.
  const header = page.locator("[data-review-header]");
  await expect(header.getByRole("heading", { name: "Równe grupy" })).toBeVisible();
  await expect(header.locator("[data-first-try]")).toHaveAttribute("data-first-try", "0");
  await expect(header).not.toContainText("%");
  const tiles = page.locator("[data-tile]");
  const asked = await header.locator("[data-asked]").getAttribute("data-asked");
  await expect(tiles).toHaveCount(Number(asked));
  await expect(tiles.first()).toHaveAttribute("data-ended", "correct");
  await expect(tiles.nth(1)).toHaveAttribute("data-ended", "skipped");

  // 2 × 5: 2 tries, the miss drawn beside the right answer, then the right one.
  await tiles.first().click();
  await expect(page.locator("[data-review-step]")).toBeVisible();
  const tries = page.locator("[data-tries] [data-try]");
  await expect(tries).toHaveCount(2);
  await expect(tries.first().locator("[data-try-view]")).toBeVisible();
  await expect(tries.nth(1).locator("[data-said]")).toBeVisible();

  // Back to the grid, and from there to the parent home.
  await page.locator("[data-review-all]").click();
  await expect(tiles).toHaveCount(Number(asked));
  await page.locator("[data-parent-home]").click();
  await expect(page).toHaveURL(/\/parent$/);
});
