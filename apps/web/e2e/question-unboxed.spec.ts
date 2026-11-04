// The question stands unboxed on the page, and a multi-select tile keeps its word and its checkbox
// inside (dl-uukj.29.168, decision dl-xvtqp). On a phone the question card looked like one more
// option, and "poniedziałek" spilled out of its tile with its checkbox past the tile's left edge.
// happy-dom does no layout, so these claims are held here, in a real browser with the real styles.
//
// As in recognition-tex.spec.ts, the route answers with the seed's examples, here with the
// multi-select question drawn as a grid of words, one of them longer than half a phone.
import { type Language, ROUTES } from "@jadwigo/contracts";
import { expect, test } from "@playwright/test";
import { examplesReply } from "../src/playground/examples/fixture.ts";

const EXAMPLES_PATH = ROUTES.playgroundExamples.path.replace("{language}", "*");
const WORDS = ["warszawa", "pies", "wisła", "poniedziałek", "ania"];

test.beforeEach(async ({ page }) => {
  await page.route(`**${EXAMPLES_PATH}`, (route) => {
    const language = new URL(route.request().url()).pathname.split("/").pop() as Language;
    const reply = examplesReply(language);
    for (const q of reply.questions) {
      if (q.question_type !== "multi_select") continue;
      const data = q.data as { layout: string; options: { id: string; content: unknown }[] };
      data.layout = "grid";
      data.options = WORDS.map((text, i) => ({
        id: data.options[i]?.id ?? `o${i}`,
        content: { kind: "text", text },
      }));
    }
    return route.fulfill({ json: reply });
  });
});

test("Choose, multi-select: the question is unboxed, each tile holds its checkbox and its word", async ({
  page,
}) => {
  await page.goto("/playground/choose/multi_select");
  const tiles = page.locator("[data-example] [data-option][role='checkbox']");
  await expect(tiles.first()).toBeVisible();

  const card = page.locator("[data-example] [data-prompt-card]").first();
  const look = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, border: s.borderTopWidth };
  });
  expect(look.bg).toBe("rgba(0, 0, 0, 0)");
  expect(look.border).toBe("0px");

  const drawn = await tiles.evaluateAll((all) =>
    all.map((tile) => {
      const t = tile.getBoundingClientRect();
      const [box, words] = [...tile.children].filter(
        (c) => !(c as HTMLElement).hasAttribute("data-key-badge"),
      ) as HTMLElement[];
      const b = box?.getBoundingClientRect();
      const w = words?.getBoundingClientRect();
      return {
        tile: { left: t.left, right: t.right },
        box: b === undefined ? null : { left: b.left, right: b.right },
        words: w === undefined ? null : { left: w.left, right: w.right },
        scroll: words === undefined ? 0 : words.scrollWidth - words.clientWidth,
      };
    }),
  );
  expect(drawn.length).toBe(WORDS.length);
  for (const d of drawn) {
    expect(d.box).not.toBeNull();
    expect(d.words).not.toBeNull();
    if (d.box === null || d.words === null) continue;
    expect(d.box.left).toBeGreaterThanOrEqual(d.tile.left);
    expect(d.words.right).toBeLessThanOrEqual(d.tile.right + 0.5);
    expect(d.scroll).toBeLessThanOrEqual(0);
  }
  // The checkboxes of one column stand on one left edge.
  const lefts = drawn.map((d) => Math.round(d.box?.left ?? 0));
  const columns = new Set(lefts);
  expect(columns.size).toBeLessThanOrEqual(2);
});
