// The parent's lesson workspace end to end on the dev route /playground/workspace (dl-uukj.47.27):
// the page opens with the made-up parent's first words waiting, the dev server's engine
// (dev/engine-plugin.ts) runs one scripted turn on an in-memory store with no network, and the
// lesson it drafts lands in the lesson column while the chat says the turn is done. The "builder"
// project runs this against `vite` serve, where the engine plugin lives (playwright.config.ts). The
// columns sit side by side on a laptop and one at a time on a phone: layout claims, so they are here
// and not in happy-dom, which does no layout (dl-5ssh.73). `?pace=` plays a turn stalled or failed.
import { expect, type Page, test } from "@playwright/test";

const FIRST_WORDS = "Dodawanie do 20 dla 1 klasy.";

const chatOf = (page: Page) => page.getByRole("complementary", { name: "Rozmowa" });
const lessonOf = (page: Page) => page.getByRole("region", { name: "Lekcja" });

test("1440: one scripted turn, the message in the chat, the lesson beside it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/playground/workspace");
  const chat = chatOf(page);
  const lesson = lessonOf(page);

  await expect(chat.getByText(FIRST_WORDS)).toBeVisible();
  await expect(page.locator("[data-chat-band] [data-status]")).toHaveText("Gotowe", {
    timeout: 20_000,
  });
  await expect(page.locator("[data-chat-band] [data-live]")).toHaveText("Jadwigo AI: gotowe");
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toBeVisible();
  await expect(lesson.locator("[data-revision]")).toBeVisible();
  await expect(lesson.locator("[data-step]").first()).toBeVisible();

  // Side by side on a laptop: the chat's right edge before the lesson's left, their tops level.
  const left = await chat.boundingBox();
  const right = await lesson.boundingBox();
  expect(left && right && left.x + left.width <= right.x).toBe(true);
  expect(left && right && Math.abs(left.y - right.y) < 2).toBe(true);

  // A reload draws the same conversation again from the log, and sends nothing twice.
  await page.reload();
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toHaveCount(1);
  await expect(chat.getByText(FIRST_WORDS)).toHaveCount(1);
  await expect(lesson.locator("[data-revision]")).toBeVisible();
});

test("390: the turn in Rozmowa, a mark on Lekcja, then the lesson", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground/workspace");
  const tabs = page.getByRole("tablist", { name: "Rozmowa i lekcja" });
  const chatTab = tabs.getByRole("tab", { name: "Rozmowa" });
  const lessonTab = tabs.getByRole("tab", { name: "Lekcja" });
  await expect(chatTab).toHaveAttribute("aria-selected", "true");
  await expect(lessonOf(page)).toBeHidden();

  const box = chatOf(page).getByRole("textbox");
  const fold = await box.boundingBox();
  expect(fold && fold.y + fold.height <= 844).toBe(true);

  await expect(page.locator("[data-chat-band] [data-live]")).toHaveText("Jadwigo AI: gotowe", {
    timeout: 20_000,
  });
  await expect(lessonTab.locator("[data-changed]")).toBeVisible();

  await lessonTab.click();
  await expect(lessonTab).toHaveAttribute("aria-selected", "true");
  await expect(chatOf(page)).toBeHidden();
  await expect(lessonOf(page).locator("[data-step]").first()).toBeVisible();
  await expect(lessonTab.locator("[data-changed]")).toHaveCount(0);
});

test("?pace=stall: the parent's words, then nothing", async ({ page }) => {
  await page.goto("/playground/workspace?pace=stall");
  await expect(chatOf(page).getByText(FIRST_WORDS)).toBeVisible();
  await page.waitForTimeout(3_000);
  await expect(chatOf(page).getByText("Lekcja jest gotowa po prawej.")).toHaveCount(0);
  await expect(lessonOf(page).locator("[data-revision]")).toHaveCount(0);
});

test("?pace=fail: the turn ends failed", async ({ page }) => {
  await page.goto("/playground/workspace?pace=fail");
  await expect(page.locator("[data-chat-band] [data-status]")).toHaveText("Nie udało się", {
    timeout: 20_000,
  });
});
