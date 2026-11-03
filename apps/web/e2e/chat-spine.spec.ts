// The chat as one story (wave dl-uukj.47.71, handoff docs/worklog/dl-uukj.47.71/2026-11-03-chat-handoff.md):
// its §14 acceptance list, the §3 behaviour that must hold, and the lesson card delta of
// 2026-11-03 (dl-uukj.47.71.22), in a browser, at 1440 and 390. Each state comes from the dev
// engine's scripted paces (/playground/workspace?pace=sNN, dev/paces.ts), which play the real engine
// on ScriptedMuse with no network. The "builder" project runs this against `vite` serve, where the
// engine plugin lives (playwright.config.ts). Layout, colour, focus and scroll claims are here,
// not in happy-dom, which does no layout (dl-5ssh.73).
//
// Not covered, because the scripted engine cannot reach them (dev/paces.ts): s08 (a learner widget),
// s09b (more than 4 sets), s10 (a choose form), s19 (photos and documents), s20's day divider.
// The live region's 6 words wait on dl-uukj.47.71.10. Each state's screenshot is attached to the
// test (and kept under test-results/) for the PR, beside the handoff's PNG; no pixel diff is
// asserted, since the handoff draws made-up lessons the engine does not write.
import { expect, type Locator, type Page, type TestInfo, test } from "@playwright/test";

const SIZES = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

/** The handoff's hues for a verdict, never in the chat outside a result widget (DS S3). */
const VERDICT = ["rgb(196, 64, 47)", "rgb(63, 138, 70)", "rgb(160, 124, 20)"];
/** JSON, verb ids and step ids (§14). */
const ENGINE_TEXT = /[a-z_]+\(|\{|"[a-z_]+":|\bs\d{2}\b/;
/** English the engine writes, which never reaches a parent reading Polish (S3). */
const ENGLISH = /\b(the|and|lesson|step|error|failed|retry|retried|timed out|question|draft)\b/i;
/** A version, gone from the chat and the preview (the card delta, C5). */
const VERSION = /wersj|version \d/i;

const chatOf = (page: Page) => page.getByRole("region", { name: "Rozmowa" });
const spineOf = (page: Page) => chatOf(page).locator("[data-turn='current'] [data-spine]");
const cardOf = (page: Page) => chatOf(page).locator("[data-object-card='lesson']").last();
const composerOf = (page: Page) => chatOf(page).getByRole("textbox");

async function open(
  page: Page,
  pace: string,
  size: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.goto(`/playground/workspace?pace=${pace}`);
  await expect(chatOf(page).locator("[data-from='parent']").first()).toBeVisible();
}

/** Waits for the current turn's spine to read `phase` (its data-spine). */
const phase = (page: Page, value: string, timeout = 20_000) =>
  expect(spineOf(page)).toHaveAttribute("data-spine", value, { timeout });

async function shoot(page: Page, info: TestInfo, state: string, size: string): Promise<void> {
  // Kept under test-results/ beside the run, for the PR's screenshots beside the handoff's PNGs.
  // After every finite animation (a fold, a fade) has ended; the loader turns for ever.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const path = info.outputPath(`${state}-${size}.png`);
  await page.screenshot({ path });
  await info.attach(`${state}-${size}.png`, { path, contentType: "image/png" });
}

/** Every text node in the chat, outside the widgets (a widget may say what a result says). */
const chatTexts = (chat: Locator) =>
  chat.evaluate((root) => {
    const out: string[] = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
      const el = n.parentElement;
      if (el === null || el.closest("[data-widget]") !== null) continue;
      if (el.closest(".sr-only") === null && el.getClientRects().length === 0) continue;
      const text = n.textContent?.trim() ?? "";
      if (text !== "") out.push(text);
    }
    return out;
  });

/** The colours every element in the chat draws with, outside the widgets. */
const chatColours = (chat: Locator) =>
  chat.evaluate((root) => {
    const out = new Set<string>();
    for (const el of root.querySelectorAll("*")) {
      if (el.closest("[data-widget]") !== null) continue;
      const s = getComputedStyle(el);
      for (const c of [s.color, s.backgroundColor, s.borderTopColor, s.fill, s.stroke]) out.add(c);
    }
    return [...out];
  });

/** The §14 words checks, on whatever the chat shows now. */
async function wordsHold(page: Page): Promise<void> {
  const texts = await chatTexts(chatOf(page));
  expect(texts.filter((t) => ENGINE_TEXT.test(t))).toEqual([]);
  expect(texts.filter((t) => ENGLISH.test(t))).toEqual([]);
  const colours = await chatColours(chatOf(page));
  expect(colours.filter((c) => VERDICT.includes(c))).toEqual([]);
}

/** The page itself never scrolls; only the thread does (§3, dl-uukj.47.68). */
const windowStill = async (page: Page) =>
  expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0]);

/** The open stage shows at most 3 lines (D3), and no sentence twice in a row (S2). */
async function openStageHolds(page: Page): Promise<void> {
  const open = spineOf(page).locator("[data-stage='active'] > [data-lines] > [data-line]");
  expect(await open.count()).toBeLessThanOrEqual(3);
  const said = await spineOf(page).locator("[data-line] [data-words]").allTextContents();
  for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
}

type Size = { width: number; height: number };

/** s06: the long turn held on its second check (dev/paces.ts), its 5 replies in. */
async function atSecondCheck(page: Page, size: Size): Promise<void> {
  await open(page, "s06", size);
  await phase(page, "tool");
  await expect(cardOf(page)).toBeVisible({ timeout: 20_000 });
  // 5 scripted replies at 400 ms each, then the second check holds.
  await page.waitForTimeout(4_000);
}

/** s11: the check's model call failed once and came back; the check then holds. */
async function atRetry(page: Page, size: Size): Promise<void> {
  await open(page, "s11", size);
  await phase(page, "tool");
  await expect(cardOf(page)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(3_000);
}

/** s14: the lesson drafted, its check held, then Esc in the composer. */
async function stopped(page: Page, size: Size): Promise<void> {
  await open(page, "s14", size);
  await expect(cardOf(page)).toBeVisible({ timeout: 20_000 });
  await phase(page, "tool");
  await composerOf(page).focus();
  await page.keyboard.press("Escape");
  await phase(page, "cancelled");
}

for (const size of SIZES) {
  test.describe(`at ${size.name}`, () => {
    test("s01, s02: the spine at send, then thinking, with the seconds counting", async ({
      page,
    }, info) => {
      await open(page, "s02", size);
      await expect(spineOf(page)).toBeVisible();
      await shoot(page, info, "s01-queued", size.name);
      await phase(page, "thinking");
      // S9: the spine is the one working indicator, and it is not sticky (§3).
      await expect(chatOf(page).locator("[data-spine]")).toHaveCount(1);
      expect(await spineOf(page).evaluate((el) => getComputedStyle(el).position)).not.toMatch(
        /sticky|fixed/,
      );
      await windowStill(page);
      await wordsHold(page);
      await shoot(page, info, "s02-thinking", size.name);
    });

    test("s03, s04, s05: a tool with the plan, then slow at 20 s, then stalled at 60 s", async ({
      page,
    }, info) => {
      await page.clock.install();
      await open(page, "s03", size);
      await phase(page, "tool");
      await expect(spineOf(page).locator("[data-stage='done']")).toHaveCount(1);
      await expect(spineOf(page).locator("[data-stage='active']")).toHaveCount(1);
      await expect(spineOf(page).locator("[data-stage='todo']")).toHaveCount(1);
      await openStageHolds(page);
      await wordsHold(page);
      await shoot(page, info, "s03-tool-running-plan", size.name);

      await page.clock.fastForward(25_000);
      await phase(page, "slow");
      await expect(spineOf(page).locator("[data-line='slow']")).toHaveCount(1);
      await expect(spineOf(page).locator("[data-foot]")).toHaveCount(0);
      await shoot(page, info, "s04-slow", size.name);

      await page.clock.fastForward(40_000);
      await phase(page, "stalled");
      await expect(spineOf(page).locator("[data-foot='stalled']")).toBeVisible();
      await wordsHold(page);
      await windowStill(page);
      await shoot(page, info, "s05-stalled", size.name);
    });

    test("s06, then s07 and s09: the long turn, one spine, folded to one row at the end", async ({
      page,
    }, info) => {
      await atSecondCheck(page, size);
      // Screen 13 replayed (§14): one spine card, at most 3 lines open, no sentence repeated.
      await expect(chatOf(page).locator("[data-spine]")).toHaveCount(1);
      await openStageHolds(page);
      await wordsHold(page);
      await windowStill(page);
      await shoot(page, info, "s06-long-turn-midway", size.name);
    });

    test("s06: the second visit of a stage reads 'drugi raz' (dl-uukj.47.71.36)", async ({
      page,
    }) => {
      // Red until dl-uukj.47.71.36: every call lands one stage early, so the check's second visit
      // never opens its stage. Remove this mark in the PR that fixes it.
      test.fail();
      await atSecondCheck(page, size);
      await expect(spineOf(page).getByText("drugi raz")).toBeVisible();
    });

    test("s07, s09: the long turn ends as one row that opens and folds on Enter and Space", async ({
      page,
    }, info) => {
      await open(page, "s07", size);
      await phase(page, "done");
      const row = chatOf(page).locator("[data-turn='current'] [data-summary-row]");
      await expect(row).toHaveCount(1);
      await expect(row).toHaveAttribute("aria-expanded", "false");
      await expect(chatOf(page).locator("[data-turn='current'] [data-stage]")).toHaveCount(0);
      await wordsHold(page);
      // Focus stays in the composer when a turn ends (§3).
      await expect(composerOf(page)).toBeFocused();
      await shoot(page, info, "s07-long-turn-finished", size.name);

      await row.focus();
      await page.keyboard.press("Enter");
      await expect(row).toHaveAttribute("aria-expanded", "true");
      await expect(
        chatOf(page).locator("[data-turn='current'] [data-stage]").first(),
      ).toBeVisible();
      await shoot(page, info, "s09-turn-expanded", size.name);
      await page.keyboard.press(" ");
      await expect(row).toHaveAttribute("aria-expanded", "false");

      // A done stage row toggles on Enter too, with aria-expanded.
      await page.keyboard.press("Enter");
      const stage = chatOf(page).locator(
        "[data-turn='current'] [data-stage='done'] [data-stage-row]",
      );
      await stage.first().focus();
      await expect(stage.first()).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Enter");
      await expect(stage.first()).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press(" ");
      await expect(stage.first()).toHaveAttribute("aria-expanded", "false");
    });

    test("s11: a retry is never a box, and the turn goes on", async ({ page }, info) => {
      await atRetry(page, size);
      await expect(spineOf(page).locator("[data-foot]")).toHaveCount(0);
      await expect(chatOf(page).getByRole("alert")).toHaveCount(0);
      await wordsHold(page);
      await shoot(page, info, "s11-retrying", size.name);
    });

    test("s11: the retry is a quiet line in the open stage (dl-uukj.47.71.36)", async ({
      page,
    }) => {
      // Red until dl-uukj.47.71.36: the retry lands in the stage before. Remove this mark then.
      test.fail();
      await atRetry(page, size);
      await expect(
        spineOf(page).locator("[data-stage='active'] [data-line='retry']"),
      ).toBeVisible();
    });

    test("s12: a recovered failure shows only after the turn, inside its opened stage", async ({
      page,
    }, info) => {
      await open(page, "s12", size);
      await phase(page, "done");
      const turn = chatOf(page).locator("[data-turn='current']");
      await expect(turn.locator("[data-line='skip']")).toHaveCount(0);
      await turn.locator("[data-summary-row]").click();
      for (const row of await turn.locator("[data-stage='done'] [data-stage-row]").all())
        await row.click();
      await expect(turn.locator("[data-line='skip']").first()).toBeVisible();
      await wordsHold(page);
      await shoot(page, info, "s12-failed-step-recovered", size.name);
    });

    test("s13: a failed turn is drawn in its spine, the foot retries, and focus stays", async ({
      page,
    }, info) => {
      await open(page, "s13", size);
      await composerOf(page).focus();
      await phase(page, "failed");
      await expect(spineOf(page).locator("[data-foot='failed']")).toBeVisible();
      await expect(spineOf(page).locator("[data-foot='failed'] [data-retry]")).toBeVisible();
      await expect(composerOf(page)).toBeFocused();
      await wordsHold(page);
      await shoot(page, info, "s13-failed-turn", size.name);
    });

    test("s14: Esc during a run stops it, the composer keeps focus, the foot says so", async ({
      page,
    }, info) => {
      await stopped(page, size);
      await expect(spineOf(page).locator("[data-foot='stopped']")).toBeVisible();
      await expect(composerOf(page)).toBeFocused();
      await wordsHold(page);
      await shoot(page, info, "s14-stopped", size.name);
    });

    test("s14: the stopped foot names no version (dl-uukj.47.71.23)", async ({ page }) => {
      // Red until dl-uukj.47.71.23: the foot reads "w wersji {n}" today (the card delta, C5).
      // Remove this mark in the PR that lands it.
      test.fail();
      await stopped(page, size);
      await expect(spineOf(page).locator("[data-foot='stopped']")).not.toHaveText(VERSION);
    });

    test("s14: the running stage takes the square, the rest stay hollow (dl-uukj.47.71.37)", async ({
      page,
    }) => {
      // Red until dl-uukj.47.71.37. Remove this mark in the PR that fixes it.
      test.fail();
      await stopped(page, size);
      await expect(spineOf(page).locator("[data-stage='stopped']")).toHaveCount(1);
      await expect(spineOf(page).locator("[data-stage='failed']")).toHaveCount(0);
    });

    test("s14: a turn stopped before any lesson says 'Zatrzymane.' and no lesson words (dl-uukj.47.71.40)", async ({
      page,
    }) => {
      // Red until dl-uukj.47.71.40. s03 holds the draft, so Esc stops a turn with no lesson yet.
      // Remove this mark in the PR that fixes it.
      test.fail();
      await open(page, "s03", size);
      await phase(page, "tool");
      await composerOf(page).focus();
      await page.keyboard.press("Escape");
      await phase(page, "cancelled");
      const foot = spineOf(page).locator("[data-foot='stopped']");
      await expect(foot).toContainText("Zatrzymane.");
      await expect(foot).not.toContainText(/lekcj/i);
    });

    test("s14: no reply under a turn stopped mid-call (dl-uukj.47.71.38)", async ({ page }) => {
      // Red until dl-uukj.47.71.38: the sentence before the held call shows as the reply.
      test.fail();
      await stopped(page, size);
      await expect(chatOf(page).locator("[data-reply='current']")).toHaveCount(0);
    });

    test("s15: done and ready, the raised card with its tag, 3 prompts at most", async ({
      page,
    }, info) => {
      await open(page, "s15", size);
      await phase(page, "done");
      const card = cardOf(page);
      await expect(card).toHaveAttribute("data-card-state", "ready");
      await expect(card.locator("[data-card-tag]")).toHaveText("Gotowa");
      await cardDeltaHolds(page, card);
      await wordsHold(page);
      await windowStill(page);
      await shoot(page, info, "s15-done-ready", size.name);

      // The preview modal says no version either (C5).
      await card.locator("[data-expand]").click();
      const preview = page.locator("[data-preview-dialog]");
      await expect(preview).toBeVisible();
      await expect(preview).not.toHaveText(VERSION);
    });

    test("s16: a lesson whose check failed is never 'Lekcja gotowa' and never '0 zadań'", async ({
      page,
    }, info) => {
      await open(page, "s16", size);
      await phase(page, "done");
      const card = cardOf(page);
      await expect(card).toHaveAttribute("data-card-state", "fix");
      await expect(card.locator("[data-card-tag]")).toHaveText("Do poprawy");
      await expect(card.locator("[data-finding]").first()).toBeVisible();
      await expect(card.locator("[data-fix]")).toBeVisible();
      await expect(chatOf(page)).not.toContainText("Lekcja gotowa");
      await expect(chatOf(page)).not.toContainText(/\b0 zadań/);
      // The card alone: the reply under it carries the engine's line (dl-uukj.47.71.39, below).
      await cardDeltaHolds(page, card, false);
      await wordsHold(page);
      await shoot(page, info, "s16-done-needs-fixing", size.name);
    });

    test("s16: no version word anywhere in the chat (dl-uukj.47.71.39)", async ({ page }) => {
      // Red until dl-uukj.47.71.39: the engine's "…jej obecna wersja nie przeszła sprawdzenia…"
      // is drawn as the reply. Remove this mark in the PR that fixes it.
      test.fail();
      await open(page, "s16", size);
      await phase(page, "done");
      await expect(chatOf(page)).not.toHaveText(VERSION);
    });

    test("s17, s18: a follow-up waits above the composer, then goes as a steer line", async ({
      page,
    }, info) => {
      await open(page, "s17", size);
      await expect(spineOf(page)).not.toHaveAttribute("data-spine", /done|queued/, {
        timeout: 20_000,
      });
      await composerOf(page).fill("Dodaj jeszcze 2 zadania.");
      await page.keyboard.press("Enter");
      const queued = chatOf(page).locator("[data-queue]");
      await expect(queued).toBeVisible();
      await expect(queued).toContainText("Dodaj jeszcze 2 zadania.");
      await expect(composerOf(page)).toBeFocused();
      await shoot(page, info, "s17-followup-queued", size.name);

      await queued.locator("[data-send-now]").click();
      await expect(queued).toHaveCount(0);
      await wordsHold(page);
      await shoot(page, info, "s18-followup-steered", size.name);
    });

    test("s18: a steer is a line in the open stage, in the parent's words (dl-uukj.47.71.36)", async ({
      page,
    }) => {
      // Red until dl-uukj.47.71.36: the steer lands in the stage before. Remove this mark then.
      test.fail();
      await open(page, "s18", size);
      await expect(spineOf(page)).not.toHaveAttribute("data-spine", /done|queued/, {
        timeout: 20_000,
      });
      await composerOf(page).fill("Dodaj jeszcze 2 zadania.");
      await page.keyboard.press("Enter");
      await chatOf(page).locator("[data-queue] [data-send-now]").click();
      await expect(
        spineOf(page).locator("[data-stage='active'] [data-line='steer']"),
      ).toContainText("Dodaj jeszcze 2 zadania.");
    });

    test("s20: 3 turns restored after a reload, opened at the bottom", async ({ page }, info) => {
      await open(page, "s20", size);
      await phase(page, "done");
      for (const words of ["Zrób ją trochę łatwiejszą.", "Dodaj jedno zadanie z obrazkiem."]) {
        await composerOf(page).fill(words);
        await page.keyboard.press("Enter");
        await expect(chatOf(page).locator("[data-from='parent']").getByText(words)).toBeVisible();
        await phase(page, "done");
      }
      await page.reload();
      await expect(chatOf(page).locator("[data-from='parent'] [data-bubble]")).toHaveCount(3, {
        timeout: 20_000,
      });
      await expect(chatOf(page).locator("[data-turn='older']")).toHaveCount(2);
      await expect(chatOf(page).locator("[data-reply='older']")).toHaveCount(2);
      // Only the newest card lives; the older ones are one-line rows (S7).
      await expect(
        chatOf(page).locator("[data-object-card='lesson']:not([data-card-state='superseded'])"),
      ).toHaveCount(1);
      const list = chatOf(page).locator("[data-chat-list]");
      await expect
        .poll(() => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight))
        .toBeLessThanOrEqual(1);
      await windowStill(page);
      await wordsHold(page);
      await shoot(page, info, "s20-three-turns-restored", size.name);
    });
  });
}

/** The card delta (dl-uukj.47.71.22): the tag alone says the state; 3 prompts at most; one shadow. */
async function cardDeltaHolds(page: Page, card: Locator, wholeChat = true): Promise<void> {
  const prompts = card.locator("[data-card-prompt]");
  const shown = await prompts.count();
  expect(shown).toBeLessThanOrEqual(3);
  const facts = (await card.locator("[data-card-facts]").textContent()) ?? "";
  const count = Number(/\d+/.exec(facts)?.[0] ?? "0");
  expect(count).toBeGreaterThan(0);
  const more = card.locator("[data-card-more]");
  if (count > 3) await expect(more).toHaveText(`+${count - 3} więcej`);
  else await expect(more).toHaveCount(0);
  // The tag is the only place the card's state is written (C4).
  const words = await card.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    // The findings keep their own words (the delta leaves them unchanged).
    for (const part of copy.querySelectorAll("[data-card-tag], [data-card-findings]"))
      part.remove();
    return copy.textContent ?? "";
  });
  expect(words).not.toMatch(/Gotowa|Do poprawy|Zmieniam|Lekcja gotowa|Lekcja do poprawy/);
  await expect(wholeChat ? chatOf(page) : card).not.toHaveText(VERSION);
  // Exactly one element in the chat carries the card's shadow (C1): the living card.
  await page.mouse.move(0, 0);
  const shadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none");
  const shadowed = await chatOf(page)
    .locator("[data-chat-list]")
    .evaluate(
      (list, shadow) =>
        [...list.querySelectorAll("*")]
          .filter((el) => getComputedStyle(el).boxShadow === shadow)
          .map((el) => el.getAttribute("data-object-card") ?? el.tagName.toLowerCase()),
      shadow,
    );
  expect(shadowed).toEqual(["lesson"]);
}

test("the composer shows exactly one focus ring", async ({ page }) => {
  await open(page, "s15", SIZES[0]);
  await phase(page, "done");
  await composerOf(page).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(composerOf(page)).toBeFocused();
  const rings = await chatOf(page)
    .locator("[data-composer]")
    .evaluate((box) =>
      [box, ...box.querySelectorAll("*")]
        .filter((el) => {
          const s = getComputedStyle(el);
          const outline = s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0;
          // A ring is a shadow layer with a colour; Tailwind's empty layers are transparent.
          const layers = s.boxShadow === "none" ? [] : s.boxShadow.split(/,(?![^(]*\))/);
          const ring = layers.some((layer) => !layer.includes("rgba(0, 0, 0, 0)"));
          return outline || ring;
        })
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}${[...el.attributes]
              .filter((x) => x.name.startsWith("data-"))
              .map((x) => `[${x.name}]`)
              .join("")} ${getComputedStyle(el).boxShadow}`,
        ),
    );
  expect(rings).toHaveLength(1);
});

test("the thread follows the bottom only within 80 px of it, and the window never scrolls", async ({
  page,
}) => {
  await open(page, "s17", { width: 390, height: 500 });
  const list = chatOf(page).locator("[data-chat-list]");
  const fromBottom = () => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
  // Two turns, so the thread is taller than the window.
  await phase(page, "done", 30_000);
  await composerOf(page).fill("Dodaj jeszcze 2 zadania.");
  await page.keyboard.press("Enter");
  await expect(spineOf(page)).not.toHaveAttribute("data-spine", "done", { timeout: 10_000 });
  await expect.poll(fromBottom).toBeLessThanOrEqual(80);
  await windowStill(page);
  // Scrolled up past 80 px, the thread holds still and offers Najnowsze.
  await list.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(chatOf(page).locator("[data-newest]")).toBeVisible();
  const held = await list.evaluate((el) => el.scrollTop);
  await phase(page, "done", 30_000);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(held);
  await windowStill(page);
});

test("reduced motion: nothing in the chat moves, and the loader is a still arc", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "s03", SIZES[0]);
  await phase(page, "tool");
  const moving = await chatOf(page).evaluate((root) =>
    [root, ...root.querySelectorAll("*")]
      .filter((el) => {
        const s = getComputedStyle(el);
        // Colour may still ease on hover; nothing fades, grows, folds or turns.
        const animates =
          s.animationName !== "none" && Number.parseFloat(s.animationDuration) > 0.001;
        const moves =
          /height|transform|translate|opacity/.test(s.transitionProperty) &&
          Number.parseFloat(s.transitionDuration) > 0.001;
        return animates || moves;
      })
      .map((el) => {
        const s = getComputedStyle(el);
        return `${el.tagName.toLowerCase()}${[...el.attributes]
          .filter((x) => x.name.startsWith("data-"))
          .map((x) => `[${x.name}]`)
          .join("")} ${s.animationName} ${s.transitionProperty} ${s.transitionDuration}`;
      }),
  );
  expect(moving).toEqual([]);
  await expect(spineOf(page).locator("[data-mark='running']").first()).toBeVisible();
});

test("motion allowed: the loader turns once a second and a new row fades in 160 ms", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, "s03", SIZES[0]);
  await phase(page, "tool");
  const loader = spineOf(page).locator("[data-spine-header] [data-mark='running']");
  expect(await loader.evaluate((el) => getComputedStyle(el).animationDuration)).toBe("1s");
  const row = chatOf(page).locator("[data-chat-row][data-enter]").last();
  expect(await row.evaluate((el) => getComputedStyle(el).animationDuration)).toBe("0.16s");
});
