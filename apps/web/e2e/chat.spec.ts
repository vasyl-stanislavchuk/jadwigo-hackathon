// The chat page end to end (dl-z5ja.17): a parent's message goes to the dev server's engine
// (dev/engine-plugin.ts), which runs one scripted turn on an in-memory store with no network, and
// the lesson it drafts lands in the right pane while the chat on the left says the turn is done.
// The "builder" project runs this against `vite` serve, where the engine plugin lives
// (playwright.config.ts). The 2 panes sit side by side on a laptop: a layout claim, so it is here
// and not in happy-dom, which does no layout (dl-5ssh.73).
import { expect, test } from "@playwright/test";

test("one scripted turn: the message on the left, the lesson on the right", async ({ page }) => {
  await page.goto("/playground/chat");
  const chat = page.getByRole("region", { name: "Rozmowa" });
  const lesson = page.getByRole("region", { name: "Lekcja" });
  await expect(lesson.getByText("Tu pojawi się lekcja.")).toBeVisible();

  await chat.getByRole("textbox", { name: "Twoja wiadomość" }).fill("Dodawanie do 20 dla 1 klasy.");
  await chat.getByRole("button", { name: "Wyślij" }).click();

  await expect(chat.getByText("Dodawanie do 20 dla 1 klasy.")).toBeVisible();
  await expect(chat.getByRole("status")).toHaveText("Gotowe", { timeout: 20_000 });
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toBeVisible();
  await expect(lesson.locator("[data-revision]")).toBeVisible();
  await expect(lesson.locator("[data-step]").first()).toBeVisible();

  // Side by side on a laptop: the chat's left edge before the lesson's, their tops level.
  const left = await page.locator("[data-pane='chat']").boundingBox();
  const right = await page.locator("[data-pane='lesson']").boundingBox();
  expect(left && right && left.x + left.width <= right.x).toBe(true);
  expect(left && right && Math.abs(left.y - right.y) < 2).toBe(true);

  // A reload draws the same conversation again from the log, with no duplicate.
  await page.reload();
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toHaveCount(1);
  await expect(lesson.locator("[data-revision]")).toBeVisible();
});
