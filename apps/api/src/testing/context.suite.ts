// A message's page context through the message route (dl-z5ja.114, dl-z5ja.107): run on
// InMemoryStore by src/conversation-context.test.ts and on PostgresStore with pgmq by
// src/conversation-context.int.test.ts. The route passes the body's context into the run inbox;
// acceptMessage refuses a page the pod does not hold as NotFound before anything is written.
import { randomUUID } from "node:crypto";
import {
  type Conversation,
  type ConversationRuns,
  type ErrorEnvelope,
  ErrorType,
  EventId,
  ID_PREFIXES,
  idOf,
  type LearnerSnapshot,
  type Me,
  type PodId,
  type RunAccepted,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import { pathOf, type Seeded, seeded } from "./client.ts";
import type { Queued } from "./conversations.suite.ts";
import { bearerOf, signToken } from "./token.ts";

export function contextSuite(name: string, makeStore: () => Store, makeQueue: () => Queued): void {
  describe(`a message's page context on ${name}`, () => {
    let s: Seeded;
    let q: Queued;
    beforeEach(() => {
      q = makeQueue();
      s = seeded(makeStore(), { queue: q.queue });
    });

    /** A consenting parent with one learner and one conversation. */
    async function parent() {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const call = <T>(method: string, path: string, body?: unknown) =>
        s.call<T>(method, path, body, headers);
      const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
      const pod = me.body.pod?.id as PodId;
      await call("PATCH", pathOf("patchPod", { id: pod }), { ai_consented: true });
      const learner = await call<LearnerSnapshot>("POST", pathOf("createLearner", {}), {
        first_name: "Ola",
      });
      expect(learner.status).toBe(201);
      const conversation = await call<Conversation>("POST", pathOf("createConversation", {}), {
        event_id: randomUUID(),
      });
      const send = (body: Record<string, unknown>) =>
        call<RunAccepted | ErrorEnvelope>(
          "POST",
          pathOf("postMessage", { id: conversation.body.id }),
          body,
        );
      const runs = async () =>
        (
          await call<ConversationRuns>(
            "GET",
            pathOf("listConversationRuns", { id: conversation.body.id }),
          )
        ).body.runs;
      return { pod, learner: learner.body.learner.id, send, runs };
    }

    it("keeps the learner the message was sent from in its inbox row", async () => {
      const p = await parent();
      const event_id = randomUUID();
      const context = { learner_id: p.learner };
      const sent = await p.send({ event_id, text: "Odejmowanie przez 10", context });
      expect(sent.status).toBe(201);
      const row = await s.store.findRunInbox(p.pod, EventId.parse(event_id));
      expect(row?.kind).toBe("message");
      expect(row?.kind === "message" ? row.payload : undefined).toEqual({
        text: "Odejmowanie przez 10",
        context,
      });
      // A resend with the same page answers the same run.
      const again = await p.send({ event_id, text: "Odejmowanie przez 10", context });
      expect(again.status).toBe(201);
      expect((again.body as RunAccepted).run.id).toBe((sent.body as RunAccepted).run.id);
    });

    it("keeps no context on a message sent from no page", async () => {
      const p = await parent();
      const event_id = randomUUID();
      expect((await p.send({ event_id, text: "Hej" })).status).toBe(201);
      const row = await s.store.findRunInbox(p.pod, EventId.parse(event_id));
      expect(row?.kind === "message" ? row.payload : undefined).toEqual({ text: "Hej" });
    });

    it("answers 409 EventIdMismatch for a resend that names another page, or none", async () => {
      const p = await parent();
      const event_id = randomUUID();
      const text = "Odejmowanie przez 10";
      expect((await p.send({ event_id, text, context: { learner_id: p.learner } })).status).toBe(
        201,
      );
      for (const body of [
        { event_id, text },
        { event_id, text, context: { lesson_id: idOf(ID_PREFIXES.lesson, randomUUID()) } },
      ]) {
        const resent = await p.send(body);
        expect(resent.status).toBe(409);
        expect((resent.body as ErrorEnvelope).error.type).toBe(ErrorType.enum.EventIdMismatch);
      }
    });

    it("answers 404 for another pod's learner, and opens no run", async () => {
      const mine = await parent();
      const theirs = await parent();
      const event_id = randomUUID();
      const refused = await mine.send({
        event_id,
        text: "Odejmowanie przez 10",
        context: { learner_id: theirs.learner },
      });
      expect(refused.status).toBe(404);
      expect((refused.body as ErrorEnvelope).error.type).toBe(ErrorType.enum.NotFound);
      expect(await mine.runs()).toEqual([]);
      expect(await s.store.findRunInbox(mine.pod, EventId.parse(event_id))).toBeUndefined();
    });
  });
}
