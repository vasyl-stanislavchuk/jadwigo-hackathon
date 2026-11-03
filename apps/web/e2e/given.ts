// A lesson given to one child the way prod gives one (dl-1eieq.6): a parent signs in, adds a
// child, and gives a checked lesson through POST /api/v1/conversations/{id}/lessons
// (`publishLesson`, what the app's "Daj lekcję" and the MCP's lesson_publish both call). Nothing
// writes a lesson into a conversation without a model, and this api runs no step host, so the
// lesson_revision and a publishable lesson_check are written into the run through the Store on
// DATABASE_URL, as play-learner.spec.ts does.
import { randomUUID } from "node:crypto";
import { ConversationId, EventId, LearnerId, PodId, RunId, toolView } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { expect, type Page } from "@playwright/test";

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
async function draftAndCheck(
  pod: string,
  run: { id: string; attempt: number },
  lesson: unknown,
): Promise<void> {
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
      payload: { revision: 1, call_id: randomUUID(), lesson_file: lesson as never },
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

/**
 * Gives `lesson` (a lesson file) as a new parent: to their new child, or with `toChild: false` to
 * nobody in particular. Returns the play path the app shows for it.
 */
export async function giveLesson(
  page: Page,
  lesson: unknown,
  { toChild = true }: { readonly toChild?: boolean } = {},
): Promise<string> {
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
    { event_id: randomUUID(), text: "Lekcja dodawania, proszę" },
  );
  await draftAndCheck(me.pod.id, sent.run, lesson);
  const given = await asParent<{ assignment: { id: string } }>(
    page,
    "POST",
    `/api/v1/conversations/${conversation}/lessons`,
    toChild ? { learner_id: learner } : {},
  );
  return toChild
    ? `/play/${given.assignment.id}?learner=${learner}`
    : `/play/${given.assignment.id}`;
}

/** Past a given lesson's first screen, as the child the link names. */
export async function confirmChild(page: Page): Promise<void> {
  await page.locator("[data-intro-yes]").click();
}

/** Past a given lesson's first screen, as the child the link names. */
export async function confirmChild(page: Page): Promise<void> {
  await page.locator("[data-intro-yes]").click();
}
