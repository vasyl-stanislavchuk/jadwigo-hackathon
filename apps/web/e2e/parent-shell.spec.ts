// The parent app's frame (dl-uukj.47.4, decision dl-xo0q) and its lesson workspace (dl-uukj.47.5), what happy-dom cannot measure: the one
// 56 px line across the sidebar's logo row and the top bar, the sidebar at 232 px folded to a 60 px
// rail and remembered across a reload, and nothing to press in the top bar on a laptop. Signs in
// with the email code against e2e/auth-server.ts (every code is 123456), with no child: a child is
// never a gate. Runs in the `api` project (JW_E2E_API=1), as parent.spec.ts says how.
import { expect, type Page, test } from "@playwright/test";
import { agreeToAi } from "./consent.ts";

async function signIn(page: Page): Promise<void> {
  await page.goto("/parent");
  await page.locator("[data-email]").fill(`rodzic-${Date.now()}@example.com`);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
  await expect(page.locator("[data-top-bar]")).toBeVisible();
}

/**
 * A conversation the signed-in parent's pod holds, made through the api as the page would (the
 * pod's AI consent first, then POST /api/v1/conversations). A made-up id is not this parent's, and
 * the workspace answers it with "no such lesson", not the columns (dl-uukj.47.33).
 */
async function ownConversation(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const session = JSON.parse(window.localStorage.getItem("jw.auth") ?? "{}") as {
      access_token?: string;
    };
    const headers = {
      authorization: `Bearer ${session.access_token ?? ""}`,
      "content-type": "application/json",
    };
    const me = (await (await fetch("/api/v1/me", { headers })).json()) as { pod: { id: string } };
    await fetch(`/api/v1/pods/${me.pod.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ ai_consented: true }),
    });
    const made = await fetch("/api/v1/conversations", {
      method: "POST",
      headers,
      body: JSON.stringify({ event_id: crypto.randomUUID() }),
    });
    if (!made.ok) throw new Error(`conversation ${made.status}`);
    return ((await made.json()) as { id: string }).id;
  });
}

const box = async (page: Page, selector: string) => {
  const found = await page.locator(selector).first().boundingBox();
  if (found === null) throw new Error(`${selector} is not drawn`);
  return found;
};

test.beforeEach(({ page }) => agreeToAi(page));

// The top bar holds the breadcrumb only; the account is the one profile button, bottom left, at the
// sidebar's foot above Zwiń menu (handoff dl-uukj.47 §6: settings live at the sidebar's foot).
test("one 56 px line runs across the logo row and the top bar, and the account stands bottom left", async ({
  page,
}) => {
  await signIn(page);
  const bar = await box(page, "[data-top-bar]");
  const logoRow = await box(page, "#parent-sidebar > div:first-child");
  expect(Math.round(bar.height)).toBe(56);
  expect(Math.round(logoRow.height)).toBe(56);
  expect(Math.round(logoRow.y + logoRow.height)).toBe(Math.round(bar.y + bar.height));
  // A role query skips the phone's menu, hidden at this width: the bar has no button.
  await expect(page.locator("[data-top-bar]").getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Gdzie jesteś" })).toContainText(
    "Lekcje/Nowa lekcja",
  );
  const sidebar = await box(page, "#parent-sidebar");
  const account = await box(page, "#parent-sidebar [data-account]");
  const fold = await box(page, "#parent-sidebar [data-fold-sidebar]");
  expect(account.x - sidebar.x).toBeLessThan(16);
  expect(account.y).toBeLessThan(fold.y);
  expect(Math.round(sidebar.y + sidebar.height - (fold.y + fold.height))).toBeLessThan(16);
});

test("each settings row opens its whole page, and the account menu lists them", async ({
  page,
}) => {
  await signIn(page);
  await page.locator("[data-settings-row=language]").click();
  await expect(page).toHaveURL(/\/parent\/settings\/language/);
  await expect(page.getByRole("heading", { name: "Język" })).toBeVisible();
  await page.locator("#parent-sidebar [data-account]").click();
  await page.getByRole("menuitem", { name: "Zgoda na AI" }).click();
  await expect(page).toHaveURL(/\/parent\/settings\/ai/);
  await expect(page.getByRole("switch", { name: "Zgoda na Jadwigo AI" })).toBeVisible();
});

test("the sidebar is 232 px, folds to a 60 px rail, and stays folded after a reload", async ({
  page,
}) => {
  await signIn(page);
  const sidebar = page.locator("#parent-sidebar");
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(232);
  await page.getByRole("button", { name: "Zwiń menu" }).click();
  await expect(sidebar).toHaveAttribute("data-sidebar", "folded");
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(60);
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-sidebar", "folded");
  await page.getByRole("button", { name: "Rozwiń menu" }).click();
  await expect.poll(async () => Math.round((await box(page, "#parent-sidebar")).width)).toBe(232);
});

// The lesson workspace (dl-uukj.47.5; dl-1eieq.1): the chat alone on every screen, no details, no
// footer, no lesson column and no "Pokaż lekcję"; the lesson opens in a preview from the chat.
test("the workspace: the chat alone, with no lesson column and no Pokaż lekcję", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/parent/lessons/${await ownConversation(page)}`);
  await expect(page.locator("[data-workspace]")).toBeVisible();
  await expect(page.locator("[data-chat-body]")).toBeVisible();
  await expect(page.locator("[data-lesson-column]")).toHaveCount(0);
  await expect(page.locator("#parent-details")).toHaveCount(0);
  await expect(page.locator("[data-lesson-footer]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pokaż lekcję" })).toHaveCount(0);
});
