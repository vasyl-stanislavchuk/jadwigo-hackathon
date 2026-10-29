// The route suite, run on InMemoryStore by src/routes.test.ts and on PostgresStore by
// src/routes.int.test.ts. It holds the simulated session API's cases from the playground, moved to
// /api/v1's seq and try_no, and the growth rules.
import { randomUUID } from "node:crypto";
import {
  AssignmentId,
  type AttemptAnswerResult,
  type AttemptResults,
  type AttemptReview,
  type AttemptSnapshot,
  type ErrorEnvelope,
  FEATURED_POD_ID,
  type Featured,
  type HelpResult,
  ID_PREFIXES,
  idOf,
  LIMITS,
  type PlaygroundExamples,
} from "@jadwigo/contracts";
import { solutionOf } from "@jadwigo/core";
import { importExamples, PLAYGROUND_EXAMPLES } from "@jadwigo/lesson-import";
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

type Page = AttemptSnapshot["questions"][number];

const OTHER_POD: NewPod = {
  id: idOf(ID_PREFIXES.pod, "5b0f0d6e-6a52-4b8e-9d39-2a3e7f1c0b11") as NewPod["id"],
  name: "Another pod",
  language: "en",
};

/**
 * `units`: the store runs a request as one unit that rolls back on a throw and holds its attempt's
 * lock to the end (PostgresStore). InMemoryStore does neither, so it keeps the race cases a
 * request split across many units can meet.
 */
export function routeSuite(
  name: string,
  makeStore: () => Store,
  { units = false }: { readonly units?: boolean } = {},
): void {
  describe(`the /api/v1 attempt routes on ${name}`, () => {
    let s: Seeded;
    beforeEach(() => {
      s = seeded(makeStore());
    });

    describe("featured lessons", () => {
      it("lists the featured pod's open anyone-assignments, never a closed, learners' or other pod's one", async () => {
        const open = await s.assign("equalGroups");
        const closed = await s.assign("equalGroups", { closes_at: "2000-01-01T00:00:00.000Z" });
        const soon = await s.assign("equalGroups", { opens_at: "2999-01-01T00:00:00.000Z" });
        const learners = await s.assign("equalGroups", { audience: "learners", identity: "pick" });
        const theirs = await s.assign("equalGroups", {}, OTHER_POD);

        const reply = await s.call<Featured>("GET", pathOf("featuredLessons", {}));
        expect(reply.status).toBe(200);
        const ids = reply.body.lessons.map((l) => l.assignment_id);
        expect(ids).toContain(open);
        for (const hidden of [closed, soon, learners, theirs]) expect(ids).not.toContain(hidden);
        expect(reply.body.lessons.find((l) => l.assignment_id === open)).toMatchObject({
          title: expect.any(String),
          language: "pl",
        });
        // A listed lesson starts with no login.
        const started = await s.call<AttemptSnapshot>(
          "POST",
          pathOf("startAttempt", { id: open }),
          {},
        );
        expect(started.status).toBe(201);
      });

      it("lists them oldest first, the id breaking a tie, as both stores order them", async () => {
        const made: string[] = [];
        for (let n = 0; n < 3; n++) made.push(await s.assign("equalGroups"));
        const records = await Promise.all(
          made.map((id) => s.store.getAssignment(FEATURED_POD_ID, AssignmentId.parse(id))),
        );
        const expected = records
          .sort((x, y) => x.created_at.localeCompare(y.created_at) || (x.id < y.id ? -1 : 1))
          .map((r) => r.id);

        const reply = await s.call<Featured>("GET", pathOf("featuredLessons", {}));
        const ids = reply.body.lessons.map((l) => l.assignment_id);
        expect(ids.filter((id) => made.includes(id))).toEqual(expected);
      });
    });

    describe("playground examples", () => {
      it("serves every written example in a language, with its question, key and twin, and no other pod's", async () => {
        await importExamples(s.store);
        await importExamples(s.store, PLAYGROUND_EXAMPLES.slice(0, 1), OTHER_POD);

        const reply = await s.call<PlaygroundExamples>(
          "GET",
          pathOf("playgroundExamples", { language: "pl" }),
        );
        expect(reply.status).toBe(200);
        const { examples, questions } = reply.body;
        const byId = new Map(questions.map((q) => [q.id, q]));
        expect(examples).toHaveLength(PLAYGROUND_EXAMPLES.length);
        expect(examples.every((e) => e.language === "pl")).toBe(true);
        expect(questions.every((q) => q.key !== undefined && q.pod_id === FEATURED_POD_ID)).toBe(
          true,
        );
        const twinned = examples.filter((e) => e.twin !== null);
        expect(twinned.length).toBe(PLAYGROUND_EXAMPLES.filter((e) => e.twin).length);
        expect(
          twinned.every(
            (e) => byId.get(e.twin ?? e.lesson_question_id)?.twin_of === e.lesson_question_id,
          ),
        ).toBe(true);
        // A type with a showcase leads with one.
        const typeOf = (e: (typeof examples)[number]) =>
          byId.get(e.lesson_question_id)?.question_type;
        for (const e of examples.filter((x) => x.showcase)) {
          expect(examples.find((x) => typeOf(x) === typeOf(e))?.showcase, e.slug).toBe(true);
        }
      });

      it("serves a language with no examples as an empty list, and an unknown one as NotFound", async () => {
        await importExamples(s.store);
        const uk = await s.call<PlaygroundExamples>(
          "GET",
          pathOf("playgroundExamples", { language: "uk" }),
        );
        expect(uk.body).toEqual({ examples: [], questions: [] });
        const de = await s.call<ErrorEnvelope>(
          "GET",
          pathOf("playgroundExamples", { language: "de" }),
        );
        expect(de.status).toBe(404);
      });
    });

    describe("the login-free limits", () => {
      it(`refuses an attempt's answer past ${LIMITS.answersPerAttempt} with AnswerLimit, storing nothing, and still replays`, async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        let page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        let last: Record<string, unknown> = {};
        // A practice question stays open after a miss, so one question takes every try.
        for (let n = 0; n < LIMITS.answersPerAttempt; n++) {
          last = { ...answerFields(page), kind: "try", value: { entered: "9999" } };
          const reply = await s.call("POST", pathOf("answer", { id }), last);
          expect(reply.status).toBe(201);
          page = { ...page, tries: page.tries + 1 };
        }
        const refused = await s.call<ErrorEnvelope>("POST", pathOf("answer", { id }), {
          ...answerFields(page),
          kind: "try",
          value: { entered: "9999" },
        });
        expect(refused.status).toBe(429);
        expect(refused.body.error.type).toBe("AnswerLimit");
        const after = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(after.body.questions[0]?.tries).toBe(LIMITS.answersPerAttempt);

        const replay = await s.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), last);
        expect(replay.status).toBe(201);
        expect(replay.body.replayed).toBe(true);
      }, 60_000);

      it("refuses an oversized body and an over-long entry with BadRequest, storing nothing", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const big = await s.call<ErrorEnvelope>("POST", pathOf("answer", { id }), {
          ...answerFields(page),
          kind: "try",
          value: { entered: "1".repeat(LIMITS.bodyBytes) },
        });
        expect(big.status).toBe(400);
        expect(big.body.error.type).toBe("BadRequest");
        const long = await s.call<ErrorEnvelope>("POST", pathOf("answer", { id }), {
          ...answerFields(page),
          kind: "try",
          value: { entered: "1".repeat(LIMITS.enteredChars + 1) },
        });
        expect(long.status).toBe(400);
        expect(long.body.error.type).toBe("BadRequest");
        const after = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(after.body.last_event_id).toBeNull();
        expect(after.body.questions[0]?.tries).toBe(0);
      });

      it("refuses a content-length that is not a number of bytes with BadRequest, storing nothing", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        const page = snapshot.questions[0];
        if (page === undefined) throw new Error("no first question");
        const body = { ...answerFields(page), kind: "try", value: { entered: "9999" } };
        for (const length of ["abc", "-1", "1e9", "12 bytes"]) {
          const refused = await s.call<ErrorEnvelope>("POST", pathOf("answer", { id }), body, {
            "content-length": length,
          });
          expect(refused.status, length).toBe(400);
          expect(refused.body.error.type).toBe("BadRequest");
        }
        const after = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(after.body.last_event_id).toBeNull();
      });
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

      it("gives the whole planned lesson on start, in position order, with no spare and no key", async () => {
        const { snapshot } = await start(s, await s.assign("equalGroups"));
        expect(snapshot.plan.map((p) => p.position)).toEqual([1, 2, 3, 4]);
        // The first planned question is the one asked at seq 1.
        expect(snapshot.plan[0]?.lesson_question_id).toBe(
          snapshot.questions[0]?.lesson_question_id,
        );
        // Exactly the version's planned rows: no spare, whatever its twin_of.
        const version = await s.store.getLessonVersion(
          snapshot.attempt.pod_id,
          snapshot.attempt.lesson_version_id,
        );
        expect(snapshot.plan.map((p) => p.lesson_question_id)).toEqual(
          version.questions.filter((v) => v.role === "planned").map((v) => v.lesson_question_id),
        );
        expect(JSON.stringify(snapshot.plan)).not.toContain('"key"');
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

      if (!units) {
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
      } else {
        it("a request that fails after its append writes nothing, so its resend is answered as new", async () => {
          // The store fails the first ask: the unit rolls the append and the end back with it.
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
          const untouched = await c.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
          expect(untouched.body.open_seq).toBe(1);
          expect(untouched.body.questions[0]).toMatchObject({ ended: null, tries: 0 });

          const resend = await c.call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body);
          expect(resend.body).toMatchObject({
            replayed: false,
            ended: "correct",
            next: { seq: 2 },
          });
        });

        it("a 2nd request on an attempt waits for the 1st to commit, so no ask goes stale", async () => {
          const store = makeStore();
          let arrive = () => {};
          let open = () => {};
          const arrived = new Promise<void>((r) => {
            arrive = r;
          });
          const opened = new Promise<void>((r) => {
            open = r;
          });
          let calls = 0;
          const gated = new Proxy(store, {
            get(target, key) {
              const value: unknown = Reflect.get(target, key, target);
              if (key !== "askQuestion" || typeof value !== "function") {
                return typeof value === "function" ? value.bind(target) : value;
              }
              return async (...args: Parameters<Store["askQuestion"]>) => {
                calls += 1;
                if (calls === 1) {
                  arrive();
                  await opened;
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
          await arrived; // the original holds its ask of seq 2, and the attempt's lock
          let settled = false;
          const replay = c
            .call<AttemptAnswerResult>("POST", pathOf("answer", { id }), body)
            .finally(() => {
              settled = true;
            });
          await new Promise((r) => setTimeout(r, 300));
          expect(settled).toBe(false);
          open();
          expect((await original).body).toMatchObject({ replayed: false, next: { seq: 2 } });
          expect((await replay).body).toMatchObject({ replayed: true, next: { seq: 2 } });
          const snap = await c.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
          expect(snap.body.questions.map((q) => q.seq)).toEqual([1, 2]);
        });
      }

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
        // The twin is added to what was asked, never to the plan, and nothing is renumbered.
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.plan).toEqual(snapshot.plan);
        expect(snap.body.questions.map((q) => [q.seq, q.added])).toEqual([
          [1, "planned"],
          [2, "twin"],
          [3, "planned"],
        ]);
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
        // The plan leaves the explain question off too, so the bar ends with the last one asked.
        expect(snap.body.plan).toHaveLength(10);
        expect(snap.body.plan.some((p) => p.question.family === "explain")).toBe(false);
      });
    });
    describe("help", () => {
      const askHelp = (s: Seeded, id: string, seq: number, seen: number) =>
        s.call<HelpResult>("POST", pathOf("help", { id, seq }), { help_released: seen });

      it("releases one rung per request, holds rungs 3 and 4 until a try, and a retry gets the same rung", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { after_not_sure: "next" }));
        const look = await askHelp(s, id, 1, 0);
        expect(look.status).toBe(200);
        expect(look.body).toMatchObject({ seq: 1, help_released: 1, ended: null, next: null });
        expect(look.body.released?.rung).toBe(1);

        const retry = await askHelp(s, id, 1, 0);
        expect(retry.body).toEqual(look.body);

        const boost = await askHelp(s, id, 1, 1);
        expect([boost.body.help_released, boost.body.released?.rung]).toEqual([2, 2]);
        const gated = await askHelp(s, id, 1, 2);
        expect(gated.body).toMatchObject({ help_released: 2, released: null, more: true });

        const reload = await openQuestion(s, id);
        expect(reload.help.map((h) => h.rung)).toEqual([1, 2]);
        expect(JSON.stringify(reload)).not.toContain('"key"');
      });

      it("rung 4 ends the question skipped and asks its twin now, whatever after_not_sure says", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { after_not_sure: "next" }));
        await tryAt(s, id, await openQuestion(s, id), false);
        let reply: HelpResult | undefined;
        for (let seen = 0; seen < 4 && reply?.ended == null; seen++)
          reply = (await askHelp(s, id, 1, seen)).body;
        expect(reply?.released?.rung).toBe(4);
        expect(reply).toMatchObject({ ended: "skipped", more: false });
        expect(reply?.next).toMatchObject({ seq: 2, added: "twin", placed: "now", added_for: 1 });

        const ended = await askHelp(s, id, 1, reply?.help_released ?? 0);
        expect([ended.status, (ended.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "QuestionNotOpen",
        ]);
        const results = await s.call<AttemptResults>("GET", pathOf("getResults", { id }));
        expect(results.body.results[0]).toMatchObject({ seq: 1, ended: "skipped" });
      });
    });

    describe("help at rung 4, under a pause and in races", () => {
      // equal-groups' first question has 4 rungs: 1 wrong try opens the gate, 3 requests reach rung 3.
      const toRungThree = async (id: string) => {
        await tryAt(s, id, await openQuestion(s, id), false);
        for (const seen of [0, 1, 2])
          await s.call("POST", pathOf("help", { id, seq: 1 }), { help_released: seen });
      };
      const rungFour = (id: string) =>
        s.call<HelpResult>("POST", pathOf("help", { id, seq: 1 }), { help_released: 3 });

      it("refuses help on a paused attempt before any write, and releases rung 4 after resume", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { after_not_sure: "next" }));
        await toRungThree(id);
        await s.call("PATCH", pathOf("patchAttempt", { id }), { status: "paused" });
        const paused = await rungFour(id);
        expect([paused.status, (paused.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "AttemptPaused",
        ]);
        const held = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(held.body.questions[0]).toMatchObject({ help_released: 3, ended: null });

        await s.call("PATCH", pathOf("patchAttempt", { id }), { status: "in_progress" });
        const twin = await rungFour(id);
        expect(twin.body).toMatchObject({ help_released: 4, ended: "skipped" });
        expect(twin.body.next).toMatchObject({ seq: 2, added: "twin" });
      });

      if (units) {
        it("makes a try sent while rung 4 asks the twin wait for it, then refuses it: no deadlock", async () => {
          // Rung 4's ask of the twin waits at a gate, with the release written and the unit open.
          const store = makeStore();
          let arrive = () => {};
          let open = () => {};
          const arrived = new Promise<void>((r) => {
            arrive = r;
          });
          const opened = new Promise<void>((r) => {
            open = r;
          });
          let gate = false;
          const gated = new Proxy(store, {
            get(target, key) {
              const value: unknown = Reflect.get(target, key, target);
              if (key !== "askQuestion" || typeof value !== "function") {
                return typeof value === "function" ? value.bind(target) : value;
              }
              return async (...args: Parameters<Store["askQuestion"]>) => {
                if (gate) {
                  gate = false;
                  arrive();
                  await opened;
                }
                return target.askQuestion(...args);
              };
            },
          });
          const c = seeded(gated);
          const { id } = await start(c, await c.assign("equalGroups", { after_not_sure: "next" }));
          await tryAt(c, id, await openQuestion(c, id), false);
          for (const seen of [0, 1, 2])
            await c.call("POST", pathOf("help", { id, seq: 1 }), { help_released: seen });
          const page = await openQuestion(c, id);

          gate = true;
          const help = c.call<HelpResult>("POST", pathOf("help", { id, seq: 1 }), {
            help_released: 3,
          });
          await arrived;
          const tried = tryAt(c, id, page, false);
          await new Promise((r) => setTimeout(r, 300));
          open();
          expect((await help).status).toBe(200);
          const late = (await tried) as unknown as { status: number; body: ErrorEnvelope };
          expect([late.status, late.body.error?.type]).toEqual([409, "QuestionNotOpen"]);
        });
      }

      it("ends the question even when a wrong try races the rung-4 request", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { after_not_sure: "next" }));
        await toRungThree(id);
        const page = await openQuestion(s, id);
        const [tried, help] = await Promise.all([tryAt(s, id, page, false), rungFour(id)]);
        expect(help.status).toBe(200);
        // The try lands before the rung, or finds the question ended: never a 500.
        expect([201, 409]).toContain(tried.status);
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.questions[0]).toMatchObject({ help_released: 4, ended: "skipped" });
        expect(snap.body.questions[1]).toMatchObject({ seq: 2, added: "twin", added_for: 1 });
        expect(snap.body.questions).toHaveLength(2);
      });

      it("gives 2 identical rung-4 requests at once the same reply, and a later retry too", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { after_not_sure: "next" }));
        await toRungThree(id);
        const [a, b] = await Promise.all([rungFour(id), rungFour(id)]);
        expect([a.status, b.status]).toEqual([200, 200]);
        expect(a.body).toEqual(b.body);
        expect(a.body).toMatchObject({ ended: "skipped", next: { seq: 2 } });
        expect((await rungFour(id)).body).toEqual(a.body);
        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.questions[0]?.tries).toBe(2); // the wrong try and 1 help_twin skip
      });

      for (const order of ["pause first", "help first"] as const) {
        it(`never leaves rung 4 showing on an open question when a pause races it (${order})`, async () => {
          const { id, snapshot } = await start(
            s,
            await s.assign("equalGroups", { after_not_sure: "next" }),
          );
          await toRungThree(id);
          const pause = () => s.call("PATCH", pathOf("patchAttempt", { id }), { status: "paused" });
          await (order === "pause first"
            ? Promise.all([pause(), rungFour(id)])
            : Promise.all([rungFour(id), pause()]));

          const held = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
          const q1 = held.body.questions[0];
          // Either the help won and rung 4 ended the question with its twin asked, or the pause
          // won and nothing was released: never rung 4 on an open question.
          if (q1?.help_released === 4) {
            expect(q1.ended).toBe("skipped");
            expect(held.body.questions[1]).toMatchObject({ seq: 2, added: "twin", added_for: 1 });
          } else {
            expect(q1).toMatchObject({ help_released: 3, ended: null });
          }

          await s.call("PATCH", pathOf("patchAttempt", { id }), { status: "in_progress" });
          if (q1?.help_released === 4) {
            const late = await tryAt(
              s,
              id,
              { ...(q1 as AttemptSnapshot["questions"][number]), tries: 2 },
              true,
            );
            expect(late.status).toBe(409);
          }
          const record = await s.store.getAttempt(snapshot.attempt.pod_id, snapshot.attempt.id);
          expect(record.answers.some((a) => a.kind === "try" && a.help_used === 4)).toBe(false);
        });
      }

      it("refuses a help_released ahead of what was released", async () => {
        const { id } = await start(s, await s.assign("equalGroups"));
        const ahead = await s.call<ErrorEnvelope>("POST", pathOf("help", { id, seq: 1 }), {
          help_released: 9,
        });
        expect([ahead.status, ahead.body.error.type]).toEqual([400, "BadRequest"]);
      });
    });

    describe("help on a ladder with rungs 1 and 4 only", () => {
      it("gives the page the true rung, and the 2nd release, rung 4, ends the question", async () => {
        // A look and a 1-line worked solution: rung 1 and rung 4, with no boost and no rung 3.
        const assignment = await s.assignLadder((help) => ({
          ...(help.look !== undefined && { look: help.look }),
          worked: (help.worked ?? []).slice(0, 1),
        }));
        const { id } = await start(s, assignment);
        const askHelp = (seen: number) =>
          s.call<HelpResult>("POST", pathOf("help", { id, seq: 1 }), { help_released: seen });

        const look = await askHelp(0);
        expect(look.body).toMatchObject({ help_released: 1, ended: null, more: true });
        expect(look.body.released?.rung).toBe(1);
        // Rung 4 waits for a real try.
        expect((await askHelp(1)).body).toMatchObject({ help_released: 1, released: null });

        await tryAt(s, id, await openQuestion(s, id), false);
        const twin = await askHelp(1);
        expect(twin.body.released?.rung).toBe(4);
        expect(twin.body).toMatchObject({ help_released: 2, ended: "skipped", more: false });
        expect(twin.body.next).toMatchObject({
          seq: 2,
          added: "twin",
          placed: "now",
          added_for: 1,
        });

        const snap = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
        expect(snap.body.questions[0]?.help.map((h) => h.rung)).toEqual([1, 4]);
      });
    });

    describe("pause and resume", () => {
      it("pauses at the open question, refuses answers while paused, and resumes on the version started", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        await tryAt(s, id, await openQuestion(s, id), true);
        const paused = await s.call<AttemptSnapshot>("PATCH", pathOf("patchAttempt", { id }), {
          status: "paused",
        });
        expect(paused.status).toBe(200);
        expect(paused.body.attempt).toMatchObject({ status: "paused", resume_at: 2 });

        const page = paused.body.questions.find((q) => q.seq === 2);
        if (page === undefined) throw new Error("no 2nd question");
        const refused = await tryAt(s, id, page, true);
        expect([refused.status, (refused.body as unknown as ErrorEnvelope).error.type]).toEqual([
          409,
          "AttemptPaused",
        ]);

        const resumed = await s.call<AttemptSnapshot>("PATCH", pathOf("patchAttempt", { id }), {
          status: "in_progress",
        });
        expect(resumed.body.attempt.status).toBe("in_progress");
        expect(resumed.body.attempt.lesson_version_id).toBe(snapshot.attempt.lesson_version_id);
        expect(resumed.body.open_seq).toBe(2);
        expect((await tryAt(s, id, page, true)).status).toBe(201);
      });

      it("refuses a status the server sets, and a change once finished", async () => {
        const { id } = await start(s, await s.assign("equalGroups"));
        const finish = await s.call<ErrorEnvelope>("PATCH", pathOf("patchAttempt", { id }), {
          status: "finished",
        });
        expect([finish.status, finish.body.error.type]).toEqual([400, "BadRequest"]);
        for (let n = 0; n < 4; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const late = await s.call<ErrorEnvelope>("PATCH", pathOf("patchAttempt", { id }), {
          status: "paused",
        });
        expect([late.status, late.body.error.type]).toEqual([409, "AttemptFinished"]);
      });
    });

    describe("results", () => {
      it("lists what was asked mid-lesson, with no tries, time or mistake classes", async () => {
        const { id } = await start(s, await s.assign("equalGroups"));
        await tryAt(s, id, await openQuestion(s, id), false);
        await tryAt(s, id, await openQuestion(s, id), true);
        const reply = await s.call<AttemptResults>("GET", pathOf("getResults", { id }));
        expect(reply.status).toBe(200);
        expect(reply.body.results.map((r) => [r.seq, r.added, r.ended])).toEqual([
          [1, "planned", "correct"],
          [2, "planned", null],
        ]);
        for (const key of ["tries", "time_ms", "mistake_classes", "first_try_correct"])
          expect(JSON.stringify(reply.body)).not.toContain(`"${key}"`);
      });

      it("says done while verdicts are held, and the stored endings once finished", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { hold_verdicts: true }));
        await tryAt(s, id, await openQuestion(s, id), false);
        const held = await s.call<AttemptResults>("GET", pathOf("getResults", { id }));
        expect(held.body.results.map((r) => r.ended)).toEqual(["done", null]);
        for (let n = 0; n < 3; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const done = await s.call<AttemptResults>("GET", pathOf("getResults", { id }));
        expect(done.body.results.map((r) => r.ended)).toEqual([
          "missed",
          "correct",
          "correct",
          "correct",
        ]);
      });
    });

    describe("review", () => {
      it("refuses an attempt that has not finished with AttemptNotFinished", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { hold_verdicts: true }));
        const fresh = await s.call<ErrorEnvelope>("GET", pathOf("getReview", { id }));
        expect([fresh.status, fresh.body.error.type]).toEqual([409, "AttemptNotFinished"]);
        await tryAt(s, id, await openQuestion(s, id), false);
        const held = await s.call<ErrorEnvelope>("GET", pathOf("getReview", { id }));
        expect([held.status, held.body.error.type]).toEqual([409, "AttemptNotFinished"]);
        const unknown = await s.call<ErrorEnvelope>(
          "GET",
          pathOf("getReview", { id: idOf(ID_PREFIXES.attempt, randomUUID()) }),
        );
        expect(unknown.status).toBe(404);
      });

      it("gives a finished attempt under held verdicts its verdicts, answers, marks, solutions and reveals, never the key", async () => {
        const { id } = await start(s, await s.assign("equalGroups", { hold_verdicts: true }));
        const skipped = await openQuestion(s, id);
        await skipAt(s, id, skipped, "asked_to_skip");
        // Held, the answer reply keeps the reveal back; a practice run of the lesson shows it.
        const practice = await start(s, await s.assign("equalGroups"));
        const shown = await tryAt(s, practice.id, practice.snapshot.questions[0] as Page, true);
        for (let n = 0; n < 2; n++) await tryAt(s, id, await openQuestion(s, id), true);
        const missed = await openQuestion(s, id);
        const last = await tryAt(s, id, missed, false);
        expect(last.body).toMatchObject({ ended: "done", attempt_status: "finished" });

        const reply = await s.call<AttemptReview>("GET", pathOf("getReview", { id }));
        expect(reply.status).toBe(200);
        expect(reply.body.attempt.status).toBe("finished");
        const { questions } = reply.body;
        // The stored endings, not done: the attempt is over.
        expect(questions.map((q) => [q.seq, q.added, q.ended])).toEqual([
          [1, "planned", "skipped"],
          [2, "planned", "correct"],
          [3, "planned", "correct"],
          [4, "planned", "missed"],
        ]);
        const [skip, right, , miss] = questions;
        // A skip with no try: no answer and no marks, but the solution and the reveal.
        expect(skip).toMatchObject({ answer: null, parts: null });
        expect(skip?.solution).toEqual(solutionOf(await s.questionOf(skipped)));
        // A right try: its answer is the solution, and no marks.
        expect(right?.parts).toBeNull();
        expect(right?.answer).toEqual(right?.solution);
        // A true-or-false miss: the option chosen, marked, and the right one as the solution.
        const missedQuestion = await s.questionOf(missed);
        expect(miss?.answer).not.toBeNull();
        expect(miss?.answer).not.toEqual(miss?.solution);
        expect(miss?.parts).toEqual([expect.objectContaining({ correct: false })]);
        expect(miss?.solution).toEqual(solutionOf(missedQuestion));
        expect(miss?.question.family).toBe(missedQuestion.family);
        // Every question carries the reveal a right try gets, however it ended.
        expect(skip?.reveal).toEqual(shown.body.reveal);

        // The child's slice: no tries, time or mistake class, and nothing of the key.
        const text = JSON.stringify(reply.body);
        for (const absent of [...CHILD_ONLY_ABSENT, ...KEY_ONLY])
          expect(text).not.toContain(absent);
      });
    });
  });
}

/** The fields the child's review never carries (decision 2026-10-27 on the after-lesson list). */
const CHILD_ONLY_ABSENT = [
  '"tries"',
  '"time_ms"',
  '"mistake_class',
  '"latency_ms"',
  "false_reject",
];

/**
 * What only equal-groups' keys hold: their field names, rule names and near answers' mistake
 * classes. The solution and the reveal come from the key too, so its right answers may show.
 */
export const KEY_ONLY = [
  '"key"',
  '"accept"',
  '"near"',
  '"rule"',
  '"orders"',
  "times_table",
  "neighbour_row",
  "add_for_multiply",
  "digit_reversal",
];
