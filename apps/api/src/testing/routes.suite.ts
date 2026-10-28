// The route suite, run on InMemoryStore by src/routes.test.ts and on PostgresStore by
// src/routes.int.test.ts. It holds the simulated session API's cases from the playground, moved to
// /api/v1's seq and try_no, and the growth rules.
import { randomUUID } from "node:crypto";
import {
  type AttemptAnswerResult,
  type AttemptSnapshot,
  type ErrorEnvelope,
  ID_PREFIXES,
  idOf,
} from "@jadwigo/contracts";
import { solutionOf } from "@jadwigo/core";
import type { NewPod, Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import {
  answerFields,
  openQuestion,
  pathOf,
  type Seeded,
  seeded,
  skipAt,
  start,
  tryAt,
} from "./client.ts";

const OTHER_POD: NewPod = {
  id: idOf(ID_PREFIXES.pod, "5b0f0d6e-6a52-4b8e-9d39-2a3e7f1c0b11") as NewPod["id"],
  name: "Another pod",
  language: "en",
};

export function routeSuite(name: string, makeStore: () => Store): void {
  describe(`the /api/v1 attempt routes on ${name}`, () => {
    let s: Seeded;
    beforeEach(() => {
      s = seeded(makeStore());
    });

    describe("start and snapshot", () => {
      it("starts an attempt at the first planned question, and the snapshot holds no key", async () => {
        const assignment = await s.assign("equalGroups");
        const reply = await s.call<AttemptSnapshot>(
          "POST",
          pathOf("startAttempt", { id: assignment }),
          {},
        );
        expect(reply.status).toBe(201);
        expect(reply.body.attempt.status).toBe("in_progress");
        expect(reply.body.questions.map((q) => [q.seq, q.added, q.ended])).toEqual([
          [1, "planned", null],
        ]);
        expect(reply.body.open_seq).toBe(1);
        expect(reply.body.last_event_id).toBeNull();
        const text = JSON.stringify(reply.body);
        expect(text).not.toContain('"key"');
        expect(text).not.toContain('"worked"');
        expect(reply.body.questions[0]?.help).toEqual([]);
      });

      it("reloads the same snapshot by the attempt's id", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const reload = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: id }));
        expect(reload.status).toBe(200);
        expect(reload.body).toEqual(snapshot);
      });

      it("answers 404 for an unknown assignment, an unknown attempt and an id that does not parse", async () => {
        const unknownAttempt = idOf(ID_PREFIXES.attempt, randomUUID());
        const unknownAssignment = idOf(ID_PREFIXES.assignment, randomUUID());
        for (const [method, path] of [
          ["GET", pathOf("getAttempt", { id: unknownAttempt })],
          ["POST", pathOf("startAttempt", { id: unknownAssignment })],
          ["GET", pathOf("getAttempt", { id: "not-an-id" })],
        ] as const) {
          const reply = await s.call<ErrorEnvelope>(
            method,
            path,
            method === "POST" ? {} : undefined,
          );
          expect(reply.status).toBe(404);
          expect(reply.body.error.type).toBe("NotFound");
        }
      });

      it("refuses a start body with a field it does not know", async () => {
        const assignment = await s.assign("equalGroups");
        const reply = await s.call<ErrorEnvelope>(
          "POST",
          pathOf("startAttempt", { id: assignment }),
          {
            status: "finished",
          },
        );
        expect([reply.status, reply.body.error.type]).toEqual([400, "BadRequest"]);
      });

      it("refuses a learner named on an assignment whose identity is none", async () => {
        const assignment = await s.assign("equalGroups");
        const reply = await s.call<ErrorEnvelope>(
          "POST",
          pathOf("startAttempt", { id: assignment }),
          {
            learner_id: idOf(ID_PREFIXES.learner, randomUUID()),
          },
        );
        expect([reply.status, reply.body.error.type]).toEqual([400, "BadRequest"]);
      });

      it("refuses a start on an assignment for learners when no learner is named", async () => {
        const assignment = await s.assign("equalGroups", { audience: "learners" });
        const reply = await s.call<ErrorEnvelope>(
          "POST",
          pathOf("startAttempt", { id: assignment }),
          {},
        );
        expect([reply.status, reply.body.error.type]).toEqual([400, "BadRequest"]);
      });
    });

    describe("caller binding: whoever holds the attempt id", () => {
      it("serves each attempt to the holder of its id, from its own pod, and nothing for another id", async () => {
        const mine = await start(s, await s.assign("equalGroups"));
        const theirs = await start(s, await s.assign("equalGroups", {}, OTHER_POD));
        expect(mine.snapshot.attempt.pod_id).not.toBe(theirs.snapshot.attempt.pod_id);

        const read = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: theirs.id }));
        expect(read.body.attempt.pod_id).toBe(OTHER_POD.id);
        expect(read.body.attempt.id).toBe(theirs.id);

        // An answer to one attempt never lands on the other.
        const page = await openQuestion(s, mine.id);
        await tryAt(s, mine.id, page, true);
        const other = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: theirs.id }));
        expect(other.body.last_event_id).toBeNull();

        const guessed = idOf(ID_PREFIXES.attempt, randomUUID());
        const refused = await s.call<ErrorEnvelope>("GET", pathOf("getAttempt", { id: guessed }));
        expect(refused.status).toBe(404);
        expect(JSON.stringify(refused.body)).not.toContain(OTHER_POD.id);
      });
    });

    describe("answers", () => {
      it("a miss stays open with its marks, a right try ends the question and asks the next", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const first = snapshot.questions[0];
        if (first === undefined) throw new Error("no first question");

        const miss = await tryAt(s, id, first, false);
        expect(miss.status).toBe(201);
        expect(miss.body).toMatchObject({
          seq: 1,
          try_no: 1,
          correct: false,
          ended: null,
          next: null,
          reveal: null,
        });
        // A typed entry missed whole is marked whole: no parts.
        expect(miss.body.parts).toBeNull();

        const again = await openQuestion(s, id);
        expect([again.seq, again.tries]).toEqual([1, 1]);

        const right = await tryAt(s, id, again, true);
        expect(right.body).toMatchObject({
          seq: 1,
          try_no: 2,
          correct: true,
          parts: null,
          ended: "correct",
        });
        expect(right.body.reveal).not.toBeNull();
        // Neither the miss, nor the right try's reveal, nor the next question carries the key.
        for (const reply of [miss.body, right.body]) {
          expect(JSON.stringify(reply)).not.toContain('"key"');
          expect(JSON.stringify(reply)).not.toContain('"accept"');
        }
        expect(right.body.next).toMatchObject({ seq: 2, added: "planned", tries: 0, ended: null });
        expect(right.body.attempt_status).toBe("in_progress");
      });

      it("replays a same-body retry and refuses another body under the same event_id", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const body = { ...answerFields(page), kind: "try", value: { entered: "9999" } };
        const first = await s.call<AttemptAnswerResult>("POST", pathOf("answer", { id: id }), body);
        const replay = await s.call<AttemptAnswerResult>(
          "POST",
          pathOf("answer", { id: id }),
          body,
        );
        expect(replay.status).toBe(201);
        expect(replay.body).toEqual({ ...first.body, replayed: true });

        const other = await s.call<ErrorEnvelope>("POST", pathOf("answer", { id: id }), {
          ...body,
          value: { entered: "10" },
        });
        expect([other.status, other.body.error.type]).toEqual([409, "EventIdMismatch"]);
      });

      it("refuses a 2nd event_id for the same try as AnswerConflict, and a try out of order", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        await tryAt(s, id, page, false);
        const loser = await tryAt(s, id, page, false);
        expect([loser.status, (loser.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "AnswerConflict",
        ]);
        const ahead = await tryAt(s, id, page, false, { try_no: 5 });
        expect([ahead.status, (ahead.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "TryOutOfOrder",
        ]);
      });

      it("of 2 tries at once on one question, stores exactly 1, and the winner's reply ends it", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const [first, second] = await Promise.all([
          tryAt(s, id, page, true),
          tryAt(s, id, page, true, { try_no: 2 }),
        ]);
        expect(first.status).toBe(201);
        expect(first.body).toMatchObject({ seq: 1, try_no: 1, ended: "correct" });
        expect(first.body.next).toMatchObject({ seq: 2 });
        // The other request lost: refused before or after the winner's unit, never stored.
        expect(second.status).toBe(409);
        expect(["QuestionNotOpen", "TryOutOfOrder"]).toContain(
          (second.body as unknown as ErrorEnvelope).error.type,
        );
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.questions[0]).toMatchObject({ seq: 1, tries: 1, ended: "correct" });
      });

      it("answers a retry racing its original with the original's reply", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const body = {
          ...answerFields(page),
          kind: "try",
          value: solutionOf(await s.questionOf(page)),
        };
        const post = () => s.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        const [a, b] = await Promise.all([post(), post()]);
        expect([a.status, b.status]).toEqual([201, 201]);
        expect([a.body.replayed, b.body.replayed].sort()).toEqual([false, true]);
        expect({ ...a.body, replayed: null }).toEqual({ ...b.body, replayed: null });
        expect(a.body.next).toMatchObject({ seq: 2 });
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.questions.map((q) => q.seq)).toEqual([1, 2]);
      });

      it("a replay goes on after an original that stopped between its append and the next question", async () => {
        // The store fails the first ask, as a crash after the append-and-end would leave it.
        const store = makeStore();
        let failed = false;
        const crashing = new Proxy(store, {
          get(target, key) {
            if (key === "askQuestion" && !failed) {
              failed = true;
              return () => Promise.reject(new Error("planted crash before the next question"));
            }
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
        const c = seeded(crashing);
        const { id, snapshot } = await start(c, await c.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const body = {
          ...answerFields(page),
          kind: "try",
          value: solutionOf(await c.questionOf(page)),
        };
        const first = await c.call("POST", pathOf("answer", { id }), body);
        expect(first.status).toBe(500);
        const stuck = await c.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect([stuck.body.open_seq, stuck.body.questions[0]?.ended]).toEqual([null, "correct"]);

        const replay = await c.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        expect(replay.body).toMatchObject({ replayed: true, ended: "correct", next: { seq: 2 } });
        const healed = await c.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(healed.body.open_seq).toBe(2);
      });

      it("a stale go-on whose ask lands after q2 ended never asks a planned question twice", async () => {
        // Asks 1 and 3 wait at a gate: the original's (stale) and the one after q2's answer.
        const store = makeStore();
        const gates = new Map<number, { arrived: Promise<void>; open: () => void }>();
        for (const call of [1, 3]) {
          let arrive = () => {};
          let open = () => {};
          const arrived = new Promise<void>((r) => {
            arrive = r;
          });
          const opened = new Promise<void>((r) => {
            open = r;
          });
          gates.set(call, { arrived: arrived.then(() => opened), open });
          gates.set(-call, { arrived, open: arrive });
        }
        let calls = 0;
        const gated = new Proxy(store, {
          get(target, key) {
            const value: unknown = Reflect.get(target, key, target);
            if (key !== "askQuestion" || typeof value !== "function") {
              return typeof value === "function" ? value.bind(target) : value;
            }
            return async (...args: Parameters<Store["askQuestion"]>) => {
              calls += 1;
              const gate = gates.get(calls);
              if (gate) {
                gates.get(-calls)?.open();
                await gate.arrived;
              }
              return target.askQuestion(...args);
            };
          },
        });
        const c = seeded(gated);
        const { id, snapshot } = await start(c, await c.assign("equalGroups"));
        const q1 = snapshot.questions[0];
        if (q1 === undefined) throw new Error("no first question");
        const body = {
          ...answerFields(q1),
          kind: "try",
          value: solutionOf(await c.questionOf(q1)),
        };

        const original = c.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        await gates.get(-1)?.arrived; // the original holds a stale ask for seq 2
        const replay = await c.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        expect(replay.body.next).toMatchObject({ seq: 2 }); // the replay asked q2

        const q2 = await openQuestion(c, id);
        const second = c.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), {
          ...answerFields(q2),
          kind: "try",
          value: solutionOf(await c.questionOf(q2)),
        });
        await gates.get(-3)?.arrived; // q2 has ended; its ask of q3 waits
        gates.get(1)?.open(); // the stale ask lands now, with no question open
        const late = await original;
        gates.get(3)?.open();
        expect((await second).body.next).toMatchObject({ seq: 3 });

        expect(late.status).toBe(201);
        expect(late.body.next).toMatchObject({ seq: 2 });
        const snap = await c.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        const asked = snap.body.questions.map((q) => q.lesson_question_id);
        expect(asked).toHaveLength(3);
        expect(new Set(asked).size).toBe(3);
      });

      it("refuses a field the server writes as ServerFieldSupplied, and a body that fails its schema", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const post = (body: unknown) =>
          s.call<ErrorEnvelope>("POST", pathOf("answer", { id: id }), body);

        const correct = await post({
          ...answerFields(page),
          kind: "try",
          value: { entered: "10" },
          correct: true,
        });
        expect([correct.status, correct.body.error.type]).toEqual([400, "ServerFieldSupplied"]);
        const twin = await post({ ...answerFields(page), kind: "skip", skip_reason: "help_twin" });
        expect([twin.status, twin.body.error.type]).toEqual([400, "ServerFieldSupplied"]);
        const early = await post({
          ...answerFields(page),
          kind: "skip",
          skip_reason: "dont_know",
          answered_at: "2000-01-01T00:00:00.000Z",
        });
        expect([early.status, early.body.error.type]).toEqual([400, "BadRequest"]);
      });

      it("answers 404 for a seq no question was asked at", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const reply = await tryAt(s, id, { ...page, seq: 7 }, true);
        expect(reply.status).toBe(404);
      });

      it("finishes on the answer that ends the last question, then refuses answers and still replays", async () => {
        const { id } = await start(s, await s.assign("equalGroups"));
        for (let n = 0; n < 3; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const page = await openQuestion(s, id);
        const body = {
          ...answerFields(page),
          kind: "try",
          value: solutionOf(await s.questionOf(page)),
        };
        const last = await s.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        expect(last.body).toMatchObject({
          seq: 4,
          ended: "correct",
          next: null,
          attempt_status: "finished",
        });
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.open_seq).toBeNull();
        expect(snap.body.attempt.finished_at).not.toBeNull();

        const replay = await s.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
        expect(replay.status).toBe(201);
        expect(replay.body).toEqual({ ...last.body, replayed: true });

        const late = await skipAt(s, id, { ...page, tries: 1 });
        expect([late.status, (late.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "AttemptFinished",
        ]);
      });

      it("finishes on a skip of the last question, but not on a miss there", async () => {
        const { id } = await start(s, await s.assign("equalGroups"));
        for (let n = 0; n < 3; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const lastQuestion = await openQuestion(s, id);
        const miss = await tryAt(s, id, lastQuestion, false);
        expect(miss.body.attempt_status).toBe("in_progress");
        // A true-or-false miss marks the option chosen, never its mistake class.
        expect(miss.body.parts).toEqual([expect.objectContaining({ correct: false })]);
        expect(JSON.stringify(miss.body.parts)).not.toContain("mistake");
        const skip = await skipAt(s, id, await openQuestion(s, id), "asked_to_skip");
        expect(skip.body).toMatchObject({
          ended: "skipped",
          correct: null,
          next: null,
          attempt_status: "finished",
        });
      });
    });

    describe("growth after Not sure yet", () => {
      it("next: goes on to the next planned question, no twin", async () => {
        const { id, snapshot } = await start(
          s,
          await s.assign("equalGroups", { after_not_sure: "next" }),
        );
        const reply = await skipAt(
          s,
          id,
          snapshot.questions[0] as AttemptSnapshot["questions"][number],
        );
        expect(reply.body.next).toMatchObject({
          seq: 2,
          added: "planned",
          placed: null,
          added_for: null,
        });
      });

      it("twin_now: asks the twin straight after, once, then the next planned question", async () => {
        const { id, snapshot } = await start(
          s,
          await s.assign("equalGroups", { after_not_sure: "twin_now" }),
        );
        const reply = await skipAt(
          s,
          id,
          snapshot.questions[0] as AttemptSnapshot["questions"][number],
        );
        expect(reply.body.next).toMatchObject({
          seq: 2,
          added: "twin",
          placed: "now",
          added_for: 1,
        });
        // Not sure yet on the twin itself adds nothing: a twin has no twin.
        const onTwin = await skipAt(s, id, await openQuestion(s, id));
        expect(onTwin.body.next).toMatchObject({ seq: 3, added: "planned" });
      });

      it("review_round: owes the twin until the planned questions are done, in the order skipped", async () => {
        const { id } = await start(
          s,
          await s.assign("equalGroups", { after_not_sure: "review_round" }),
        );
        await skipAt(s, id, await openQuestion(s, id)); // seq 1
        await tryAt(s, id, await openQuestion(s, id), true); // seq 2
        await skipAt(s, id, await openQuestion(s, id)); // seq 3
        const fourth = await tryAt(s, id, await openQuestion(s, id), true); // seq 4, the last planned
        expect(fourth.body.next).toMatchObject({
          seq: 5,
          added: "twin",
          placed: "review_round",
          added_for: 1,
        });
        const fifth = await tryAt(s, id, await openQuestion(s, id), true);
        expect(fifth.body.next).toMatchObject({
          seq: 6,
          added: "twin",
          placed: "review_round",
          added_for: 3,
        });
        const sixth = await tryAt(s, id, await openQuestion(s, id), true);
        expect(sixth.body).toMatchObject({ next: null, attempt_status: "finished" });
      });
    });

    describe("held verdicts: one try per question", () => {
      it("a wrong try ends the question, and the page sees done with no verdict", async () => {
        const { id, snapshot } = await start(
          s,
          await s.assign("equalGroups", { hold_verdicts: true }),
        );
        const page = snapshot.questions[0] as AttemptSnapshot["questions"][number];
        const miss = await tryAt(s, id, page, false);
        expect(miss.body).toMatchObject({
          correct: null,
          parts: null,
          reveal: null,
          ended: "done",
        });
        expect(miss.body.next).toMatchObject({ seq: 2 });

        const retry = await tryAt(s, id, { ...page, tries: 1 }, true);
        expect([retry.status, (retry.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "QuestionNotOpen",
        ]);

        const right = await tryAt(s, id, await openQuestion(s, id), true);
        expect(right.body).toMatchObject({ correct: null, reveal: null, ended: "done" });

        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: id }));
        expect(snap.body.questions.map((q) => q.ended)).toEqual(["done", "done", null]);
      });

      it("keeps the answer that finishes the attempt neutral, then shows the stored endings", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { hold_verdicts: true }));
        await tryAt(s, id, await openQuestion(s, id), false);
        for (let n = 0; n < 2; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const last = await tryAt(s, id, await openQuestion(s, id), true);
        expect(last.body).toMatchObject({
          correct: null,
          parts: null,
          reveal: null,
          ended: "done",
          attempt_status: "finished",
        });
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: id }));
        expect(snap.body.attempt.status).toBe("finished");
        expect(snap.body.questions.map((q) => q.ended)).toEqual([
          "missed",
          "correct",
          "correct",
          "correct",
        ]);
      });
    });

    describe("explain questions in v0", () => {
      it("never asks one: times-four plays its other questions and finishes", async () => {
        const { id } = await start(s, await s.assign("timesFour"));
        let last: AttemptAnswerResult | undefined;
        for (let n = 0; n < 20 && last?.attempt_status !== "finished"; n++)
          last = (await skipAt(s, id, await openQuestion(s, id), "asked_to_skip")).body;
        expect(last?.attempt_status).toBe("finished");
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: id }));
        expect(snap.body.questions).toHaveLength(10);
        expect(snap.body.questions.some((q) => q.question.family === "explain")).toBe(false);
      });
    });
  });
}
