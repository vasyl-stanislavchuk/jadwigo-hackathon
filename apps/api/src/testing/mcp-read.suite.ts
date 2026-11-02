// The remote MCP's read tools (dl-1u6fn.3): run on InMemoryStore by src/mcp/read.test.ts and on
// PostgresStore by src/mcp/read.int.test.ts. Each tool is called over /api/mcp with a parent's
// token, as an AI app calls it; the bank and the uploads bucket are fakes.
import { randomUUID } from "node:crypto";
import {
  AttachmentId,
  type ConversationId,
  EventId,
  ID_PREFIXES,
  idOf,
  type LearnerSnapshot,
  MCP_PATH,
  type Me,
  RunId,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import type { BankDeps, BucketDeps } from "../questions.ts";
import { openQuestion, pathOf, type Seeded, seeded, skipAt, start, tryAt } from "./client.ts";
import { bearerOf, signToken } from "./token.ts";
import { MemoryUploads } from "./uploads.ts";

/** The server's own bank token: no tool reply may ever carry it. */
const BANK_TOKEN = "server-side-bank-token";
const SET_PAGE = {
  id: "set_khan_xd4e5f6",
  titles: { pl: "Dodawanie w zakresie 100", en: "Add within 100" },
  grade: "2",
  skill_ids: ["maths.add.within100"],
  credit: "Khan Academy, CC BY-NC-SA 4.0",
  items: { ids: ["xfeed0001"], ready_ids: { pl: ["xfeed0001"], en: [] } },
};
/** questions.test.ts' fixture envelope, with no rows. */
const ENVELOPE = {
  version: 1,
  need: { words: "dodawanie do 100", language: "pl", grade: "3", limit: 20 },
  arm: "B1",
  stage: "final",
  timing_ms: { embed: 41.2, vectors: 18.5, rows: 6.1, keyword: 9.4, rerank: 212.0, total: 290.3 },
  cache: "miss",
  rows: [],
  state: [
    { arm: "A", state: "not_asked" },
    { arm: "A1", state: "not_asked" },
    { arm: "B", state: "not_asked" },
    { arm: "B1", state: "ok" },
    { arm: "C", state: "not_asked" },
    { arm: "C2", state: "not_asked" },
  ],
};
const BODY = {
  id: "xfeed0001",
  source: "khan",
  pl: {
    family: "enter",
    data: { prompt: "Ile to jest 2 + 3?" },
    key: { accept: ["5"] },
    help: { worked: ["2 + 3 = 5"] },
    say: "Ile to jest dwa plus trzy?",
  },
  problem_type: "invented-addition",
  credit: { source: "khan", url: "https://example.org/invented/xfeed0001", licence: "CC BY" },
  pictures: [],
};

/** A fake bank: a set page for `{set_id}`, the envelope for a need. */
const bank: BankDeps = {
  readToken: async () => BANK_TOKEN,
  invoke: async (payload) => {
    const asked = JSON.parse(payload) as Record<string, unknown>;
    const body = "set_id" in asked ? SET_PAGE : ENVELOPE;
    return { payload: JSON.stringify({ statusCode: 200, body: JSON.stringify(body) }) };
  },
};
const bucket: BucketDeps = {
  get: async (key) => (key === "questions/khan/xfeed0001.json" ? JSON.stringify(BODY) : undefined),
};

interface ToolReply {
  readonly isError: boolean;
  readonly text: string;
  readonly json: unknown;
}

export function mcpReadSuite(name: string, makeStore: () => Store): void {
  describe(`the MCP read tools on ${name}`, () => {
    let s: Seeded;
    let uploads: MemoryUploads;
    beforeEach(() => {
      uploads = new MemoryUploads();
      s = seeded(makeStore(), { bank, bucket, uploads });
    });

    /** A parent with an account, a child and the AI turned on, and their tool caller. */
    async function parent(child: string) {
      const headers = {
        ...bearerOf(signToken({ sub: randomUUID() })),
        accept: "application/json, text/event-stream",
      };
      const call = <T>(method: string, path: string, body?: unknown) =>
        s.call<T>(method, path, body, headers);
      const me = (await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" })).body;
      const pod = me.pod?.id;
      const account = me.account?.id;
      if (pod === undefined || account === undefined) throw new Error("no pod");
      await call("PATCH", pathOf("patchPod", { id: pod }), { ai_consented: true });
      const learner = (
        await call<LearnerSnapshot>("POST", pathOf("createLearner", {}), { first_name: child })
      ).body.learner;
      let id = 0;
      async function tool(tool: string, args: object = {}): Promise<ToolReply> {
        const reply = await call<{ result: { isError?: boolean; content: { text: string }[] } }>(
          "POST",
          MCP_PATH,
          {
            jsonrpc: "2.0",
            id: ++id,
            method: "tools/call",
            params: { name: tool, arguments: args },
          },
        );
        expect(reply.status, JSON.stringify(reply.body)).toBe(200);
        const text = reply.body.result.content[0]?.text ?? "";
        const isError = reply.body.result.isError === true;
        return { isError, text, json: isError ? null : JSON.parse(text) };
      }
      return { call, pod, account, learner, tool };
    }

    type Parent = Awaited<ReturnType<typeof parent>>;

    /** Equal-groups played to the end as the people suite's review plays it, claimed for p's child. */
    async function played(p: Parent) {
      const assignment_id = await s.assign("equalGroups");
      const { id: attempt_id } = await start(s, assignment_id);
      const next = () => openQuestion(s, attempt_id);
      await tryAt(s, attempt_id, await next(), false);
      for (let n = 0; n < 3; n++) await tryAt(s, attempt_id, await next(), true);
      await tryAt(s, attempt_id, await next(), false);
      await skipAt(s, attempt_id, await next(), "asked_to_skip");
      const claim = await p.call("POST", pathOf("claimAttempt", { id: attempt_id }), {
        learner_id: p.learner.id,
      });
      expect(claim.status).toBe(201);
      return { attempt_id, assignment_id };
    }

    /** A conversation with one turn and one attached photo, written as the routes would. */
    async function chat(p: Parent) {
      const conversation = await p.call<{ id: ConversationId }>(
        "POST",
        pathOf("createConversation", {}),
        { event_id: randomUUID() },
      );
      const conversation_id = conversation.body.id;
      const now = Date.now();
      const run = await s.store.createRun(p.pod, {
        id: RunId.parse(idOf(ID_PREFIXES.run, randomUUID())),
        created_by: p.account,
        conversation_id,
        workflow: "jadwigo-lesson-compose",
        resumes: null,
        cap_usd: 1,
        idle_deadline_at: new Date(now + 60_000).toISOString(),
        max_deadline_at: new Date(now + 120_000).toISOString(),
      });
      await s.store.appendRunEvents(p.pod, run.id, run.attempt, [
        {
          run_id: run.id,
          event_id: EventId.parse(randomUUID()),
          type: "message",
          payload: { from: "parent", text: "Hi" },
        },
      ]);
      const attachment_id = AttachmentId.parse(idOf(ID_PREFIXES.attachment, randomUUID()));
      await s.store.createAttachment(p.pod, {
        id: attachment_id,
        account_id: p.account,
        event_id: EventId.parse(randomUUID()),
        media_type: "image/jpeg",
        bytes: 10,
        width: 10,
        height: 10,
        name: null,
        expires_at: new Date(now + 60_000).toISOString(),
      });
      const storage_path = `test/${attachment_id}.jpg`;
      await s.store.attachToMessage(
        p.pod,
        conversation_id,
        [{ id: attachment_id, storage_path }],
        new Date(now).toISOString(),
      );
      return { conversation_id, run_id: run.id, attachment_id };
    }

    it("reads a child's attempts, review, skills, goals and reports", async () => {
      const a = await parent("Ala");
      const { attempt_id } = await played(a);
      await a.call("POST", pathOf("createReport", { id: a.learner.id }), {});
      const learner_id = a.learner.id;

      const attempts = await a.tool("learner_attempts", { learner_id });
      expect(attempts.json).toMatchObject({ attempts: [{ attempt: { id: attempt_id } }] });
      const review = await a.tool("attempt_review", { learner_id, attempt_id });
      expect(review.isError, review.text).toBe(false);
      const assignment_id = (
        attempts.json as { attempts: { attempt: { assignment_id: string } }[] }
      ).attempts[0]?.attempt.assignment_id;
      expect((await a.tool("assignment_attempts", { assignment_id })).isError).toBe(false);
      expect((await a.tool("learner_skills", { learner_id })).json).toHaveProperty("skills");
      expect((await a.tool("skills")).json).toHaveProperty("skills");
      expect((await a.tool("learner_goals", { learner_id })).json).toEqual({ goals: [] });

      const list = (await a.tool("report_list", { learner_id })).json as { reports: unknown[] };
      expect(list.reports).toHaveLength(1);
      expect((await a.tool("report_latest", { learner_id })).json).toEqual({
        report: list.reports[0],
      });
    });

    it("answers report_latest null before any report", async () => {
      const a = await parent("Ala");
      const latest = await a.tool("report_latest", { learner_id: a.learner.id });
      expect(latest.json).toEqual({ report: null });
    });

    it("reads conversations, their runs, a run's events and a photo", async () => {
      const a = await parent("Ala");
      const { conversation_id, run_id, attachment_id } = await chat(a);
      const list = (await a.tool("conversation_list")).json as { conversations: { id: string }[] };
      expect(list.conversations.map((c) => c.id)).toEqual([conversation_id]);
      const runs = await a.tool("conversation_runs", { conversation_id });
      expect(runs.json).toMatchObject({ runs: [{ id: run_id }] });
      const events = await a.tool("run_events", { run_id });
      expect(events.json).toMatchObject({ events: [{ seq: 1, type: "message" }] });
      expect((await a.tool("run_events", { run_id, after: 1 })).json).toEqual({ events: [] });
      const photo = await a.tool("attachment_get", { attachment_id });
      expect(photo.isError, photo.text).toBe(false);
      expect(photo.json).toMatchObject({ attachment: { id: attachment_id } });
    });

    it("searches the bank and reads a set and a question, never handing out the bank token", async () => {
      const a = await parent("Ala");
      const search = await a.tool("question_search", {
        words: "dodawanie",
        language: "pl",
        grade: "2",
      });
      expect(search.isError, search.text).toBe(false);
      expect(search.json).toMatchObject({ rows: [] });
      const set = await a.tool("question_set", { set_id: SET_PAGE.id });
      expect(set.json).toEqual(SET_PAGE);
      const question = await a.tool("question_show", { question_id: BODY.id });
      expect(question.json).toMatchObject({ id: BODY.id });
      expect((await a.tool("question_show", { question_id: "nope" })).isError).toBe(true);
      for (const reply of [search, set, question]) expect(reply.text).not.toContain(BANK_TOKEN);
    });

    it("answers every id-taking read tool another pod's id as not found, exactly as an unknown id", async () => {
      const a = await parent("Ala");
      const b = await parent("Olek");
      await b.call("POST", pathOf("createReport", { id: b.learner.id }), {});
      const theirs = await chat(b);
      const learner_id = b.learner.id;

      const game = await played(b);
      const fresh = (prefix: keyof typeof ID_PREFIXES) => idOf(ID_PREFIXES[prefix], randomUUID());
      // Every id-taking read tool: B's own id, and an id no pod holds. B reads its own; A gets
      // exactly the reply an unknown id gets, so a foreign id reads as not found, never as data
      // or as some other refusal.
      const TABLE: readonly [string, object, object][] = [
        ["learner_attempts", { learner_id }, { learner_id: fresh("learner") }],
        [
          "attempt_review",
          { learner_id, attempt_id: game.attempt_id },
          { learner_id: fresh("learner"), attempt_id: fresh("attempt") },
        ],
        [
          "assignment_attempts",
          { assignment_id: game.assignment_id },
          { assignment_id: fresh("assignment") },
        ],
        ["learner_skills", { learner_id }, { learner_id: fresh("learner") }],
        ["learner_goals", { learner_id }, { learner_id: fresh("learner") }],
        ["report_list", { learner_id }, { learner_id: fresh("learner") }],
        ["report_latest", { learner_id }, { learner_id: fresh("learner") }],
        [
          "conversation_runs",
          { conversation_id: theirs.conversation_id },
          { conversation_id: fresh("conversation") },
        ],
        ["run_events", { run_id: theirs.run_id }, { run_id: fresh("run") }],
        [
          "attachment_get",
          { attachment_id: theirs.attachment_id },
          { attachment_id: fresh("attachment") },
        ],
      ];
      for (const [tool, foreign, unknown] of TABLE) {
        const own = await b.tool(tool, foreign);
        expect(own.isError, `${tool} for its own pod: ${own.text}`).toBe(false);
        const read = await a.tool(tool, foreign);
        const none = await a.tool(tool, unknown);
        expect(none.isError, `${tool}, an unknown id: ${none.text}`).toBe(true);
        expect(none.text, tool).toMatch(/not found|no such|not.*hold/i);
        expect({ isError: read.isError, text: read.text }, tool).toEqual({
          isError: true,
          text: none.text,
        });
      }
      const me = (await a.tool("me")).json as Me;
      expect(me.learners.map((l) => l.learner.id)).toEqual([a.learner.id]);
      const list = (await a.tool("conversation_list")).json as { conversations: unknown[] };
      expect(list.conversations).toEqual([]);
    });
  });
}
