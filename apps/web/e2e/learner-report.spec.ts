// The parent's learner page (dl-e8ov.5.7): signed in, the parent home shows under the learner each
// goal's 3 lists, the week strip and the latest report, and at a phone's width (390, and the
// narrowest, 320) none of it makes the page scroll sideways. Happy-dom does no layout, so this
// layout claim is checked here (dl-5ssh.73); the lists' words and counts are the component tests'.
//
// It runs in the phone and laptop projects, with no api and no auth stand-in: like smoke.spec.ts,
// each test answers the routes itself, Supabase Auth's email code (as e2e/auth-server.ts does) and
// the api's from the made-up learner in src/parent/learner/fixtures.ts.
import { ROUTES } from "@jadwigo/contracts";
import { expect, type Page, test } from "@playwright/test";
import { ATTEMPTS, REPORTS, SKILLS } from "../src/parent/learner/fixtures.ts";
import { AUTH_ORIGIN } from "./auth-origin.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const b64url = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A session shaped like Supabase's /verify answer. Nothing verifies its token: the api is
 * answered here too. */
function session(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  const sub = "8d0f8a52-6c1e-4d5b-9a51-0d6f1b2c3d4e";
  return {
    access_token: `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub, exp: now + 3600 })}.e2e`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "e2e-refresh",
    user: {
      id: sub,
      aud: "authenticated",
      role: "authenticated",
      email: "rodzic@example.com",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date(now * 1000).toISOString(),
    },
  };
}

const CREATED = "2026-08-01T09:00:00.000Z";
const POD = SKILLS.learner.pod_id;
const ME = {
  account: {
    id: "acc_6et2fhbnwvb45aw9atcfzs33zb",
    pod_id: POD,
    sub: "8d0f8a52-6c1e-4d5b-9a51-0d6f1b2c3d4e",
    created_at: CREATED,
  },
  member: {
    id: "mem_6et2fhbnwvb45aw9atcfzs33zc",
    pod_id: POD,
    account_id: "acc_6et2fhbnwvb45aw9atcfzs33zb",
    role: "parent",
    created_at: CREATED,
  },
  pod: { id: POD, name: "Dom", language: "pl", created_at: CREATED, ai_consent_at: CREATED },
  learners: [{ learner: SKILLS.learner, goals: SKILLS.goals.map((g) => g.goal) }],
};

/** `path` of the route table as a glob: each `{param}` is any one segment. */
const glob = (path: string): string => `**${path.replace(/\{\w+\}/g, "*")}`;

async function answerRoutes(page: Page): Promise<void> {
  await page.route(`${AUTH_ORIGIN}/auth/v1/**`, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (path === "/auth/v1/settings")
      return route.fulfill({ headers: CORS, json: { external: { email: true } } });
    if (path === "/auth/v1/otp") return route.fulfill({ headers: CORS, json: {} });
    if (path === "/auth/v1/verify") return route.fulfill({ headers: CORS, json: session() });
    return route.fulfill({ status: 404, headers: CORS, json: {} });
  });
  await page.route(glob(ROUTES.getMe.path), (route) => route.fulfill({ json: ME }));
  await page.route(glob(ROUTES.getLearnerAttempts.path), (route) =>
    route.fulfill({ json: ATTEMPTS }),
  );
  await page.route(glob(ROUTES.getLearnerSkills.path), (route) => route.fulfill({ json: SKILLS }));
  await page.route(glob(ROUTES.getLearnerReports.path), (route) =>
    route.fulfill({ json: REPORTS }),
  );
}

async function signIn(page: Page): Promise<void> {
  await page.goto("/parent");
  await page.locator("[data-email]").fill("rodzic@example.com");
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
}

test("the learner page shows the 3 lists and the report, and fits a phone without sideways scroll", async ({
  page,
}) => {
  await answerRoutes(page);
  await signIn(page);

  const section = page.locator("[data-learner-knowledge]");
  await expect(section.locator("[data-goal]")).toHaveCount(2);
  await expect(section.locator("[data-goal]").first().locator("[data-list]")).toHaveCount(3);
  await expect(section.locator("[data-week]")).toHaveCount(4);
  await expect(section.locator("[data-proposal]")).toHaveCount(2);
  await expect(section.locator("[data-headline]")).toBeVisible();
  await expect(section).not.toContainText("%");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => {
      const section = document.querySelector("[data-learner-knowledge]");
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        section: section === null ? -1 : section.scrollWidth - section.clientWidth,
      };
    });
    expect(overflow, `at ${width}`).toEqual({ page: 0, section: 0 });
  }
});
