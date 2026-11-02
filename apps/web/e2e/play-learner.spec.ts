// A lesson given to one child, played from its link (dl-1u6fn.13): a parent signs in, adds a child,
// and gives a checked lesson through POST /api/v1/conversations/{id}/lessons with that learner_id
// (dl-5ssh.136); the child opens /play/<assignment>?learner=<learner> (dl-1u6fn.5), says "Not sure
// yet" to every question to the results, and the child's page lists the attempt.
//
// Nothing writes a lesson into a conversation without a model, and this api runs no step host, so
// the spec writes what the step host would, a lesson_revision and a publishable lesson_check, into
// the run through the Store on DATABASE_URL, as the api's conversations suite does. It runs only in
// the `api` project (JW_E2E_API=1), with the api and e2e/auth-server.ts started as parent.spec.ts's
// header says.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ConversationId, EventId, LearnerId, PodId, RunId, toolView } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { expect, type Page, test } from "@playwright/test";
import { agreeToAi } from "./consent.ts";

/** multiplication-times-four: 11 questions, passes the lesson checks. Read as a file, the way the
 * seed reads it (packages/lesson-import/src/seed.ts): only tests import `@jadwigo/testing`. */
const LESSON: unknown = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/testing/src/lessons/multiplication-times-four.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

async function signIn(page: Page): Promise<void> {
  await page.goto("/parent");
  await page.locator("[data-email]").fill(`rodzic-${Date.now()}@example.com`);
  await page.locator("[data-send-code]").click();
  await page.locator("[data-code]").fill("123456");
  await page.locator("[data-sign-in]").click();
  await expect(page.locator("[data-top-bar]")).toBeVisible();
}

/** Calls the api as the signed-in parent, from the page, the way the app does. */
function asParent<T>(page: Page, method: string, path: string, body?: unknown): Promise<T> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const session = JSON.parse(window.localStorage.getItem("jw.auth") ?? "{}") as {
        access_token?: string;
      };
      const reply = await fetch(path, {
        method,
        headers: {
          authorization: `Bearer ${session.access_token ?? ""}`,
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!reply.ok) throw new Error(`${method} ${path}: ${reply.status} ${await reply.text()}`);
      return reply.json();
    },
    { method, path, body },
  ) as Promise<T>;
}

/** Writes what the step host would: the lesson as revision 1, then a publishable lesson_check. */
async function draftAndCheck(pod: string, run: { id: string; attempt: number }): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (url === undefined) throw new Error("DATABASE_URL names the api's database");
  const store = createPostgresStore(url);
  try {
    const podId = PodId.parse(pod);
    const runId = RunId.parse(run.id);
    const made = await store.appendLessonRevision(podId, runId, run.attempt, 0, {
      run_id: runId,
      event_id: EventId.parse(randomUUID()),
      type: "lesson_revision",
      payload: { revision: 1, call_id: randomUUID(), lesson_file: LESSON as never },
    });
    if (!made.ok) throw new Error(`the revision was refused: ${made.stale}`);
    await store.appendRunEvents(podId, runId, run.attempt, [
      {
        run_id: runId,
        event_id: EventId.parse(randomUUID()),
        type: "tool_result",
        payload: {
          call_id: randomUUID(),
          verb: "lesson_check",
          output: { ok: true },
          error: null,
          view: toolView("lesson_check", { publishable: true, findings: [] }),
        },
      },
    ]);
  } finally {
    await store.close();
  }
}

test.beforeEach(({ page }) => agreeToAi(page));

test("a lesson given to one child plays from its ?learner= link to the results, and shows on that child's page", async ({
  page,
}) => {
  await signIn(page);
  const me = await asParent<{ pod: { id: string } }>(page, "GET", "/api/v1/me");
  await asParent(page, "PATCH", `/api/v1/pods/${me.pod.id}`, { ai_consented: true });
  const child = await asParent<{ learner: { id: string } }>(page, "POST", "/api/v1/learners", {
    first_name: "Tymek",
  });
  const learner = LearnerId.parse(child.learner.id);
  const conversation = ConversationId.parse(
    (
      await asParent<{ id: string }>(page, "POST", "/api/v1/conversations", {
        event_id: randomUUID(),
      })
    ).id,
  );
  const sent = await asParent<{ run: { id: string; attempt: number } }>(
    page,
    "POST",
    `/api/v1/conversations/${conversation}/messages`,
    { event_id: randomUUID(), text: "A lesson on times four, please" },
  );
  await draftAndCheck(me.pod.id, sent.run);

  const given = await asParent<{ assignment: { id: string; audience: string } }>(
    page,
    "POST",
    `/api/v1/conversations/${conversation}/lessons`,
    { learner_id: learner },
  );
  expect(given.assignment.audience).toBe("learners");

  // The child's link: the attempt starts as that learner, and plays to the results.
  const started = page.waitForResponse((r) =>
    r.url().endsWith(`/api/v1/assignments/${given.assignment.id}/attempts`),
  );
  await page.goto(`/play/${given.assignment.id}?learner=${learner}`);
  const start = await started;
  expect(start.status()).toBe(201);
  expect(start.request().postDataJSON()).toEqual({ learner_id: learner });
  const { attempt: played } = (await start.json()) as {
    attempt: { id: string; learner_id: string };
  };
  expect(played.learner_id).toBe(learner);
  const attempt = played.id;

  const results = page.locator("[data-results]");
  for (let i = 0; i < 40; i++) {
    await expect(page.locator("[data-bulb]").or(results)).toBeVisible();
    if (await results.isVisible()) break;
    await page.locator("[data-bulb]").click();
    await page.locator("[data-dont-know]").click();
    await expect(page.locator("[data-dont-know]")).toBeHidden();
  }
  await expect(results).toBeVisible();

  // The parent sees it on that child's page.
  await page.goto(`/parent/children/${learner}`);
  await expect(page.locator(`[data-learner-card="${learner}"]`)).toBeVisible();
  await expect(page.locator(`li[data-attempt="${attempt}"]`)).toBeVisible();
});
