// The loading cast (dl-7wlo.44) on the System page, at 390 (phone) and 1280 (laptop): each of the 6
// drawings, on the day and the night paper, at its size and its own shape, whole inside the room
// `Loading` holds and centred in it; the drawing moving as an external <img>; and under reduced
// motion every one the still file. happy-dom does no layout, so these are here (AGENTS.md).
//
// The page reads its examples from the api; CI's browser job runs none, so the route is answered
// with what the seed writes, as smoke.spec.ts does.
import { type Language, ROUTES } from "@jadwigo/contracts";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { examplesReply } from "../src/playground/examples/fixture.ts";

const EXAMPLES_PATH = ROUTES.playgroundExamples.path.replace("{language}", "*");
const CAST = ["olowek", "gumka", "linijka"] as const;
/** Each size's drawn width, its range in px, and its own shape (width over height). */
const SIZES = [
  { size: "page", min: 200, max: 320, ratio: 320 / 260 },
  { size: "block", min: 96, max: 112, ratio: 112 / 64 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.route(`**${EXAMPLES_PATH}`, (route) => {
    const language = new URL(route.request().url()).pathname.split("/").pop() as Language;
    return route.fulfill({ json: examplesReply(language) });
  });
});

async function box(locator: Locator): Promise<{ x: number; y: number; w: number; h: number }> {
  const b = await locator.boundingBox();
  if (b === null) throw new Error("not drawn");
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

async function open(page: Page): Promise<Locator> {
  await page.goto("/playground/system#loading");
  const kit = page.locator("section#loading [data-loading-kit]");
  await expect(kit).toBeVisible();
  return kit;
}

test("each drawing keeps its size and shape, whole and centred in its room, day and night", async ({
  page,
}) => {
  const kit = await open(page);
  for (const surface of ["light", "dark"] as const) {
    for (const { size, min, max, ratio } of SIZES) {
      for (const character of CAST) {
        const demo = kit.locator(
          `[data-loading-surface="${surface}"] [data-loading-demo="${character}-${size}"]`,
        );
        const where = `${character} ${size} ${surface}`;
        await expect(demo.getByRole("status"), where).toHaveCount(1);
        const img = demo.locator("img");
        // Shown once the 300 ms have passed; hidden, not absent, before, so the room holds still.
        await expect(img, where).toBeVisible();
        expect(
          await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
        ).toBe(true);
        const art = await box(img);
        const room = await box(demo.getByRole("status"));
        expect(art.w, where).toBeGreaterThanOrEqual(min - 0.5);
        expect(art.w, where).toBeLessThanOrEqual(max + 0.5);
        expect(Math.abs(art.w / art.h - ratio), where).toBeLessThan(0.02);
        // Whole inside its room: nothing clipped, nothing over the edge.
        expect(art.x, where).toBeGreaterThanOrEqual(room.x - 0.5);
        expect(art.y, where).toBeGreaterThanOrEqual(room.y - 0.5);
        expect(art.x + art.w, where).toBeLessThanOrEqual(room.x + room.w + 0.5);
        expect(art.y + art.h, where).toBeLessThanOrEqual(room.y + room.h + 0.5);
        // Centred both ways.
        expect(Math.abs(art.x + art.w / 2 - (room.x + room.w / 2)), where).toBeLessThan(2);
        expect(Math.abs(art.y + art.h / 2 - (room.y + room.h / 2)), where).toBeLessThan(2);
      }
    }
  }
  // The page draws no wider than the screen.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the room holds still while the drawing waits its 300 ms", async ({ page }) => {
  const kit = await open(page);
  const room = kit.locator('[data-loading-demo="olowek-page"]').first();
  const before = await box(room);
  await expect(room.locator("img")).toBeVisible();
  const after = await box(room);
  expect(after.h).toBeCloseTo(before.h, 0);
  expect(after.w).toBeCloseTo(before.w, 0);
});

test("the drawing moves inside its <img>", async ({ page }) => {
  const kit = await open(page);
  const img = kit.locator('[data-loading-surface="light"] [data-loading-demo="olowek-page"] img');
  await expect(img).toBeVisible();
  expect(await img.getAttribute("data-still")).toBeNull();
  const first = await img.screenshot();
  await page.waitForTimeout(700);
  const second = await img.screenshot();
  expect(first.equals(second)).toBe(false);
});

test("under reduced motion every drawing is its still file, and stays still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const kit = await open(page);
  const imgs = kit.locator("[data-slot=loading] img");
  await expect(imgs).toHaveCount(12);
  for (const img of await imgs.all()) await expect(img).toHaveAttribute("data-still", "true");
  const img = kit.locator('[data-loading-surface="light"] [data-loading-demo="gumka-page"] img');
  await expect(img).toBeVisible();
  const first = await img.screenshot();
  await page.waitForTimeout(700);
  expect(first.equals(await img.screenshot())).toBe(true);
  // A change of the setting while the page is open swaps the files back.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(img).not.toHaveAttribute("data-still", "true");
});
