// The parent's lesson workspace end to end on the dev route /playground/workspace (dl-uukj.47.27):
// the page opens with the made-up parent's first words waiting, the dev server's engine
// (dev/engine-plugin.ts) runs one scripted turn on an in-memory store with no network, and the
// lesson it drafts lands in the lesson column while the chat says the turn is done. The "builder"
// project runs this against `vite` serve, where the engine plugin lives (playwright.config.ts). The
// columns sit side by side on a laptop and one at a time on a phone: layout claims, so they are here
// and not in happy-dom, which does no layout (dl-5ssh.73). `?pace=` plays a turn stalled or failed.
import { expect, type Page, test } from "@playwright/test";

const FIRST_WORDS = "Dodawanie do 20 dla 1 klasy.";

const chatOf = (page: Page) => page.getByRole("region", { name: "Rozmowa" });
const previewOf = (page: Page) => page.locator("[data-preview-dialog]");
const cardOf = (page: Page) => chatOf(page).locator("[data-object-card='lesson']");

test("1440: one scripted turn, the message and the lesson card in the chat alone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/playground/workspace");
  const chat = chatOf(page);

  await expect(chat.locator("[data-from='parent']").getByText(FIRST_WORDS)).toBeVisible();
  await expect(page.locator("[data-chat-band] [data-status]")).toHaveText("Gotowe", {
    timeout: 20_000,
  });
  await expect(page.locator("[data-chat-band] [data-live]")).toHaveText("Jadwigo AI: gotowe");
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toBeVisible();
  await expect(cardOf(page)).toBeVisible();
  // The chat is the only view (dl-1eieq.1): no column, no Pokaż lekcję, no tabs.
  await expect(page.locator("[data-lesson-column]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pokaż lekcję" })).toHaveCount(0);
  await expect(page.getByRole("tablist")).toHaveCount(0);

  // A reload draws the same conversation again from the log, and sends nothing twice.
  await page.reload();
  await expect(chat.getByText("Lekcja jest gotowa po prawej.")).toHaveCount(1);
  // The parent's words, sent once: counted in the parent's own rows, since the lesson card under
  // the turn carries a title that may read the same (dl-uukj.47.58).
  await expect(
    chat.locator("[data-from='parent']").getByText(FIRST_WORDS, { exact: true }),
  ).toHaveCount(1);
});

test("390: the phone shows the chat alone, its composer above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playground/workspace");
  await expect(page.getByRole("tablist")).toHaveCount(0);
  const fold = await chatOf(page).getByRole("textbox").boundingBox();
  expect(fold && fold.y + fold.height <= 844).toBe(true);
  await expect(cardOf(page)).toBeVisible({ timeout: 20_000 });
});

test("?pace=stall: the parent's words, then nothing", async ({ page }) => {
  await page.goto("/playground/workspace?pace=stall");
  await expect(chatOf(page).getByText(FIRST_WORDS)).toBeVisible();
  await page.waitForTimeout(3_000);
  await expect(chatOf(page).getByText("Lekcja jest gotowa po prawej.")).toHaveCount(0);
  await expect(cardOf(page)).toHaveCount(0);
});

test("?pace=fail: the turn ends failed", async ({ page }) => {
  await page.goto("/playground/workspace?pace=fail");
  await expect(page.locator("[data-chat-band] [data-status]")).toHaveText("Nie udało się", {
    timeout: 20_000,
  });
});

// The lesson widget is the one place to act (dl-1eieq.1, decision 2026-11-03-the-lesson-opens-in-
// a-preview-modal-from-an-expand-button-on-the): its expand button opens the preview over the chat,
// closing it leaves the chat where it was, and Daj lekcję gives from the widget itself.
for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`${width}: the widget's expand opens the preview, Escape leaves the chat in place`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/playground/workspace");
    const card = cardOf(page);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => ({
      list: document.querySelector("ol[data-chat-list]")?.scrollTop ?? -1,
      y: window.scrollY,
    }));

    const expand = card.getByRole("button", { name: /^Podgląd lekcji: / });
    await expand.click();
    const preview = previewOf(page);
    await expect(preview).toBeVisible();
    await expect(page).toHaveURL(/[?&]open=lesson%3Acnv_/);
    await expect(preview.locator("[data-preview-body] [data-step]").first()).toBeVisible();
    await expect(preview.locator("[data-preview-actions] [data-give]")).toBeVisible();
    await expect(preview.locator("[data-preview-actions] [data-print]")).toBeVisible();
    const box = await preview.boundingBox();
    // A wide box over the chat on a laptop; the whole screen on a phone.
    if (width < 1024) expect(box && box.width === width && box.height === height).toBe(true);
    else expect(box && box.width > 900 && box.width < width).toBe(true);

    // A reload keeps the preview open: ?open names it.
    await page.reload();
    await expect(previewOf(page).locator("[data-step]").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(previewOf(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]open=/);

    // Opened and closed without a reload, the chat is where it was and the focus is back on expand.
    await expand.click();
    await expect(previewOf(page)).toBeVisible();
    await previewOf(page).getByRole("button", { name: "Zamknij" }).click();
    await expect(previewOf(page)).toHaveCount(0);
    await expect(expand).toBeFocused();
    const after = await page.evaluate(() => ({
      list: document.querySelector("ol[data-chat-list]")?.scrollTop ?? -1,
      y: window.scrollY,
    }));
    expect(after.y).toBe(0);
    expect(Math.abs(after.list - before.list)).toBeLessThan(2);
  });
}

test("1440: Daj lekcję from the widget gives the lesson and opens it here", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/playground/workspace");
  const card = cardOf(page);
  await expect(card).toBeVisible({ timeout: 20_000 });
  // Bez dziecka: Daj lekcję offers this computer or paper.
  await card.locator("[data-give]").click();
  const choices = page.locator("[data-give-dialog]");
  await expect(choices).toBeVisible();
  await choices.locator("[data-give-here]").click();
  // The playground's give answers a made-up assignment, and the player opens on it.
  await expect(page).toHaveURL(/\/play\/asg_/);
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
        scrollY: window.scrollY,
        ancestors,
        moved: (window as unknown as { __moved: string[] }).__moved,
      };
    });
    // The list followed the turn down...
    expect(state.list).toBeGreaterThan(0);
    // ...and nothing else moved.
    expect(state.scrollY).toBe(0);
    expect(state.ancestors).toEqual([]);
    expect(state.moved).toEqual([]);
    await expect(card).toBeInViewport();
    const box = await chatOf(page).getByRole("textbox").boundingBox();
    expect(box && box.y + box.height <= height).toBe(true);
  });
}
