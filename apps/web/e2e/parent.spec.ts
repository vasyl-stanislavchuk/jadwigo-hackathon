// Parent login end to end in a real browser (dl-e8ov.2.38), with no Supabase and no api: a finished
// attempt's results offer "save your progress", the adult signs in with the 6-digit email code,
// the first sign-in makes the account, a child is added, the tab's attempt is claimed for them and
// the parent home lists it.
//
// Supabase Auth's 2 calls (/auth/v1/otp, /auth/v1/verify) and the api are answered by page.route.
// The session's access token is an RS256 JWT shaped like Supabase's, signed by a key made for this
// run; every token route checks the page sent it. Each api reply is parsed with its contract schema
// first, so the doubles cannot drift from packages/contracts. The api lane's routes (dl-e8ov.2.39)
// replace the doubles once they land.
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import {
  AttemptResults,
  AttemptSnapshot,
  Claim,
  LearnerAttempts,
  LearnerSnapshot,
  Me,
  ROUTES,
} from "@jadwigo/contracts";
import { expect, type Page, type Route, test } from "@playwright/test";

const SUPABASE = "http://127.0.0.1:54321";
const AT = "2026-10-28T14:02:06.274Z";
const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
const JADWIGO_POD = "pod_7qre3atahx8cpak6xbjtz73var";
const ASSIGNMENT = "asg_0ectzj2evqb95a3v1v6wewjzy3";
const ATTEMPT = "att_43007b83dp9w2tnfjxhha74cyq";
const LEARNER = "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq";
const ACCOUNT = "acc_7qre3atahx8cpak6xbjtz73var";
const LQ = "lq_2h4m8gyw0fb1cvz2nkqw0px8fq";
const SUB = randomUUID();
const EMAIL = "rodzic@example.com";

const b64url = (value: string | Buffer): string => Buffer.from(value).toString("base64url");

/** An access token as Supabase Auth issues one, signed with a key made for this run. */
function testToken(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "e2e" }));
  const body = b64url(
    JSON.stringify({
      iss: `${SUPABASE}/auth/v1`,
      aud: "authenticated",
      role: "authenticated",
      sub: SUB,
      email: EMAIL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${head}.${body}`).sign(privateKey);
  return `${head}.${body}.${b64url(signature)}`;
}

const TOKEN = testToken();

const attempt = {
  id: ATTEMPT,
  pod_id: JADWIGO_POD,
  assignment_id: ASSIGNMENT,
  lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
  learner_id: null,
  player_name: null,
  mode: "real",
  status: "finished",
  resume_at: null,
  started_at: AT,
  finished_at: AT,
};
const say = "Ile to jest dwa razy pięć?";
const snapshot = AttemptSnapshot.parse({
  attempt,
  questions: [
    {
      seq: 1,
      lesson_question_id: LQ,
      question_type: "production",
      say,
      question: {
        family: "enter",
        data: {
          input: "number",
          entry: "keypad",
          figure: { kind: "expression", text: "2 × 5 = ?" },
        },
      },
      added: "planned",
      placed: null,
      added_for: null,
      help_released: 0,
      help: [],
      tries: 1,
      ended: "correct",
      asked_at: AT,
    },
  ],
  open_seq: null,
  last_event_id: null,
});
const results = AttemptResults.parse({
  attempt,
  results: [
    { seq: 1, lesson_question_id: LQ, say, added: "planned", ended: "correct", help_used: 0 },
  ],
});
const pod = { id: POD, name: "Dom", language: "pl", created_at: AT };
const account = { id: ACCOUNT, pod_id: POD, sub: SUB, created_at: AT };
const member = {
  id: "mem_2h4m8gyw0fb1cvz2nkqw0px8fq",
  pod_id: POD,
  account_id: ACCOUNT,
  role: "parent",
  created_at: AT,
};
const learner = LearnerSnapshot.parse({
  learner: {
    id: LEARNER,
    pod_id: POD,
    handle: "ola",
    first_name: "Ola",
    age_group: null,
    created_at: AT,
  },
  goals: [],
});
const claimed = { ...attempt, learner_id: LEARNER };
const learnerAttempts = LearnerAttempts.parse({
  learner: learner.learner,
  attempts: [
    {
      attempt: claimed,
      title: "Równe grupy",
      language: "pl",
      results: [
        {
          pod_id: JADWIGO_POD,
          attempt_id: ATTEMPT,
          seq: 1,
          lesson_question_id: LQ,
          added: "planned",
          placed: null,
          added_for: null,
          say,
          family: "enter",
          question_type: "production",
          tries: 1,
          first_try_correct: true,
          correct: true,
          mistake_classes: [],
          help_used: 0,
          skip_reason: null,
          time_ms: 4200,
          ended: "correct",
        },
      ],
    },
  ],
});

/** The api the page talks to, as a double that keeps what the page made. */
async function api(page: Page): Promise<{ calls: string[] }> {
  const calls: string[] = [];
  let me = Me.parse({ account: null, member: null, pod: null, learners: [] });
  const reply = (route: Route, status: number, json: unknown): Promise<void> =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const name = `${request.method()} ${path}`;
    calls.push(name);
    const token = request.headers()["authorization"] === `Bearer ${TOKEN}`;
    switch (name) {
      case `GET /api/v1/attempts/${ATTEMPT}`:
        return reply(route, 200, snapshot);
      case `GET /api/v1/attempts/${ATTEMPT}/results`:
        return reply(route, 200, results);
    }
    // Every other route here is a token route.
    if (!token) {
      return reply(route, 401, { error: { type: "NotSignedIn", message: "no token" } });
    }
    switch (name) {
      case `GET ${ROUTES.getMe.path}`:
        return reply(route, 200, me);
      case `POST ${ROUTES.createAccount.path}`:
        expect(request.postDataJSON()).toEqual({ language: "pl" });
        me = Me.parse({ account, member, pod, learners: [] });
        return reply(route, 201, me);
      case `POST ${ROUTES.createLearner.path}`:
        expect(request.postDataJSON()).toEqual({ first_name: "Ola" });
        me = Me.parse({ account, member, pod, learners: [learner] });
        return reply(route, 201, learner);
      case `POST /api/v1/attempts/${ATTEMPT}/claims`:
        expect(request.postDataJSON()).toEqual({ learner_id: LEARNER });
        return reply(
          route,
          201,
          Claim.parse({
            attempt_id: ATTEMPT,
            learner_id: LEARNER,
            claimed_by: ACCOUNT,
            claimed_at: AT,
          }),
        );
      case `GET /api/v1/learners/${LEARNER}/attempts`:
        return reply(route, 200, learnerAttempts);
    }
    return reply(route, 404, { error: { type: "NotFound", message: name } });
  });
  return { calls };
}

/** Supabase Auth's 2 calls for an email code: the code is 123456. */
async function supabase(page: Page): Promise<void> {
  await page.route(`${SUPABASE}/auth/v1/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON() as Record<string, unknown> | null;
    if (path === "/auth/v1/otp") {
      expect(body?.["email"]).toBe(EMAIL);
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (path === "/auth/v1/verify" && body?.["token"] === "123456") {
      const now = Math.floor(Date.now() / 1000);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: TOKEN,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          refresh_token: "e2e-refresh",
          user: {
            id: SUB,
            aud: "authenticated",
            role: "authenticated",
            email: EMAIL,
            app_metadata: { provider: "email" },
            user_metadata: {},
            created_at: AT,
          },
        }),
      });
    }
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: 400,
        error_code: "otp_expired",
        msg: "Token has expired or is invalid",
      }),
    });
  });
}

test("an adult saves a finished lesson: email code, account, a child, the claim, the parent home", async ({
  page,
}) => {
  const { calls } = await api(page);
  await supabase(page);
  // The tab played the lesson: its attempt id is in sessionStorage, as the player keeps it.
  await page.addInitScript(
    ([key, id]) => {
      if (window.sessionStorage.getItem("jw.e2e.seeded") === null) {
        window.sessionStorage.setItem(key as string, id as string);
        window.sessionStorage.setItem("jw.e2e.seeded", "1");
      }
    },
    [`jw.play.attempt.${ASSIGNMENT}`, ATTEMPT],
  );

  await page.goto(`/play/${ASSIGNMENT}`);
  await expect(page.locator("[data-congrats]")).toBeVisible();
  await page.locator("[data-save-link]").click();
  await expect(page).toHaveURL(new RegExp(`/parent\\?claim=${ASSIGNMENT}`));

  await page.locator("[data-email]").fill(EMAIL);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("654321");
  await page.locator("[data-sign-in]").click();
  await expect(page.locator("[data-problem]")).toBeVisible();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();

  await page.locator("[data-first-name]").fill("Ola");
  await page.locator("[data-add]").click();

  const card = page.locator(`[data-learner-card="${LEARNER}"]`);
  await expect(card.getByText("Równe grupy")).toBeVisible();
  await expect(card.locator('li[data-seq="1"]')).toHaveAttribute("data-ended", "correct");
  await expect(page).toHaveURL(/\/parent$/);
  expect(
    await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      `jw.play.attempt.${ASSIGNMENT}`,
    ),
  ).toBeNull();
  expect(calls).toContain(`POST ${ROUTES.createAccount.path}`);
  expect(calls).toContain(`POST /api/v1/attempts/${ATTEMPT}/claims`);
});
