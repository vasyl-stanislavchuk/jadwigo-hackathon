// A given lesson's link passed around (dl-1eieq.13, decisions
// 2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the and
// 2026-11-03-a-guest-attempt-on-another-family-s-link-can-be-claimed-by-the-g): a child who is not
// the one named says so, types their name or none, plays, and is offered the save at the end. The
// sharing parent's overview names them.
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { agreeToAi } from "./consent.ts";
import { giveLesson } from "./given.ts";

const LESSON: unknown = JSON.parse(
  readFileSync(new URL("./lessons/given-sums.json", import.meta.url), "utf8"),
);

/** Another child, in another browser, with nobody signed in. */
async function guestOf(page: Page): Promise<Page> {
  const guest = await (
    await page
      .context()
      .browser()
      ?.newContext({
        baseURL: new URL(page.url()).origin,
      })
  )?.newPage();
  if (guest === undefined) throw new Error("no browser");
  await agreeToAi(guest);
  return guest;
}

test.beforeEach(({ page }) => agreeToAi(page));

test("'To nie ja' and a typed name start that player's own attempt, not the child's", async ({
  page,
}) => {
  const path = await giveLesson(page, LESSON);
  const assignment = path.match(/\/play\/([^?]+)/)?.[1] ?? "";
  const guest = await guestOf(page);
  await guest.goto(path);
  await expect(guest.locator("[data-intro-title]")).toBeVisible();
  await expect(guest.locator("[data-intro-yes]")).toContainText("Tymek");
  await guest.locator("[data-intro-not-me]").click();
  const started = guest.waitForResponse((r) =>
    r.url().endsWith(`/assignments/${assignment}/attempts`),
  );
  await guest.locator("[data-intro-name]").fill("Ola");
  await guest.locator("[data-intro-start]").click();
  const { attempt } = (await (await started).json()) as {
    attempt: { learner_id: string | null; player_name: string | null };
  };
  expect(attempt).toMatchObject({ learner_id: null, player_name: "Ola" });
  await guest.reload();
  await expect(guest.locator("[data-intro]")).toHaveCount(0);
  await guest.context().close();

  // The sharing parent sees who played.
  await page.goto(`/parent/assignments/${assignment}`);
  await expect(page.getByText("Ola").first()).toBeVisible();
});

test("a link with no child asks for a name, and 'Zagraj bez imienia' starts with neither", async ({
  page,
}) => {
  const path = await giveLesson(page, LESSON);
  const assignment = path.match(/\/play\/([^?]+)/)?.[1] ?? "";
  const guest = await guestOf(page);
  await guest.goto(`/play/${assignment}`);
  const started = guest.waitForResponse((r) =>
    r.url().endsWith(`/assignments/${assignment}/attempts`),
  );
  await guest.locator("[data-intro-anonymous]").click();
  expect((await started).request().postDataJSON()).toEqual({});
  await guest.context().close();
});
