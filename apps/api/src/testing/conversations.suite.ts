// The AI engine's conversation routes (dl-z5ja.21): run on InMemoryStore by
// src/conversations.test.ts and on PostgresStore with pgmq by src/conversations.int.test.ts.
// Tokens are signed with the run's own test key. No test runs a step: the API only writes the
// inbox and enqueues, so a test writes the step host's events itself.
import { randomUUID } from "node:crypto";
import {
  type Conversation,
  type ConversationRuns,
  type ErrorEnvelope,
  EventId,
  LIMITS,
  type Me,
  type PodId,
  type RunAccepted,
  type RunEvents,
  type RunId,
} from "@jadwigo/contracts";
import type { RunQueue } from "@jadwigo/jadwigo-ai";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import type { MessageUsage } from "../conversations.ts";
import { pathOf, type Seeded, seeded } from "./client.ts";
import { bearerOf, signToken } from "./token.ts";

/** A queue and how many steps it holds for a run, sent and not yet taken or since taken. */
export interface Queued {
  readonly queue: RunQueue;
  stepsFor(run: RunId): Promise<number>;
}

const event = () => EventId.parse(randomUUID());

export function conversationSuite(
  name: string,
  makeStore: () => Store,
  makeQueue: () => Queued,
): void {
  describe(`the conversation routes on ${name}`, () => {
    let s: Seeded;
    let q: Queued;
    /** What the limits read: under both unless a test plants more. */
    let used: MessageUsage;
    let asked: { pod: PodId; minuteSince: string; daySince: string }[];
    beforeEach(() => {
      q = makeQueue();
      used = { messages: 0, cap_usd: 0 };
      asked = [];
      s = seeded(makeStore(), {
        queue: q.queue,
        usage: async (_store, pod, _account, since) => {
          asked.push({ pod, ...since });
          return used;
        },
      });
    });

    /** A signed-in parent with an account, so a pod of its own. */
    async function parent() {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const call = <T>(method: string, path: string, body?: unknown) =>
        s.call<T>(method, path, body, headers);
      const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
      expect(me.status).toBe(201);
      const pod = me.body.pod?.id as PodId;
      return {
        call,
        pod,
        async conversation(title?: string): Promise<Conversation> {
          const reply = await call<Conversation>("POST", pathOf("createConversation", {}), {
            event_id: event(),
            ...(title === undefined ? {} : { title }),
          });
          expect(reply.status).toBe(201);
          return reply.body;
        },
        async say(conversation: string, text: string, event_id = event()) {
          return call<RunAccepted>("POST", pathOf("postMessage", { id: conversation }), {
            event_id,
            text,
          });
        },
      };
    }

    it("starts a conversation in the caller's pod, once by event_id", async () => {
      const a = await parent();
      const event_id = event();
      const path = pathOf("createConversation", {});
      const made = await a.call<Conversation>("POST", path, { event_id, title: "Adding to 10" });
      expect(made.status).toBe(201);
      expect(made.body).toMatchObject({ pod_id: a.pod, title: "Adding to 10" });
      expect(made.body.id).toMatch(/^cnv_/);

      const again = await a.call<Conversation>("POST", path, { event_id, title: "Adding to 10" });
      expect(again.body).toEqual(made.body);
      const other = await a.call<ErrorEnvelope>("POST", path, { event_id, title: "Other" });
      expect(other.status).toBe(409);
      expect(other.body.error.type).toBe("EventIdMismatch");
      const owned = await a.call<ErrorEnvelope>("POST", path, { event_id: event(), pod_id: a.pod });
      expect(owned.status).toBe(400);
    });

    it("takes a message onto a new run with one step enqueued, and a resend lands once", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const event_id = event();
      const sent = await a.say(conversation.id, "A lesson on adding to 10, please", event_id);
      expect(sent.status).toBe(201);
      const run = sent.body.run;
      expect(run).toMatchObject({
        pod_id: a.pod,
        conversation_id: conversation.id,
        status: "queued",
        attempt: 1,
      });
      expect(await q.stepsFor(run.id)).toBe(1);

      const resent = await a.say(conversation.id, "A lesson on adding to 10, please", event_id);
      expect(resent.status).toBe(201);
      expect(resent.body.run.id).toBe(run.id);
      expect(await q.stepsFor(run.id)).toBe(1);

      const changed = await a.say(conversation.id, "Something else", event_id);
      expect(changed.status).toBe(409);
      expect((changed.body as unknown as ErrorEnvelope).error.type).toBe("EventIdMismatch");

      // Mid-turn, a 2nd message waits in the open run's inbox for its pending step.
      const more = await a.say(conversation.id, "Make it 5 questions");
      expect(more.body.run.id).toBe(run.id);
      expect(await q.stepsFor(run.id)).toBe(1);

      const runs = await a.call<ConversationRuns>(
        "GET",
        pathOf("listConversationRuns", { id: conversation.id }),
      );
      expect(runs.status).toBe(200);
      expect(runs.body.runs.map((r) => r.id)).toEqual([run.id]);
    });

    // dl-z5ja.62: both limits are read before anything is written, and either one past is 429.
    it("refuses a message past the parent's minute or the pod's day as 429 MessageLimit", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const planted: [string, MessageUsage][] = [
        ["minute", { messages: LIMITS.messagesPerMinute, cap_usd: 0 }],
        ["day", { messages: 0, cap_usd: LIMITS.podDailyCapUsd }],
      ];
      for (const [limit, usage] of planted) {
        used = usage;
        const refused = await a.say(conversation.id, `Over the ${limit}`);
        expect(refused.status, limit).toBe(429);
        expect((refused.body as unknown as ErrorEnvelope).error.type, limit).toBe("MessageLimit");
      }
      const runs = await a.call<ConversationRuns>(
        "GET",
        pathOf("listConversationRuns", { id: conversation.id }),
      );
      expect(runs.body.runs).toEqual([]);

      used = { messages: LIMITS.messagesPerMinute - 1, cap_usd: LIMITS.podDailyCapUsd - 0.5 };
      const under = await a.say(conversation.id, "Under both");
      expect(under.status).toBe(201);
      expect(await q.stepsFor(under.body.run.id)).toBe(1);

      // The windows: the last 60 s, and the UTC day so far, for the caller's pod.
      const last = asked.at(-1);
      expect(last?.pod).toBe(a.pod);
      expect(last?.daySince).toMatch(/T00:00:00\.000Z$/);
      const minute = Date.now() - Date.parse(last?.minuteSince ?? "");
      expect(minute).toBeGreaterThanOrEqual(60_000);
      expect(minute).toBeLessThan(70_000);
    });

    it("refuses a message the server would own, or an empty one", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const path = pathOf("postMessage", { id: conversation.id });
      for (const body of [
        { event_id: event(), text: "" },
        { event_id: "not-a-uuid", text: "Hi" },
        { event_id: event(), text: "Hi", from: "agent" },
      ]) {
        const reply = await a.call<ErrorEnvelope>("POST", path, body);
        expect(reply.status, JSON.stringify(body)).toBe(400);
      }
    });

    it("lists a run's events after the cursor, in seq order", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const { run } = (await a.say(conversation.id, "Hi")).body;
      // What the step host would write: the parent's message, then the agent's answer.
      await s.store.appendRunEvents(a.pod, run.id, run.attempt, [
        {
          run_id: run.id,
          event_id: event(),
          type: "message",
          payload: { from: "parent", text: "Hi" },
        },
        {
          run_id: run.id,
          event_id: event(),
          type: "message",
          payload: { from: "agent", text: "Hello" },
        },
      ]);
      const events = (after?: number | string) =>
        a.call<RunEvents>(
          "GET",
          `${pathOf("listRunEvents", { id: run.id })}${after === undefined ? "" : `?after=${after}`}`,
        );
      const all = await events();
      expect(all.status).toBe(200);
      expect(all.body.events.map((e) => e.seq)).toEqual([1, 2]);
      expect((await events(0)).body.events).toHaveLength(2);
      const later = await events(1);
      expect(later.body.events.map((e) => [e.seq, e.type])).toEqual([[2, "message"]]);
      expect((await events(2)).body.events).toEqual([]);
      expect((await events(-1)).status).toBe(400);
      expect((await events("one")).status).toBe(400);
    });

    it("asks an open run to stop, and answers an ended one as it is", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const { run } = (await a.say(conversation.id, "Hi")).body;
      const event_id = event();
      const path = pathOf("cancelRun", { id: run.id });
      const stopped = await a.call<RunAccepted>("POST", path, { event_id });
      expect(stopped.status).toBe(201);
      expect(stopped.body.run.id).toBe(run.id);
      expect(stopped.body.run.cancel_requested_at).not.toBeNull();
      const again = await a.call<RunAccepted>("POST", path, { event_id });
      expect(again.body.run.cancel_requested_at).toBe(stopped.body.run.cancel_requested_at);
      expect((await a.call<ErrorEnvelope>("POST", path, { event_id: "stop" })).status).toBe(400);

      const ended = await s.store.updateRun(a.pod, run.id, run.attempt, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      expect(ended.stale).toBe(false);
      const late = await a.call<RunAccepted>("POST", path, { event_id: event() });
      expect(late.status).toBe(201);
      expect(late.body.run.status).toBe("completed");
    });

    // Frozen (dl-z5ja.21, the steward's #409 review): a caller holding another family's
    // conversation or run id gets 404, never that family's run, and writes nothing to it.
    it("answers 404 NotFound to a caller with another pod's conversation id or run id", async () => {
      const a = await parent();
      const b = await parent();
      const conversation = await a.conversation();
      const { run } = (await a.say(conversation.id, "Hi")).body;
      await s.store.appendRunEvents(a.pod, run.id, run.attempt, [
        {
          run_id: run.id,
          event_id: event(),
          type: "message",
          payload: { from: "parent", text: "Hi" },
        },
      ]);

      const tries = [
        b.call<ErrorEnvelope>("POST", pathOf("postMessage", { id: conversation.id }), {
          event_id: event(),
          text: "Hi from another family",
        }),
        b.call<ErrorEnvelope>("GET", pathOf("listConversationRuns", { id: conversation.id })),
        b.call<ErrorEnvelope>("GET", pathOf("listRunEvents", { id: run.id })),
        b.call<ErrorEnvelope>("GET", `${pathOf("listRunEvents", { id: run.id })}?after=0`),
        b.call<ErrorEnvelope>("POST", pathOf("cancelRun", { id: run.id }), { event_id: event() }),
      ];
      for (const reply of await Promise.all(tries)) {
        expect(reply.status).toBe(404);
        expect(reply.body.error.type).toBe("NotFound");
      }

      // Nothing of the other family's call reached the run.
      const stored = await s.store.getRun(a.pod, run.id);
      expect(stored.cancel_requested_at).toBeNull();
      expect(await s.store.listRuns(a.pod, conversation.id)).toHaveLength(1);
      expect(await q.stepsFor(run.id)).toBe(1);
    });

    it("answers 409 AccountMissing to a signed-in user with no account yet", async () => {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const reply = await s.call<ErrorEnvelope>(
        "POST",
        pathOf("createConversation", {}),
        { event_id: event() },
        headers,
      );
      expect(reply.status).toBe(409);
      expect(reply.body.error.type).toBe("AccountMissing");
    });
  });
}
