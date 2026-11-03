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
  // The chat is the main view; the lesson opens beside it from "Pokaż lekcję" (2026-11-02).
  await page.getByRole("button", { name: "Pokaż lekcję" }).click();
  const chat = chatOf(page);
  const lesson = lessonOf(page);

  await expect(chat.locator("[data-from='parent']").getByText(FIRST_WORDS)).toBeVisible();
  await expect(page.locator("[data-chat-band] [data-status]")).toHaveText("Gotowe", {
    timeout: 20_000,
  });
  await expect(page.locator("[data-chat-band] [data-live]")).toHaveText("Jadwigo AI: gotowe");
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toBeVisible();
  await expect(lesson.locator("[data-revision]")).toBeVisible();
  await expect(lesson.locator("[data-step]").first()).toBeVisible();

  // Side by side on a laptop: the chat's right edge before the lesson's left, their tops level.
  const left = await chat.boundingBox();
  // The column, not the pane inside it, which carries the same name.
  const right = await page.locator("[data-lesson-column]").boundingBox();
  expect(left && right && left.x + left.width <= right.x).toBe(true);
  expect(left && right && Math.abs(left.y - right.y) < 2).toBe(true);

  // A reload draws the same conversation again from the log, and sends nothing twice.
  await page.reload();
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toHaveCount(1);
  // The parent's words, sent once: counted in the parent's own rows, since the lesson card under
  // the turn carries a title that may read the same (dl-uukj.47.58).
  await expect(
    chat.locator("[data-from='parent']").getByText(FIRST_WORDS, { exact: true }),
  ).toHaveCount(1);
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

// The lesson-ready card (dl-uukj.47.58): the chat alone, then a click on the card under the turn
// opens the lesson beside it on a laptop, and brings Lekcja to the front on a phone.
test("1440: the lesson card opens the lesson beside the chat", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/playground/workspace");
  const chat = chatOf(page);
  const card = chat.locator("[data-object-card='lesson']");
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-lesson-column]")).toBeHidden();

  await card.getByRole("button", { name: /^Otwórz lekcję: / }).click();
  await expect(lessonOf(page).locator("[data-step]").first()).toBeVisible();
  await expect(page).toHaveURL(/[?&]open=lesson%3Acnv_/);
  const left = await chat.boundingBox();
  const right = await page.locator("[data-lesson-column]").boundingBox();
  expect(left && right && left.x + left.width <= right.x).toBe(true);

  // A reload keeps the lesson open: ?open names it.
  await page.reload();
  await expect(lessonOf(page).locator("[data-step]").first()).toBeVisible();
});

test("390: the lesson card brings Lekcja to the front", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground/workspace");
  const card = chatOf(page).locator("[data-object-card='lesson']");
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.getByRole("button", { name: /^Otwórz lekcję: / }).click();
  const lessonTab = page
    .getByRole("tablist", { name: "Rozmowa i lekcja" })
    .getByRole("tab", { name: "Lekcja" });
  await expect(lessonTab).toHaveAttribute("aria-selected", "true");
  await expect(chatOf(page)).toBeHidden();
  await expect(lessonOf(page).locator("[data-step]").first()).toBeVisible();
});

// The turn that ends in the lesson-ready card scrolls only the message list (dl-uukj.47.68): the
// owner saw the whole window jump on a wide screen with the lesson closed, the composer left at the
// top over blank space. A short window makes the scripted turn overflow the list, so the follow has
// to scroll; every scroll during the turn is recorded, not just the end state, so a jump the page
// later scrolls back still fails here.
for (const [width, height] of [
  [2000, 480],
  [1280, 480],
] as const) {
  test(`${width}: the lesson-ready card lands with only the message list scrolled`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      const moved: string[] = [];
      (window as unknown as { __moved: string[] }).__moved = moved;
      document.addEventListener(
        "scroll",
        (e) => {
          const t = e.target;
          if (t === document || t === document.documentElement || t === document.body) {
            if (window.scrollY !== 0) moved.push(`window:${window.scrollY}`);
            return;
          }
          if (!(t instanceof Element) || t.matches("ol[data-chat-list]")) return;
          if (t.scrollTop !== 0) moved.push(`${t.tagName.toLowerCase()}:${t.scrollTop}`);
        },
        { capture: true },
      );
    });
    await page.goto("/playground/workspace");
    const card = chatOf(page).locator("[data-object-card='lesson']");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-lesson-column]")).toBeHidden();
    // Past the follow's smooth scroll.
    await page.waitForTimeout(800);

    const state = await page.evaluate(() => {
      const list = document.querySelector("ol[data-chat-list]");
      const ancestors: string[] = [];
      for (let el = list?.parentElement ?? null; el !== null; el = el.parentElement)
        if (el.scrollTop !== 0) ancestors.push(`${el.tagName.toLowerCase()}:${el.scrollTop}`);
      return {
        list: list?.scrollTop ?? 0,
        // Nothing in the page reaches below the window, so there is nothing to scroll the page by.
        overflow: document.documentElement.scrollHeight - window.innerHeight,
        scrollY: window.scrollY,
        ancestors,
        moved: (window as unknown as { __moved: string[] }).__moved,
      };
    });
    // The list followed the turn down...
    expect(state.list).toBeGreaterThan(0);
    // ...and nothing else moved.
    expect(state.scrollY).toBe(0);
    expect(state.overflow).toBe(0);
    expect(state.ancestors).toEqual([]);
    expect(state.moved).toEqual([]);
    await expect(card).toBeInViewport();
    const box = await chatOf(page).getByRole("textbox").boundingBox();
    expect(box && box.y + box.height <= height).toBe(true);
  });
}
