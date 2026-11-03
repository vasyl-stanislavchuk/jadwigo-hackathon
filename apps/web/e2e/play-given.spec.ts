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

// The queen or Pani Iwona, picked at random (dl-7wlo.43).
const celebration = (page: Page) => page.locator("[data-celebration]");

test.beforeEach(({ page }) => agreeToAi(page));

// dl-1eieq.4: she came and went in about 2 ms in Chromium, which skips the .mov and fires `error`
// at its <source>; the reducer's verdicts were never the cause.
test("a celebration plays at the third right answer in a row in a given lesson", async ({
  page,
}) => {
  await page.goto(await giveLesson(page, LESSON));
  await confirmChild(page);
  await answer(page, "7 + 5", "12");
  await expect(celebration(page)).toHaveCount(0);
  await page.locator("[data-next]").click();
  await answer(page, "8 + 6", "14");
  await expect(celebration(page)).toHaveCount(0);
  await page.locator("[data-next]").click();
  await answer(page, "9 + 4", "13");
  await expect(celebration(page)).toBeVisible();
  await expect(celebration(page).locator("video")).toHaveJSProperty("paused", false);
  // Any tap hides it, Dalej's included; a second needs 3 more rights, and this lesson has 4.
  await page.locator("[data-next]").click();
  await expect(celebration(page)).toHaveCount(0);
  await answer(page, "6 + 6", "12");
  await expect(celebration(page)).toHaveCount(0);
});

// dl-7wlo.43: each character over the lesson on a phone and a laptop, the coin pinned by
// Math.random. Chromium skips the .mov and plays the .webm with its alpha; Safari's HEVC alpha is
// not run here and needs a real Safari smoke. The checks are taken at once: the clip ends in 4 s.
for (const [cast, draw] of [
  ["queen", 0.1],
  ["iwona", 0.9],
] as const) {
  for (const [device, viewport] of [
    ["phone", { width: 390, height: 844 }],
    ["laptop", { width: 1280, height: 800 }],
  ] as const) {
    test(`${cast} on a ${device}: whole, above the footer, no overflow, and a tap on Dalej goes through`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((d) => {
        Math.random = () => d;
      }, draw);
      await page.goto(await giveLesson(page, LESSON));
      await confirmChild(page);
      for (const [sum, value] of [
        ["7 + 5", "12"],
        ["8 + 6", "14"],
      ] as const) {
        await answer(page, sum, value);
        await page.locator("[data-next]").click();
      }
      await answer(page, "9 + 4", "13");
      const shown = page.locator(`[data-celebration="${cast}"]`);
      await expect(shown).toBeVisible();
      const video = shown.locator("video");
      await expect
        .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
        .toBeGreaterThan(0);
      const box = await video.evaluate((v: HTMLVideoElement) => {
        const r = v.getBoundingClientRect();
        const bar =
          document.querySelector("[data-bar]")?.getBoundingClientRect().top ?? innerHeight;
        return {
          src: v.currentSrc,
          shown: r.width / r.height,
          natural: v.videoWidth / v.videoHeight,
          left: r.left,
          right: r.right,
          bottom: r.bottom,
          bar,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      if (cast === "iwona") expect(box.src).toContain("iwona-pl.webm");
      expect(Math.abs(box.shown - box.natural)).toBeLessThan(0.02);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box.bottom).toBeLessThanOrEqual(box.bar + 1);
      expect(box.overflow).toBeLessThanOrEqual(0);
      // The tap reaches Dalej through her and hides her.
      await page.locator("[data-next]").click();
      await expect(shown).toHaveCount(0);
      await expect(page.locator("[data-step-shell]").getByText("6 + 6").first()).toBeVisible();
    });
  }
}

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
