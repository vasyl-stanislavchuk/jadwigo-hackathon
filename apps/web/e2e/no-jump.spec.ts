// The no-jump check (dl-w3.41.8): the lesson player against a real api, one question of each family
// the featured lessons hold, at a phone with touch and at a laptop. On each, the instruction, the
// question card and the footer hold their place through the first edit (a digit typed, an option
// picked) and through Sprawdź, whatever it brings: a miss with its band and marks, or Dobrze! and its
// band. The jumps it holds: the maths line dropping until the first digit (dl-e8ov.2.32.45), and the
// footer or the top bar moving with a transformed container (dl-e8ov.2.32.42).
//
// It runs in the `api` projects, which playwright.config.ts adds when JW_E2E_API=1; play.spec.ts
// says how to run them locally. Nothing here knows an answer: an edit and Sprawdź give a miss or a
// right answer, and both must hold still. "Jeszcze nie wiem" moves on.
import { expect, type Page, test } from "@playwright/test";

/** The featured lessons as the seed writes them, and the families they hold between them. */
const LESSONS = [
  { title: "equal-groups", id: "asg_0ectzj2evqb95a3v1v6wewjzy3" },
  { title: "fives-everywhere", id: "asg_7kb53jh5mhaf4a6enwj43wqt9r" },
  { title: "times-four", id: "asg_4fygf2qfpcakz8rajf3svbpxvm" },
] as const;
const FAMILIES = ["enter", "choose", "sequence", "slots", "place", "group"] as const;

/** The parts that must hold still, top edges in px from the view's top. A part a step does not draw
 * is left out. */
const PARTS = {
  topbar: "[data-step-shell] [data-topbar]",
  instruction: "[data-step-shell] [data-instruction]",
  card: "[data-step-shell] [data-prompt-card]",
  // The text of a maths line with its field in it ("2 × 5 ="), which sat on the empty field's edge.
  line: "[data-step-shell] [data-inline-text]",
  field: '[data-step-shell] [data-area="answer"] [data-field]',
  footer: "[data-step-shell] [data-bar]",
} as const;
type Tops = Partial<Record<keyof typeof PARTS, number>>;

/** Where each part stands once every motion has ended (the band's rise is 260 ms). */
async function tops(page: Page): Promise<Tops> {
  await page.waitForTimeout(700);
  return page.evaluate((parts) => {
    const out: Record<string, number> = {};
    for (const [name, selector] of Object.entries(parts)) {
      const el = document.querySelector(selector);
      if (el !== null) out[name] = Math.round(el.getBoundingClientRect().top * 10) / 10;
    }
    return out;
  }, PARTS);
}

/** The open question's family, from the api replies the page read (a start, a snapshot, a `next`). */
function familyWatch(page: Page): () => string | null {
  let family: string | null = null;
  page.on("response", async (response) => {
    if (!new URL(response.url()).pathname.startsWith("/api/v1/") || !response.ok()) return;
    const body = (await response.json().catch(() => null)) as {
      questions?: { seq: number; question: { family: string } }[];
      open_seq?: number | null;
      next?: { question: { family: string } } | null;
    } | null;
    if (body?.next) family = body.next.question.family;
    else if (body?.questions && body.open_seq != null)
      family = body.questions.find((q) => q.seq === body.open_seq)?.question.family ?? family;
  });
  return () => family;
}

/** The first edit a child makes, by family: a digit where there is a field, else the first option. */
async function edit(page: Page, family: string): Promise<void> {
  const answer = page.locator('[data-step-shell] [data-area="answer"]');
  if (family === "enter" || family === "slots") {
    await answer.locator("[data-field]").first().click();
    await page.keyboard.type("1");
    return;
  }
  const option = answer.locator(
    '[role="radio"], [role="checkbox"], label[data-option], [data-tile]',
  );
  if ((await option.count()) > 0) await option.first().click();
}

/** The rest of the answer, so Sprawdź can judge it: a digit in every field still empty. */
async function complete(page: Page): Promise<void> {
  const fields = page.locator('[data-step-shell] [data-area="answer"] [data-field][data-empty]');
  for (let n = 0; n < 8 && (await fields.count()) > 0; n++) {
    await fields.first().click();
    await page.keyboard.type("1");
  }
}

/** On to the next question: Dalej after a right answer, else "Jeszcze nie wiem", and Dalej again when
 * that shows the solution in place. It returns once the next step is live (its bulb shows) or the
 * results are up, not during the beat between them. */
async function moveOn(page: Page): Promise<void> {
  const next = page.locator("[data-next]");
  const live = page.locator("[data-bulb]").or(page.locator("[data-results]"));
  if (await next.isVisible()) await next.click();
  else {
    await page.locator("[data-bulb]").click();
    await page.locator("[data-dont-know]").click();
    await expect(page.locator("[data-dont-know]")).toBeHidden();
    await expect(live.or(next)).toBeVisible();
    if (await next.isVisible()) await next.click();
  }
  await expect(live).toBeVisible();
}

test("the top bar, instruction, card, field and footer hold still through an edit and Sprawdź, in every family", async ({
  page,
}) => {
  // 3 lessons, about 20 steps, each edit and check given 700 ms to settle.
  test.setTimeout(180_000);
  const familyOf = familyWatch(page);
  const seen = new Set<string>();
  for (const lesson of LESSONS) {
    await page.goto(`/play/${lesson.id}`);
    const results = page.locator("[data-results]");
    for (let n = 0; n < 12 && seen.size < FAMILIES.length; n++) {
      await expect(page.locator("[data-check]").or(results)).toBeVisible();
      if (await results.isVisible()) break;
      const family = familyOf();
      if (family === null || seen.has(family)) {
        await moveOn(page);
        continue;
      }
      seen.add(family);
      const at = `${lesson.title}, question ${n + 1} (${family})`;
      const before = await tops(page);
      expect(Object.keys(before), at).toEqual(expect.arrayContaining(["card", "footer"]));
      await edit(page, family);
      expect(await tops(page), `${at}: the first edit`).toEqual(before);
      await complete(page);
      const check = page.locator("[data-check]");
      if (await check.isEnabled()) {
        await check.click();
        expect(await tops(page), `${at}: Sprawdź`).toEqual(before);
      }
      await moveOn(page);
    }
  }
  expect([...seen].sort()).toEqual([...FAMILIES].sort());
});
