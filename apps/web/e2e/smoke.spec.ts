// The playground smoke: CI's one real browser (the browser job in .github/workflows/ci.yml), run at
// 390 (phone) and 1280 (laptop). It opens the start page and the System page, and plays one
// question type of Choose, Enter and Slots in Try it: a written miss from "Scenarios to play", then
// the key's right answer by tap or keyboard and Sprawdź. Nothing here is judged: every state the
// page shows is written in the example.
//
// The page reads its examples from GET /api/v1/playground-examples/{language} (dl-w3.75). CI's
// browser job runs no api, so each test answers that route with what the seed writes, compiled
// from the same written examples (src/playground/examples/fixture.ts).
import { type Language, ROUTES } from "@jadwigo/contracts";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { examplesReply } from "../src/playground/examples/fixture.ts";

const EXAMPLES_PATH = ROUTES.playgroundExamples.path.replace("{language}", "*");

test.beforeEach(async ({ page }) => {
  await page.route(`**${EXAMPLES_PATH}`, (route) => {
    const language = new URL(route.request().url()).pathname.split("/").pop() as Language;
    return route.fulfill({ json: examplesReply(language) });
  });
});

/** The playground controls: a column beside the page on a laptop, a drawer on a phone that starts
 * closed. Opens it when it is closed. The playground loads on demand (App.tsx, dl-uukj.32), so the
 * shell is awaited first: before it renders, the column is not there yet and is not closed. */
async function controls(page: Page): Promise<Locator> {
  const toggle = page.getByRole("button", { name: "Controls" });
  await toggle.waitFor();
  const aside = page.getByRole("complementary", { name: "Playground controls" });
  if (!(await aside.isVisible())) await toggle.click();
  await expect(aside).toBeVisible();
  return aside;
}

/** Closes the controls' drawer on a phone, so it covers no part of the step. */
async function closeDrawer(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: "Controls" });
  if (
    (await toggle.getAttribute("aria-pressed")) === "true" &&
    (page.viewportSize()?.width ?? 0) < 1024
  )
    await toggle.click();
}

/** The step's footer, which turns into the verdict band after a check. */
const band = (page: Page): Locator => page.locator("[data-example] [data-bar]");

/** Plays the first written miss in "Scenarios to play" and sees the miss band. */
async function playMiss(page: Page): Promise<void> {
  const aside = await controls(page);
  const miss = aside
    .locator("[data-scenario]")
    .filter({ has: page.locator('[data-outcome="incorrect"]') });
  await miss.first().locator("[data-play]").click();
  await closeDrawer(page);
  await expect(band(page)).toHaveAttribute("data-band", "miss");
}

/** Presses Sprawdź and sees the right band. */
async function checkRight(page: Page): Promise<void> {
  await page.locator("[data-example] [data-check]").click();
  await expect(band(page)).toHaveAttribute("data-band", "right");
}

test("the start page lists every family and its 29 question types, with no lessons", async ({
  page,
}) => {
  await page.goto("/playground");
  await expect(page.getByRole("heading", { name: "Question-type playground" })).toBeVisible();
  await expect(page.locator("[data-family]")).toHaveCount(7);
  const rows = page.locator("[data-question-type-row]");
  await expect(rows).toHaveCount(29);
  await expect(rows.locator("[data-status]")).toHaveCount(29);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\bLessons\b|Whole lessons/);
});

test("every question type opens on an example read from the api", async ({ page }) => {
  await page.goto("/playground");
  const links = page.locator("[data-question-type-link]");
  await expect(links).toHaveCount(29);
  const hrefs = await links.evaluateAll((all) => all.map((a) => a.getAttribute("href") ?? ""));
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.locator("[data-example]").first(), href).toBeVisible();
  }
});

test("the System page draws its sections", async ({ page }) => {
  await page.goto("/playground/system");
  await expect(
    page.getByRole("heading", { level: 1, name: "Zeszyt: the design system" }),
  ).toBeVisible();
  for (const id of ["metaphor", "colour", "components", "frame-rules", "stage", "lines", "rules"])
    await expect(page.locator(`section[id="${id}"]`)).toBeAttached();
});

test("Choose, recognition: a written miss, then the right number by tap", async ({ page }) => {
  await page.goto("/playground/choose/recognition");
  const aside = await controls(page);
  // The language choices are Polish and English, nothing else.
  const language = aside.getByRole("radiogroup", { name: "Language" });
  await expect(language.getByRole("radio")).toHaveText(["Polski", "English"]);
  await playMiss(page);
  // 6 × 8: the key's right answer is 48.
  await page.locator("[data-example]").getByText("48", { exact: true }).click();
  await checkRight(page);
});

test("Enter, production: a written miss, then the right number by keyboard", async ({ page }) => {
  await page.goto("/playground/enter/production");
  await playMiss(page);
  // 7 × 8: the key accepts 56. The keypad hears the keyboard, on a phone too.
  await page.locator("[data-example] [data-field]").first().click();
  await page.keyboard.type("56");
  await checkRight(page);
});

test("Slots, fill_gaps: a written miss, then the gap typed by keyboard", async ({ page }) => {
  await page.goto("/playground/slots/fill_gaps");
  await playMiss(page);
  // 6 × □ = 54: the gap takes 9.
  await page.locator("[data-example] [data-field]").first().click();
  await page.keyboard.type("9");
  await checkRight(page);
});
