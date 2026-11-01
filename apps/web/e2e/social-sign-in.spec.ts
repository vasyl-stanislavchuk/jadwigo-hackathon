// Google and Facebook on /parent end to end (dl-e8ov.2.51), against the real local api and Postgres,
// with no provider: e2e/auth-server.ts's /authorize sends the tab straight back with a code, and its
// /token swaps the code and supabase-js's PKCE verifier for a session. Its /test/provider switch sets
// the email the provider "returns", or none.
//
// It proves what a redirect could break: an email signed in with the code and then with Google is
// one parent with the same children; the attempt id the tab holds in sessionStorage survives the
// round trip, so the claim still finds it; and a Facebook account with no email gets the line that
// offers the email code, and no account. It runs only in the `api` project (JW_E2E_API=1), and needs
// JW_SUPABASE_PROVIDERS, which playwright.config.ts sets for its build. Locally, with the api
// started as:
//
//   DATABASE_URL=postgresql://localhost:5433/jadwigo_e2e PORT=8787 \
//     AUTH_JWKS_URL=http://127.0.0.1:54321/auth/v1/.well-known/jwks.json \
//     AUTH_ISSUER=http://127.0.0.1:54321/auth/v1 bun apps/api/src/serve.ts &
import { type APIRequestContext, expect, type Page, test } from "@playwright/test";
import { AUTH_ORIGIN } from "./auth-origin.ts";

/** Plays equal-groups from the home page to the results, saying "Not sure yet" to every question. */
async function playToTheEnd(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("[data-featured]").getByRole("link", { name: "Równe grupy" }).click();
  const results = page.locator("[data-results]");
  for (let i = 0; i < 12; i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) return;
    await page.locator("[data-bulb]").click();
    await page.locator("[data-dont-know]").click();
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }
  await expect(results).toBeVisible();
}

/** The email the stand-in's provider returns on the next sign-in, or none. */
async function providerReturns(request: APIRequestContext, email: string | null): Promise<void> {
  const reply = await request.post(`${AUTH_ORIGIN}/auth/v1/test/provider`, { data: { email } });
  expect(reply.ok()).toBe(true);
}

/** Adds the first child, which keeps the tab's attempt for them. */
async function addChildAndClaim(page: Page, name: string): Promise<void> {
  await page.locator("[data-first-name]").fill(name);
  const claimed = page.waitForResponse(
    (r) => /\/api\/v1\/attempts\/att_[0-9a-z]{26}\/claims$/.test(r.url()) && r.status() === 201,
  );
  await page.locator("[data-add]").click();
  await claimed;
}

const storedAttempts = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    Object.keys(window.sessionStorage).filter((key) => key.startsWith("jw.play.attempt.")),
  );

test("an email signed in with the code, then with Google, is the same parent with the same children", async ({
  page,
  request,
}) => {
  const email = `rodzic-${Date.now()}@example.com`;
  await playToTheEnd(page);
  await page.locator("[data-save-link]").click();
  await page.locator("[data-email]").fill(email);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
  await addChildAndClaim(page, "Ola");
  const card = page.locator("[data-learner-card]");
  await expect(card.getByRole("heading", { name: "Ola" })).toBeVisible();
  // Signing out sits in the account menu at the sidebar's foot (dl-uukj.47.4).
  await page.locator("[data-account]").click();
  await page.locator("[data-sign-out]").click();

  await providerReturns(request, email);
  await page.locator('[data-provider="google"]').click();
  await expect(card.getByRole("heading", { name: "Ola" })).toBeVisible();
  await expect(card.locator("li[data-attempt]")).toHaveCount(1);
  await expect(page.locator("[data-add-child]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/parent$/);
});

test("a fresh tab's lesson is kept after the round trip to Google", async ({ page, request }) => {
  await providerReturns(request, `rodzic-google-${Date.now()}@example.com`);
  await playToTheEnd(page);
  expect(await storedAttempts(page)).toHaveLength(1);
  await page.locator("[data-save-link]").click();
  await expect(page).toHaveURL(/\/parent\?claim=asg_[0-9a-z]{26}/);

  await page.locator('[data-provider="google"]').click();
  // Back in the same tab, the code spent and gone from the address, the claim still in it.
  await expect(page.locator("[data-add-child]")).toBeVisible();
  await expect(page).toHaveURL(/\/parent\?claim=asg_[0-9a-z]{26}$/);
  expect(await storedAttempts(page)).toHaveLength(1);

  await addChildAndClaim(page, "Ola");
  const lesson = page.locator("[data-learner-card]").locator("li[data-attempt]");
  await expect(lesson).toHaveCount(1);
  await expect(lesson.getByText("Równe grupy")).toBeVisible();
  await expect(page).toHaveURL(/\/parent$/);
  expect(await storedAttempts(page)).toEqual([]);
});

test("a Facebook account with no email is offered the email code and makes no account", async ({
  page,
  request,
}) => {
  await providerReturns(request, null);
  const api: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/")) api.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });
  await page.goto("/parent");
  await page.locator('[data-provider="facebook"]').click();

  const line = page.locator("[data-provider-problem]");
  await expect(line).toHaveText(
    "To konto na Facebooku nie ma adresu e-mail, więc nie można się nim tu zalogować. Zaloguj się kodem z e-maila.",
  );
  await expect(page.locator("[data-email]")).toBeVisible();
  await expect(page).toHaveURL(/\/parent$/);
  expect(api).toEqual([]);
});

test("the 2 provider buttons share one shape at a phone's width, the long Polish label on one line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/parent");
  const google = page.locator('[data-provider="google"]');
  const facebook = page.locator('[data-provider="facebook"]');
  await expect(facebook).toHaveText("Kontynuuj z Facebookiem");
  const look = (button: typeof google) =>
    button.evaluate((b) => {
      const css = getComputedStyle(b);
      const mark = b.querySelector("img")?.getBoundingClientRect();
      // The label's lines: a wrap would draw 2 boxes, which a 48 min-height could hide.
      const words = document.createRange();
      words.selectNodeContents(b.lastChild ?? b);
      const lines = new Set([...words.getClientRects()].map((r) => Math.round(r.top))).size;
      return {
        height: b.getBoundingClientRect().height,
        radius: css.borderRadius,
        stroke: `${css.borderTopWidth} ${css.borderTopStyle} ${css.borderTopColor}`,
        fill: css.backgroundColor,
        padding: `${css.paddingLeft} ${css.paddingRight}`,
        gap: css.columnGap,
        size: css.fontSize,
        weight: css.fontWeight,
        mark: `${mark?.width}x${mark?.height}`,
        overflows: b.scrollWidth > b.clientWidth,
        lines,
        font: css.fontFamily,
      };
    });
  const [g, f] = [await look(google), await look(facebook)];
  expect({ ...f, font: "" }).toEqual({ ...g, font: "" });
  expect(f.overflows).toBe(false);
  expect(f.lines).toBe(1);
  expect(g.font).toMatch(/Google Sans/);
  expect(f.font).toMatch(/^"?Andika/);
});
