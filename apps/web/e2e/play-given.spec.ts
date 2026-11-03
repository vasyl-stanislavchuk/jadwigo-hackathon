// A lesson given to one child, played the way a child plays it on prod (dl-1eieq.6): the lesson is
// published through the route the app and the MCP use (e2e/given.ts), the child types the answer
// and clicks Sprawdź, and every verdict comes from the real api. e2e/lessons/given-sums.json is 4
// made-up sums; the second is credited to Khan Academy (a made-up ref, no bank content).
//
// It runs only in the `api` project (JW_E2E_API=1), with the api and e2e/auth-server.ts started
// as parent.spec.ts's header says.
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { agreeToAi } from "./consent.ts";
import { confirmChild, giveLesson } from "./given.ts";

const LESSON: unknown = JSON.parse(
  readFileSync(new URL("./lessons/given-sums.json", import.meta.url), "utf8"),
);

/** Waits for the question showing `sum`, types its answer into the field and clicks Sprawdź. */
async function answer(page: Page, sum: string, value: string): Promise<void> {
  await expect(page.locator("[data-step-shell]").getByText(sum).first()).toBeVisible();
  await page.locator("[data-field]").first().click();
  await page.keyboard.type(value);
  await page.locator("[data-check]").click();
  await expect(page.locator("[data-bar]")).toHaveAttribute("data-band", "right");
}

const queen = (page: Page) => page.locator("[data-queen]");

test.beforeEach(({ page }) => agreeToAi(page));

// dl-1eieq.4: she came and went in about 2 ms in Chromium, which skips the .mov and fires `error`
// at its <source>; the reducer's verdicts were never the cause.
test("the queen plays at the third right answer in a row in a given lesson", async ({ page }) => {
  await page.goto(await giveLesson(page, LESSON));
  await confirmChild(page);
  await answer(page, "7 + 5", "12");
  await expect(queen(page)).toHaveCount(0);
  await page.locator("[data-next]").click();
  await answer(page, "8 + 6", "14");
  await expect(queen(page)).toHaveCount(0);
  await page.locator("[data-next]").click();
  await answer(page, "9 + 4", "13");
  await expect(queen(page)).toBeVisible();
  await expect(queen(page).locator("video")).toHaveJSProperty("paused", false);
  // Any tap hides her, Dalej's included, and she never plays again in the lesson.
  await page.locator("[data-next]").click();
  await expect(queen(page)).toHaveCount(0);
  await answer(page, "6 + 6", "12");
  await expect(queen(page)).toHaveCount(0);
});

// dl-1eieq.3: the credit travels from the lesson question to the page and into lesson-kit's
// QuestionCredit, which the instruction row draws.
test("a borrowed question shows 'z Khan Academy', which opens its licence card; our own show none", async ({
  page,
}) => {
  await page.goto(await giveLesson(page, LESSON));
  await confirmChild(page);
  const trigger = page.locator("[data-credit-trigger]");
  await expect(page.locator("[data-step-shell]").getByText("7 + 5").first()).toBeVisible();
  await expect(trigger).toHaveCount(0);
  await answer(page, "7 + 5", "12");
  await page.locator("[data-next]").click();

  await expect(page.locator("[data-step-shell]").getByText("8 + 6").first()).toBeVisible();
  await expect(trigger).toHaveText("z Khan Academy");
  await trigger.click();
  const card = page.locator("[data-credit-card]");
  await expect(card).toBeVisible();
  await expect(card.locator("[data-credit-licence]")).toContainText("CC BY-NC-SA 4.0");
  await expect(card.locator("[data-credit-not-affiliated]")).toBeVisible();
});
