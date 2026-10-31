// A Choose text option with inline TeX draws as one sentence (dl-a38n.27, #316; dl-a38n.34). The
// option's host stacks its content and note in a column, and the live run's option ("… ma $2$
// pęczki …") once drew one line per fragment there. happy-dom does no layout, so the component test
// holds the structure; this one holds it in a real browser, with the real styles: every formula in
// an option is inline, and no formula is an item of a flex or grid host.
//
// The page reads its examples from the api, which CI's browser job does not run: as in
// smoke.spec.ts, the route answers with the seed's examples, here with each recognition question's
// options rewritten as sentences with inline TeX.
import { type Language, ROUTES } from "@jadwigo/contracts";
import { expect, test } from "@playwright/test";
import { examplesReply } from "../src/playground/examples/fixture.ts";

const EXAMPLES_PATH = ROUTES.playgroundExamples.path.replace("{language}", "*");

/** A sentence long enough to wrap, with numbers as inline TeX. */
const sentence = (n: number): string =>
  `Na stole są $${n}$ talerze. Na każdym talerzu leżą $3$ jabłka. Ile jabłek leży na stole, jeśli policzysz wszystkie talerze po kolei?`;

test.beforeEach(async ({ page }) => {
  await page.route(`**${EXAMPLES_PATH}`, (route) => {
    const language = new URL(route.request().url()).pathname.split("/").pop() as Language;
    const reply = examplesReply(language);
    for (const q of reply.questions) {
      if (q.question_type !== "recognition" || q.family !== "choose") continue;
      const data = q.data as { options: { id: string; content: unknown }[] };
      data.options = data.options.map((o, i) => ({
        ...o,
        content: { kind: "text", text: sentence(i + 2) },
      }));
    }
    return route.fulfill({ json: reply });
  });
});

test("Choose, recognition: an option with inline TeX is one sentence, not one line per fragment", async ({
  page,
}) => {
  await page.goto("/playground/choose/recognition");
  const formulas = page.locator("[data-example] [data-option] [data-formula]");
  await expect(formulas.first()).toBeVisible();
  const drawn = await formulas.evaluateAll((spans) =>
    spans.map((span) => {
      const host = span.parentElement;
      const hostDisplay = host === null ? "" : getComputedStyle(host).display;
      return { display: getComputedStyle(span).display, hostDisplay };
    }),
  );
  expect(drawn.length).toBeGreaterThan(1);
  for (const f of drawn) {
    expect(f.display).toBe("inline");
    expect(f.hostDisplay).not.toMatch(/flex|grid/);
  }
});
