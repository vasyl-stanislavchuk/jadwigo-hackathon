// The AI engine's conversation routes (dl-z5ja.21): run on InMemoryStore by
// src/conversations.test.ts and on PostgresStore with pgmq by src/conversations.int.test.ts.
// Tokens are signed with the run's own test key. No test runs a step: the API only writes the
// inbox and enqueues, so a test writes the step host's events itself.
import { randomUUID } from "node:crypto";
import {
  type AccountId,
  type Conversation,
  type ConversationRuns,
  type ErrorEnvelope,
  EventId,
  ID_PREFIXES,
  idOf,
  LIMITS,
  type Me,
  type PodId,
  type RunAccepted,
  type RunEvents,
  RunId,
} from "@jadwigo/contracts";
import type { RunQueue } from "@jadwigo/jadwigo-ai";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  /** The store rolls a unit back on a throw (Postgres): a refused message then leaves nothing. */
  { units = false }: { readonly units?: boolean } = {},
): void {
  describe(`the conversation routes on ${name}`, () => {
    let s: Seeded;
    let q: Queued;
    beforeEach(() => {
      q = makeQueue();
      s = seeded(makeStore(), { queue: q.queue });
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
      const blank = await a.call<ErrorEnvelope>("POST", path, { event_id: event(), title: "  " });
      expect(blank.status).toBe(400);
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

    // dl-z5ja.62: both limits count real rows through store.messageUsage, in the message's own unit.
    it("refuses the parent's message past 10 in a minute as 429 MessageLimitMinute", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const usage = vi.spyOn(s.store, "messageUsage");
      // The 1st opens the turn; the rest wait in its inbox, each one counted.
      const sent = Array.from({ length: LIMITS.messagesPerMinute }, () => event());
      for (const [n, event_id] of sent.entries())
        expect((await a.say(conversation.id, `Message ${n + 1}`, event_id)).status).toBe(201);
      const eleventh = event();
      const refused = await a.say(conversation.id, "One too many", eleventh);
      expect(refused.status).toBe(429);
      expect((refused.body as unknown as ErrorEnvelope).error.type).toBe("MessageLimitMinute");

      // The steward's review of #464: a resend of a stored message lands once, past the limit too.
      const tenth = sent.at(-1) as EventId;
      const resent = await a.say(conversation.id, `Message ${sent.length}`, tenth);
      expect(resent.status).toBe(201);
      // Rolled back, the refused 11th was never stored, so its own resend is refused again.
      if (units) expect((await a.say(conversation.id, "One too many", eleventh)).status).toBe(429);
      const [run] = (
        await a.call<ConversationRuns>(
          "GET",
          pathOf("listConversationRuns", { id: conversation.id }),
        )
      ).body.runs;
      expect(await q.stepsFor(run?.id as RunId)).toBe(1);
      expect(resent.body.run.id).toBe(run?.id);

      // The windows: the last 60 s, and the UTC day so far, for the caller's pod.
      const [pod, , since] = usage.mock.calls.at(-1) ?? [];
      expect(pod).toBe(a.pod);
      expect(since?.daySince).toMatch(/T00:00:00\.000Z$/);
      const minute = Date.now() - Date.parse(since?.minuteSince ?? "");
      expect(minute).toBeGreaterThanOrEqual(60_000);
      expect(minute).toBeLessThan(70_000);
      usage.mockRestore();
    });

    it("refuses a message once the pod's runs today reach the daily cap, and passes under it", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const me = await a.call<Me>("GET", pathOf("getMe", {}));
      const account = me.body.account?.id as AccountId;
      // A turn already open today with all but 1 USD of the cap: the next message still passes.
      const now = Date.now();
      const spent = await s.store.createRun(a.pod, {
        id: RunId.parse(idOf(ID_PREFIXES.run, randomUUID())),
        created_by: account,
        conversation_id: conversation.id,
        workflow: "jadwigo-lesson-compose",
        resumes: null,
        cap_usd: LIMITS.podDailyCapUsd - 1,
        idle_deadline_at: new Date(now + 60_000).toISOString(),
        max_deadline_at: new Date(now + 120_000).toISOString(),
      });
      await s.store.updateRun(a.pod, spent.id, spent.attempt, {
        status: "completed",
        completed_at: new Date(now).toISOString(),
      });
      const under = await a.say(conversation.id, "Under the cap");
      expect(under.status).toBe(201);
      expect(under.body.run.id).not.toBe(spent.id);

      // The day is now at the cap, yet a message that joins the open turn opens no run: it passes.
      const joined = await a.say(conversation.id, "One more thing for this lesson");
      expect(joined.status).toBe(201);
      expect(joined.body.run.id).toBe(under.body.run.id);

      // A new turn would take the day past the cap by its own 1 USD: refused.
      await s.store.updateRun(a.pod, under.body.run.id, under.body.run.attempt, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      const refused = await a.say(conversation.id, "Over the cap");
      expect(refused.status).toBe(429);
      expect((refused.body as unknown as ErrorEnvelope).error.type).toBe("MessageLimitDay");
      const runs = await a.call<ConversationRuns>(
        "GET",
        pathOf("listConversationRuns", { id: conversation.id }),
      );
      if (units) expect(runs.body.runs).toHaveLength(2);
    });

    // dl-z5ja.93: a lesson-pane edit over the route lands as a steer on the open turn.
    it("takes a steer onto the open turn as an inbox row of kind steer, once by event_id", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const path = pathOf("postMessage", { id: conversation.id });
      const early = await a.call<ErrorEnvelope>("POST", path, {
        event_id: event(),
        kind: "steer",
        text: "Make it shorter",
      });
      expect(early.status).toBe(400);

      const { run } = (await a.say(conversation.id, "A lesson on adding to 10")).body;
      const steer = {
        event_id: event(),
        kind: "steer",
        source: "lesson_edit",
        question_ids: ["q2", "q3"],
        text: "Use smaller numbers in these",
      };
      const sent = await a.call<RunAccepted>("POST", path, steer);
      expect(sent.status).toBe(201);
      expect(sent.body.run.id).toBe(run.id);
      expect((await a.call<RunAccepted>("POST", path, steer)).status).toBe(201);
      const moved = await a.call<ErrorEnvelope>("POST", path, { ...steer, question_ids: ["q4"] });
      expect(moved.status).toBe(409);
      expect(moved.body.error.type).toBe("EventIdMismatch");

      const inbox = await s.store.takeRunInbox(a.pod, run.id);
      const steers = inbox.filter((row) => row.kind === "steer");
      expect(steers).toHaveLength(1);
      expect(steers[0]?.payload).toEqual({
        text: "Use smaller numbers in these",
        source: "lesson_edit",
        question_ids: ["q2", "q3"],
      });
      // A steer opens no turn and starts no 2nd step.
      expect(await q.stepsFor(run.id)).toBe(1);
    });

    it("refuses a message the server would own, or an empty one", async () => {
      const a = await parent();
      const conversation = await a.conversation();
      const path = pathOf("postMessage", { id: conversation.id });
      for (const body of [
        { event_id: event(), text: "" },
        { event_id: event(), text: "   \n " },
        { event_id: "not-a-uuid", text: "Hi" },
        { event_id: event(), text: "Hi", from: "agent" },
        { event_id: event(), text: "Hi", source: "lesson_edit" },
        { event_id: event(), text: "Hi", kind: "steer", question_ids: [] },
        { event_id: event(), text: "Hi", kind: "approval" },
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
      // Exact digits, at most run_event.seq's integer: past it would be a 500 on Postgres.
      expect((await events(2_147_483_647)).body.events).toEqual([]);
      for (const bad of ["2147483648", "", "%20", "-0", "0x10", "1e3", "1.5"]) {
        const reply = await events(bad);
        expect(reply.status, `after=${bad}`).toBe(400);
        expect((reply.body as unknown as ErrorEnvelope).error.type).toBe("BadRequest");
      }
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

      // The next turn's Stop, sent with the 1st turn's cancel event_id, names another run: 409.
      // The store refuses an event_id another run holds (dl-z5ja.36) before the route's own check.
      const next = (await a.say(conversation.id, "Once more")).body.run;
      expect(next.id).not.toBe(run.id);
      const reused = await a.call<ErrorEnvelope>("POST", pathOf("cancelRun", { id: next.id }), {
        event_id,
      });
      expect(reused.status).toBe(409);
      expect(reused.body.error.type).toBe("WriteOnce");
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
        b.call<ErrorEnvelope>("POST", pathOf("postMessage", { id: conversation.id }), {
          event_id: event(),
          kind: "steer",
          text: "A steer from another family",
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
