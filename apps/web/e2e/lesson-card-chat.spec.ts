// The lesson card's layout at 390 and 1440 (dl-uukj.47.71.27; the owner's card delta of 2026-11-03,
// card-ready-390.png): on a phone the foot is 2 rows, Dla on its own, then Daj lekcję full width and
// print, both at least 44 tall, and the open control is a chevron at the right of the prompts; on a
// laptop the foot is one row and the open button sits beside the tag. Layout claims, so they are
// here and not in happy-dom, which does no layout (dl-5ssh.73). The "builder" project runs this
// against `vite` serve, whose engine plays one scripted turn (playwright.config.ts).
import { expect, type Locator, type Page, test } from "@playwright/test";

const cardOf = (page: Page) =>
  page.getByRole("region", { name: "Rozmowa" }).locator("[data-object-card='lesson']").last();

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (found === null) throw new Error("not laid out");
  return found;
}

test("390: Dla on its own row, then Daj lekcję full width and print, 44 tall; the chevron by the prompts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground/workspace");
  const card = cardOf(page);
  await expect(card).toBeVisible({ timeout: 20_000 });
  const [dla, give, print, foot] = await Promise.all([
    box(card.locator("[data-lesson-actions] > div > *").first()),
    box(card.locator("[data-give]")),
    box(card.locator("[data-print]")),
    box(card.locator("[data-card-actions]")),
  ]);
  // Dla stands above the buttons' row.
  expect(dla.y + dla.height).toBeLessThanOrEqual(give.y + 1);
  // Daj lekcję first and wide, print after it, both at least 44 tall.
  expect(give.height).toBeGreaterThanOrEqual(43.5);
  expect(print.height).toBeGreaterThanOrEqual(43.5);
  expect(give.x).toBeLessThan(print.x);
  expect(give.width).toBeGreaterThan(foot.width * 0.6);
  // The open control sits below the title's row, at the right of the prompts.
  const [open, title, prompts] = await Promise.all([
    box(card.locator("[data-expand]")),
    box(card.locator("[data-card-title]")),
    box(card.locator("[data-card-preview]")),
  ]);
  expect(open.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
  expect(open.x).toBeGreaterThan(prompts.x + prompts.width - 1);
});

test("1440: the foot is one row and the open button sits beside the tag", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/playground/workspace");
  const card = cardOf(page);
  await expect(card).toBeVisible({ timeout: 20_000 });
  const [give, print, open, tag] = await Promise.all([
    box(card.locator("[data-give]")),
    box(card.locator("[data-print]")),
    box(card.locator("[data-expand]")),
    box(card.locator("[data-card-tag]")),
  ]);
  expect(Math.abs(give.y + give.height / 2 - (print.y + print.height / 2))).toBeLessThan(2);
  expect(print.x).toBeLessThan(give.x);
  expect(open.x).toBeGreaterThan(tag.x + tag.width - 1);
  expect(open.y).toBeLessThan(tag.y + tag.height);
});
