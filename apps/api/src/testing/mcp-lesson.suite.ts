// The MCP's lesson tools (dl-1u6fn.10) on the fixture bank, run on InMemoryStore by
// lesson.test.ts and on PostgresStore by lesson.int.test.ts: a draft is a conversation whose one
// run is created ended, so the runner never calls a model on it.
import { randomUUID } from "node:crypto";
import { ID_PREFIXES, idOf, MCP_PATH, type Me, ROUTES } from "@jadwigo/contracts";
import type { RunId } from "@jadwigo/contracts/run";
import type { Store } from "@jadwigo/store";
import { LESSON_FILES } from "@jadwigo/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { MCP_BODY_BYTES } from "../mcp/server.ts";
import { bearerOf, signToken, testAuth } from "./token.ts";

const RESOURCE = "https://app.jadwigo.test/api/mcp";
const DRAFT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

type ToolReply = { isError?: boolean; content: { text: string }[] };

export function lessonSuite(
  name: string,
  makeStore: () => Store,
  extra: (s: Suite) => void = () => {},
): void {
  describe(`the MCP's lesson tools on ${name}`, () => {
    let store: Store;
    let call: (
      body: unknown,
      headers: Record<string, string>,
    ) => Promise<{ status: number; body: unknown }>;

    beforeEach(() => {
      store = makeStore();
      const app = createApp(store, { authenticate: testAuth, mcp: { resourceUrl: RESOURCE } });
      const context = {} as Parameters<typeof app.resolve>[1];
      call = async (body, headers) => {
        const reply = (await app.resolve(
          {
            version: "2.0",
            routeKey: "$default",
            rawPath: MCP_PATH,
            rawQueryString: "",
            headers: {
              "content-type": "application/json",
              accept: "application/json, text/event-stream",
              ...headers,
            },
            requestContext: { http: { method: "POST", path: MCP_PATH }, stage: "$default" },
            body: JSON.stringify(body),
            isBase64Encoded: false,
          },
          context,
        )) as { statusCode: number; body?: string };
        return { status: reply.statusCode, body: reply.body ? JSON.parse(reply.body) : null };
      };
    });

    /** A parent with one child, and their tool caller: the parsed result, or the refusal's text. */
    async function parent() {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const rest = (path: string, body: unknown) => restCall(path, body, headers);
      await rest(ROUTES.createAccount.path, { language: "pl" });
      await rest(ROUTES.createLearner.path, { first_name: "Ala", goals: [] });
      const tool = async (name: string, args: object) => {
        const { body } = await call(
          { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
          headers,
        );
        const result = (body as { result: ToolReply }).result;
        const text = result.content[0]?.text ?? "";
        return result.isError ? { error: text } : (JSON.parse(text) as Record<string, unknown>);
      };
      const me = (await tool("me", {})) as unknown as Me;
      const learner_id = me.learners[0]?.learner.id ?? "";
      return { tool, learner_id, pod: me.pod?.id ?? "" };
    }

    /** A REST route through the same app, for the account and the child. */
    async function restCall(path: string, body: unknown, headers: Record<string, string>) {
      const app = createApp(store, { authenticate: testAuth });
      await app.resolve(
        {
          version: "2.0",
          routeKey: "$default",
          rawPath: path,
          rawQueryString: "",
          headers: { "content-type": "application/json", ...headers },
          requestContext: { http: { method: "POST", path }, stage: "$default" },
          body: JSON.stringify(body),
          isBase64Encoded: false,
        },
        {} as Parameters<typeof app.resolve>[1],
      );
    }

    it("lists the lesson tools, lesson_draft taking learner_id", async () => {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const { body } = await call({ jsonrpc: "2.0", id: 1, method: "tools/list" }, headers);
      const tools = (
        body as { result: { tools: { name: string; inputSchema: { required: string[] } }[] } }
      ).result.tools;
      expect(tools.map((t) => t.name)).toEqual([
        "me",
        "lesson_draft",
        "lesson_show",
        "lesson_edit",
        "lesson_check",
        "lesson_publish",
      ]);
      expect(tools[1]?.inputSchema.required).toContain("learner_id");
    });

    it("drafts into an ended run the app opens, then shows, checks and revises it", async () => {
      const { tool, learner_id, pod } = await parent();
      const started = Date.now();
      const draft = await tool("lesson_draft", { ...DRAFT, learner_id });
      const draftMs = Date.now() - started;
      const draft_id = draft["draft_id"] as RunId;
      expect(draft_id).toMatch(/^run_/);
      expect(draft["open_url"]).toMatch(/^https:\/\/app\.jadwigo\.test\/parent\/lessons\/cnv_/);
      expect(draftMs).toBeLessThan(2000);

      const run = await store.getRun(pod as never, draft_id);
      expect(run.status).toBe("completed");
      expect(String(draft["open_url"]).endsWith(String(run.conversation_id))).toBe(true);
      const log = await store.listRunEvents(pod as never, draft_id, 0);
      expect(log.map((e) => e.type)).toEqual([
        "tool_result",
        "lesson_revision",
        "status",
        "turn_complete",
      ]);

      const shown = await tool("lesson_show", { draft_id });
      expect(shown).toMatchObject({ draft_id, revision: 1, lesson_ok: true });
      expect(await tool("lesson_check", { draft_id, names: [], help: {} })).toMatchObject({
        ok: true,
      });
      const worded = await tool("lesson_check", {
        draft_id,
        names: [],
        title: "Dodawanie do 20",
        help: { s02: { boost_by_mistake: { other_wrong: { text: "Policz jeszcze raz." } } } },
      });
      expect(worded).toMatchObject({ ok: true });
      expect(await tool("lesson_show", { draft_id })).toMatchObject({
        revision: 2,
        title: "Dodawanie do 20",
      });
    });

    it("publishes a checked draft for the child and answers the play link (lesson_publish)", async () => {
      const { tool, learner_id, pod } = await parent();
      const draft_id = (await tool("lesson_draft", { ...DRAFT, learner_id }))["draft_id"];
      // Drafted but not checked: the AI is told what to do first.
      expect(await tool("lesson_publish", { draft_id, learner_id })).toEqual({
        error: "the lesson has not passed lesson_check: check it again first",
      });
      expect(await tool("lesson_check", { draft_id, names: [], help: {} })).toMatchObject({
        ok: true,
      });
      const given = await tool("lesson_publish", { draft_id, learner_id });
      const assignment_id = given["assignment_id"] as string;
      expect(given["play_url"]).toBe(
        `https://app.jadwigo.test/play/${assignment_id}?learner=${learner_id}`,
      );
      expect(given["parent_url"]).toBe(
        `https://app.jadwigo.test/parent/assignments/${assignment_id}`,
      );
      const assignment = await store.getAssignment(pod as never, assignment_id as never);
      expect(assignment).toMatchObject({ audience: "learners" });
      const version = await store.getLessonVersion(
        pod as never,
        given["lesson_version_id"] as never,
      );
      expect(version.version.lesson_id).toBe(assignment.lesson_id);
      // The same revision for the same child again answers the same assignment.
      expect((await tool("lesson_publish", { draft_id, learner_id }))["assignment_id"]).toBe(
        assignment_id,
      );
      // A change after the check needs a check again.
      await tool("lesson_edit", {
        draft_id,
        step_id: "s01",
        patch: { say: "Policz." },
        why: "the parent asked for a shorter line",
        names: [],
      });
      expect(await tool("lesson_publish", { draft_id, learner_id })).toEqual({
        error: expect.stringMatching(/lesson_check/),
      });
    });

    it("orders the MCP's and the app's turns by when they wrote, and waits while the app works", async () => {
      const { tool, learner_id, pod } = await parent();
      const draft_id = (await tool("lesson_draft", { ...DRAFT, learner_id }))["draft_id"] as string;
      await tool("lesson_check", { draft_id, names: [], help: {} });
      const first = await store.getRun(pod as never, draft_id as never);
      const conversation_id = first.conversation_id as string;
      const events = async (run: string) => store.listRunEvents(pod as never, run as never, 0);
      const passed = (await events(draft_id)).findLast((e) => e.type === "tool_result");
      if (passed?.type !== "tool_result") throw new Error("the draft has no check");

      /** The app's next turn on the conversation, as acceptMessage opens it. */
      const appTurn = async () =>
        store.createRun(pod as never, {
          id: idOf(ID_PREFIXES.run, randomUUID()) as never,
          created_by: first.created_by,
          conversation_id: conversation_id as never,
          workflow: "jadwigo-lesson-compose",
          resumes: null,
          cap_usd: 1,
          idle_deadline_at: new Date(Date.now() + 600_000).toISOString(),
          max_deadline_at: new Date(Date.now() + 1_800_000).toISOString(),
        });
      const end = async (run: { id: string; attempt: number }) =>
        store.updateRun(pod as never, run.id as never, run.attempt, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      const append = (run: { id: string; attempt: number }, e: object) =>
        store.appendRunEvents(pod as never, run.id as never, run.attempt, [
          { run_id: run.id, event_id: randomUUID(), ...e } as never,
        ]);

      // While the app's turn runs, the parent's AI is told to wait, and nothing is written.
      const two = await appTurn();
      expect(await tool("lesson_show", { draft_id })).toEqual({
        error: "the lesson is being changed in the app; try again in a moment",
      });
      expect(await tool("lesson_publish", { draft_id, learner_id })).toEqual({
        error: "the lesson is being changed in the app; try again in a moment",
      });

      // The app checks the lesson, then the MCP edits it: the edit is not checked.
      await append(two, {
        type: "tool_result",
        payload: { ...passed.payload, call_id: "app-check" },
      });
      await end(two);
      const edited = await tool("lesson_edit", {
        draft_id,
        step_id: "s01",
        patch: { say: "Policz." },
        why: "the parent asked for a shorter line",
        names: [],
      });
      expect(edited["draft_id"]).toBe(draft_id);
      expect((await events(two.id)).map((e) => e.type)).toEqual([
        "tool_result",
        "tool_result",
        "lesson_revision",
      ]);
      expect(await tool("lesson_publish", { draft_id, learner_id })).toEqual({
        error: "the lesson changed after its last lesson_check: check it again first",
      });

      // The app writes a revision, then the MCP checks it: that check counts.
      const three = await appTurn();
      const shown = (await tool("lesson_show", { draft_id }).catch(() => null)) as unknown;
      expect(shown).toEqual({
        error: "the lesson is being changed in the app; try again in a moment",
      });
      const latest = (await events(two.id)).findLast((e) => e.type === "lesson_revision");
      if (latest?.type !== "lesson_revision") throw new Error("no revision");
      const written = await store.appendLessonRevision(
        pod as never,
        three.id,
        three.attempt,
        latest.payload.revision,
        {
          type: "lesson_revision",
          run_id: three.id,
          event_id: randomUUID() as never,
          payload: {
            revision: latest.payload.revision + 1,
            call_id: "app-patch",
            lesson_file: latest.payload.lesson_file,
          },
        },
      );
      expect(written.ok).toBe(true);
      await end(three);
      expect(await tool("lesson_check", { draft_id, names: [], help: {} })).toMatchObject({
        ok: true,
      });
      expect(await tool("lesson_publish", { draft_id, learner_id })).toMatchObject({
        play_url: expect.stringContaining("?learner="),
      });
    });

    it("refuses to publish for another family's child, or a lesson over 20 questions", async () => {
      const a = await parent();
      const b = await parent();
      const draft_id = (await a.tool("lesson_draft", { ...DRAFT, learner_id: a.learner_id }))[
        "draft_id"
      ] as string;
      await a.tool("lesson_check", { draft_id, names: [], help: {} });
      expect(await a.tool("lesson_publish", { draft_id, learner_id: b.learner_id })).toEqual({
        error: "no such learner",
      });
      expect(await b.tool("lesson_publish", { draft_id, learner_id: b.learner_id })).toEqual({
        error: expect.stringMatching(/no/),
      });

      // 21 questions, as no verb can write: the parent's own edit in the app could, so the check
      // and the publish both stand between it and a child.
      const shown = (await a.tool("lesson_show", { draft_id })) as {
        steps: { step: Record<string, unknown> }[];
        revision: number;
      };
      const first = shown.steps[0]?.step ?? {};
      const steps = Array.from({ length: 21 }, (_, i) => ({
        ...first,
        id: `s${String(i + 1).padStart(2, "0")}`,
      }));
      const run = await store.getRun(a.pod as never, draft_id as never);
      const file = (await store.listRunEvents(a.pod as never, run.id, 0)).findLast(
        (e) => e.type === "lesson_revision",
      );
      if (file?.type !== "lesson_revision") throw new Error("the draft has no revision");
      const lesson_file = file.payload.lesson_file as { script: { parts: object[] } };
      const written = await store.appendLessonRevision(
        a.pod as never,
        run.id,
        run.attempt,
        shown.revision,
        {
          type: "lesson_revision",
          run_id: run.id,
          event_id: randomUUID() as never,
          payload: {
            revision: shown.revision + 1,
            call_id: randomUUID(),
            lesson_file: {
              ...lesson_file,
              script: { parts: [{ ...lesson_file.script.parts[0], steps }] },
            },
          },
        },
      );
      expect(written.ok).toBe(true);
      await a.tool("lesson_check", { draft_id, names: [], help: {} });
      expect(await a.tool("lesson_publish", { draft_id, learner_id: a.learner_id })).toEqual({
        error: expect.stringMatching(/at most 20/),
      });
    });

    it("refuses another family's draft and child, and passes a verb's refusal on as its words", async () => {
      const a = await parent();
      const b = await parent();
      const draft_id = (await a.tool("lesson_draft", { ...DRAFT, learner_id: a.learner_id }))[
        "draft_id"
      ];
      expect(await b.tool("lesson_show", { draft_id })).toEqual({
        error: expect.stringMatching(/no/),
      });
      expect(await b.tool("lesson_draft", { ...DRAFT, learner_id: a.learner_id })).toEqual({
        error: "no such learner in your family: call me",
      });
      expect(
        await a.tool("lesson_edit", { draft_id, step_id: "s99", patch: {}, names: [] }),
      ).toEqual({
        error: expect.stringMatching(/^unknown-step: no step s99/),
      });
    });

    it("takes a 20-question lesson_check with every rung written, under MCP_BODY_BYTES", () => {
      // The fixture lessons' steps carry rungs people wrote: the largest help, as words for 20 steps.
      const steps = (
        LESSON_FILES as { script: { parts: { steps: { question?: { help?: object } }[] }[] } }[]
      ).flatMap((f) => f.script.parts.flatMap((p) => p.steps));
      const largest = steps
        .flatMap((s) => (s.question?.help ? [s.question.help] : []))
        .sort((x, y) => JSON.stringify(y).length - JSON.stringify(x).length)[0];
      const help = Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`s${String(i + 1).padStart(2, "0")}`, largest]),
      );
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "lesson_check",
          arguments: { draft_id: `run_${"x".repeat(26)}`, names: [], help, title: "x".repeat(80) },
        },
      });
      const bytes = new TextEncoder().encode(body).byteLength;
      expect(bytes).toBeGreaterThan(16_384);
      expect(bytes * 2).toBeLessThan(MCP_BODY_BYTES);
    });
    extra({ store: () => store, parent: () => parent() });
  });
}

/** What a store-specific case gets from the suite. */
export interface Suite {
  store(): Store;
  parent(): Promise<{
    tool: (name: string, args: object) => Promise<Record<string, unknown>>;
    learner_id: string;
    pod: string;
  }>;
}
