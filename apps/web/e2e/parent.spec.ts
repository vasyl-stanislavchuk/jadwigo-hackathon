// Parent login end to end (dl-e8ov.2.38) against the real local api and Postgres: a child plays the
// featured equal-groups lesson to the results, an adult follows "Zapisz postępy", signs in with the
// 6-digit email code, the first sign-in makes the account, a child is added, the tab's attempt is
// claimed for them, and the parent home lists it from GET /api/v1/learners/{id}/attempts.
//
// Supabase Auth is e2e/auth-server.ts, which playwright.config.ts starts: every code is 123456, and
// its RS256 key is made for the run. The api verifies the tokens against that key's JWKS. It runs
// only in the `api` project (JW_E2E_API=1). Locally, as play.spec.ts's header says, with the api
// started as:
//
//   DATABASE_URL=postgresql://localhost:5433/jadwigo_e2e PORT=8787 \
//     AUTH_JWKS_URL=http://127.0.0.1:54321/auth/v1/.well-known/jwks.json bun apps/api/src/serve.ts &
import { expect, type Page, test } from "@playwright/test";

/** Opens the help note and says "Not sure yet". */
async function notSureYet(page: Page): Promise<void> {
  await page.locator("[data-bulb]").click();
  await page.locator("[data-dont-know]").click();
}

/** Plays equal-groups from the home page to the results, saying "Not sure yet" to every question. */
async function playToTheEnd(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  const results = page.locator("[data-results]");
  for (let i = 0; i < 12; i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) return;
    await notSureYet(page);
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }
  await expect(results).toBeVisible();
}

/** The role the sign-in button fills with: Zeszyt's ink blue, the Button's primary (dl-uukj.32.11). */
const SEND_CODE_FILL = "--jw-focus";

/**
 * The send-code button's fill, the fill its role resolves to, and its font. A role's value is a
 * var() chain down to a primitive's literal, so a probe element resolves it to the same rgb() a
 * computed background-color reads.
 */
const sendCodeLook = (page: Page): Promise<{ fill: string; role: string; font: string }> =>
  page.evaluate((role) => {
    const button = document.querySelector("[data-send-code]");
    if (button === null) throw new Error("no [data-send-code]");
    const probe = document.createElement("span");
    probe.style.backgroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue(role)
      .trim();
    document.body.append(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const look = getComputedStyle(button);
    return { fill: look.backgroundColor, role: resolved, font: look.fontFamily };
  }, SEND_CODE_FILL);

const storedAttempts = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    Object.keys(window.sessionStorage).filter((key) => key.startsWith("jw.play.attempt.")),
  );

test("an adult saves a finished lesson: email code, account, a child, the claim, the parent home", async ({
  page,
}) => {
  const email = `rodzic-${Date.now()}@example.com`;
  await playToTheEnd(page);
  expect(await storedAttempts(page)).toHaveLength(1);
  await page.locator("[data-save-link]").click();
  await expect(page).toHaveURL(/\/parent\?claim=asg_[0-9a-z]{26}/);

  // The sign-in page is Zeszyt at a phone's width and a laptop's: the button in its blue, in Andika.
  await expect(page.locator("[data-send-code]")).toBeVisible();
  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    const look = await sendCodeLook(page);
    // An unset role resolves to transparent, which would match nothing on purpose.
    expect(look.role).not.toBe("rgba(0, 0, 0, 0)");
    expect(look.fill).toBe(look.role);
    expect(look.font).toMatch(/^"?Andika/);
  }

  await page.locator("[data-email]").fill(email);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("654321");
  await page.locator("[data-sign-in]").click();
  await expect(page.locator("[data-problem]")).toBeVisible();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();

  // A new account has no child yet: the form comes first, and the claim follows the add.
  await page.locator("[data-first-name]").fill("Ola");
  const claimed = page.waitForResponse(
    (r) => /\/api\/v1\/attempts\/att_[0-9a-z]{26}\/claims$/.test(r.url()) && r.status() === 201,
  );
  await page.locator("[data-add]").click();
  await claimed;

  const card = page.locator("[data-learner-card]");
  await expect(card.getByRole("heading", { name: "Ola" })).toBeVisible();
  const lesson = card.locator("li[data-attempt]");
  await expect(lesson).toHaveCount(1);
  await expect(lesson.getByText("Równe grupy")).toBeVisible();
  await expect(lesson.locator("li[data-seq]").first()).toHaveAttribute("data-ended", "skipped");
  await expect(page).toHaveURL(/\/parent$/);
  expect(await storedAttempts(page)).toEqual([]);

  // A reload keeps the session (supabase-js's storage) and the home, with no second claim to make.
  await page.reload();
  await expect(page.locator("[data-learner-card]").locator("li[data-attempt]")).toHaveCount(1);
});
