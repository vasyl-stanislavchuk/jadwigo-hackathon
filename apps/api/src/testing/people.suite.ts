// The parent login routes (wave 3 of dl-e8ov.2): run on InMemoryStore by src/routes.test.ts and on
// PostgresStore by src/routes.int.test.ts. Tokens are signed with the run's own test key.
import { randomUUID } from "node:crypto";
import {
  type AssignmentAttempts,
  type AttemptAnswerResult,
  type AttemptSnapshot,
  type Claim,
  type ErrorEnvelope,
  ID_PREFIXES,
  idOf,
  type LearnerAttempts,
  type LearnerSnapshot,
  type Me,
  type ParentAttemptReview,
  ROUTES,
  type RouteName,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import { openQuestion, pathOf, type Seeded, seeded, skipAt, start, tryAt } from "./client.ts";
import { KEY_ONLY } from "./routes.suite.ts";
import { bearerOf, signToken } from "./token.ts";

const TOKEN_ROUTES = (Object.keys(ROUTES) as RouteName[]).filter(
  (name) => ROUTES[name].auth === "token",
);

const IDS = {
  id: idOf(ID_PREFIXES.attempt, randomUUID()),
};

export function peopleSuite(name: string, makeStore: () => Store): void {
  describe(`the parent login routes on ${name}`, () => {
    let s: Seeded;
    beforeEach(() => {
      s = seeded(makeStore());
    });

    /** A signed-in user: a fresh sub, and calls carrying its token. */
    function parent() {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      return {
        call: <T>(method: string, path: string, body?: unknown) =>
          s.call<T>(method, path, body, headers),
        async signUp(language: "pl" | "en" = "pl") {
          const reply = await s.call<Me>(
            "POST",
            pathOf("createAccount", {}),
            { language },
            headers,
          );
          expect(reply.status).toBe(201);
          return reply.body;
        },
        async addChild(first_name: string, goals: string[] = []) {
          const reply = await s.call<LearnerSnapshot>(
            "POST",
            pathOf("createLearner", {}),
            { first_name, goals: goals.map((g) => ({ name: g })) },
            headers,
          );
          expect(reply.status).toBe(201);
          return reply.body.learner;
        },
      };
    }

    it("refuses every token route without a token, or with a bad one, as 401 NotSignedIn", async () => {
      expect(TOKEN_ROUTES).toHaveLength(21);
      const tokens = [
        undefined,
        signToken({}, true),
        signToken({ expiresIn: -3600 }),
        signToken({ aud: "anon" }),
      ];
      for (const route of TOKEN_ROUTES) {
        const { method, path } = ROUTES[route];
        for (const token of tokens) {
          const reply = await s.call<ErrorEnvelope>(
            method,
            path
              .replace(
                "{id}",
                ROUTES[route].path.includes("learners/{id}")
                  ? idOf(ID_PREFIXES.learner, randomUUID())
                  : IDS.id,
              )
              .replace("{attempt}", IDS.id)
              .replace("{goal}", idOf(ID_PREFIXES.goal, randomUUID()))
              .replace("{report}", idOf(ID_PREFIXES.learner_report, randomUUID())),
            {},
            token === undefined ? {} : bearerOf(token),
          );
          expect([route, reply.status, reply.body.error.type]).toEqual([route, 401, "NotSignedIn"]);
        }
      }
    });

    it("makes the pod, account and parent member on the first sign-in, and the same Me after", async () => {
      const p = parent();
      const before = await p.call<Me>("GET", pathOf("getMe", {}));
      expect(before).toEqual({
        status: 200,
        body: { account: null, member: null, pod: null, learners: [] },
      });

      const made = await p.signUp("en");
      expect(made).toMatchObject({
        member: { role: "parent" },
        pod: { name: "home", language: "en" },
        learners: [],
      });
      expect(await p.signUp("en")).toEqual(made);
      expect((await p.call<Me>("GET", pathOf("getMe", {}))).body).toEqual(made);
      const refused = await p.call<ErrorEnvelope>("POST", pathOf("createAccount", {}), {
        language: "de",
      });
      expect(refused.status).toBe(400);
    });

    it("makes one account for 2 first sign-ins at once, and 2 handles for 2 same-named children at once", async () => {
      // Each request is a unit of its own: one transaction on Postgres, where a unique violation
      // would abort it rather than leave a 2nd look possible.
      const p = parent();
      const [a, b] = await Promise.all([p.signUp(), p.signUp()]);
      expect(a).toEqual(b);
      const [fox, again] = await Promise.all([p.addChild("Fox"), p.addChild("Fox")]);
      expect(new Set([fox.handle, again.handle]).size).toBe(2);
    });

    it("adds a child with goals once the account exists, and lists it on Me", async () => {
      const p = parent();
      const early = await p.call<ErrorEnvelope>("POST", pathOf("createLearner", {}), {
        first_name: "Fox",
      });
      expect([early.status, early.body.error.type]).toEqual([409, "AccountMissing"]);

      await p.signUp();
      const reply = await p.call<LearnerSnapshot>("POST", pathOf("createLearner", {}), {
        first_name: "Fox",
        age_group: "7-8",
        goals: [{ name: "Times tables" }],
      });
      expect(reply.status).toBe(201);
      expect(reply.body).toMatchObject({
        learner: { handle: "fox", first_name: "Fox", age_group: "7-8" },
        goals: [{ name: "Times tables" }],
      });
      const me = await p.call<Me>("GET", pathOf("getMe", {}));
      expect(me.body.learners).toEqual([reply.body]);

      const tooMany = await p.call<ErrorEnvelope>("POST", pathOf("createLearner", {}), {
        first_name: "Owl",
        goals: Array.from({ length: 6 }, (_, n) => ({ name: `Goal ${n}` })),
      });
      expect([tooMany.status, tooMany.body.error.type]).toEqual([400, "BadRequest"]);
    });

    it("claims the tab's attempt for a child, once, with its answers unchanged, and lists it", async () => {
      const { id, snapshot } = await start(s, await s.assign("equalGroups"));
      const first = snapshot.questions[0];
      if (first === undefined) throw new Error("no first question");
      const answered = await tryAt(s, id, first, true);
      expect((answered.body as AttemptAnswerResult).ended).toBe("correct");
      const played = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));

      const p = parent();
      const me = await p.signUp();
      const child = await p.addChild("Badger");
      const claims = pathOf("claimAttempt", { id });
      const claim = await p.call<Claim>("POST", claims, { learner_id: child.id });
      expect(claim.status).toBe(201);
      expect(claim.body).toMatchObject({
        attempt_id: id,
        learner_id: child.id,
        claimed_by: me.account?.id,
      });

      // The anonymous tab still plays it, and nothing it answered changed.
      const after = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id }));
      expect(after.body.questions).toEqual(played.body.questions);
      expect(after.body.attempt).toMatchObject({
        learner_id: child.id,
        claimed_by: me.account?.id,
      });

      // The same claim again is a replay; another child is refused.
      expect(await p.call<Claim>("POST", claims, { learner_id: child.id })).toEqual(claim);
      const other = await p.addChild("Mole");
      const again = await p.call<ErrorEnvelope>("POST", claims, { learner_id: other.id });
      expect([again.status, again.body.error.type]).toEqual([409, "AttemptClaimed"]);

      const listed = await p.call<LearnerAttempts>(
        "GET",
        pathOf("getLearnerAttempts", { id: child.id }),
      );
      expect(listed.status).toBe(200);
      expect(listed.body.learner.id).toBe(child.id);
      expect(listed.body.attempts).toHaveLength(1);
      expect(listed.body.attempts[0]?.attempt.id).toBe(id);
      // The parent's full rows: q1 answered right, q2 asked and still open.
      expect(listed.body.attempts[0]?.results.map((r) => [r.seq, r.ended, r.tries])).toEqual([
        [1, "correct", 1],
        [2, null, 0],
      ]);
    });

    it("refuses another pod's child and attempt list as 404, a preview as 409, and an unknown attempt as 404", async () => {
      const { id } = await start(s, await s.assign("equalGroups"));
      const p = parent();
      await p.signUp();
      const child = await p.addChild("Otter");
      const stranger = parent();
      await stranger.signUp();
      const theirs = await stranger.addChild("Stoat");

      const claimTheirs = await p.call<ErrorEnvelope>("POST", pathOf("claimAttempt", { id }), {
        learner_id: theirs.id,
      });
      expect([claimTheirs.status, claimTheirs.body.error.type]).toEqual([404, "NotFound"]);
      const readTheirs = await stranger.call<ErrorEnvelope>(
        "GET",
        pathOf("getLearnerAttempts", { id: child.id }),
      );
      expect([readTheirs.status, readTheirs.body.error.type]).toEqual([404, "NotFound"]);
      const unknown = await p.call<ErrorEnvelope>(
        "POST",
        pathOf("claimAttempt", { id: idOf(ID_PREFIXES.attempt, randomUUID()) }),
        { learner_id: child.id },
      );
      expect(unknown.status).toBe(404);

      const preview = await start(s, await s.assign("equalGroups"), { mode: "preview" });
      const refused = await p.call<ErrorEnvelope>(
        "POST",
        pathOf("claimAttempt", { id: preview.id }),
        { learner_id: child.id },
      );
      expect([refused.status, refused.body.error.type]).toEqual([409, "AttemptPreview"]);
    });

    it("lists an assignment's claimed attempt with its full rows, never a preview, an unclaimed one or a key", async () => {
      const assignment = await s.assign("equalGroups");
      const { id, snapshot } = await start(s, assignment);
      const first = snapshot.questions[0];
      if (first === undefined) throw new Error("no first question");
      await tryAt(s, id, first, true);
      const unclaimed = await start(s, assignment);
      const preview = await start(s, assignment, { mode: "preview" });
      const p = parent();
      await p.signUp();
      const child = await p.addChild("Wren");
      const claim = await p.call<Claim>("POST", pathOf("claimAttempt", { id }), {
        learner_id: child.id,
      });
      expect(claim.status).toBe(201);

      const reply = await p.call<AssignmentAttempts>(
        "GET",
        pathOf("getAssignmentAttempts", { id: assignment }),
      );
      expect(reply.status).toBe(200);
      expect(reply.body).toMatchObject({
        assignment: { id: assignment },
        title: expect.any(String),
        language: "pl",
      });
      expect(reply.body.attempts.map((a) => [a.attempt.id, a.name])).toEqual([[id, "Wren"]]);
      expect(reply.body.attempts.map((a) => a.attempt.id)).not.toContain(unclaimed.id);
      expect(reply.body.attempts.map((a) => a.attempt.id)).not.toContain(preview.id);
      // The parent's full rows, tries and time included, as getLearnerAttempts gives them.
      expect(reply.body.attempts[0]?.results.map((r) => [r.seq, r.ended, r.tries])).toEqual([
        [1, "correct", 1],
        [2, null, 0],
      ]);
      expect(reply.body.attempts[0]?.results[0]?.time_ms).toEqual(expect.any(Number));
      const text = JSON.stringify(reply.body);
      for (const absent of [...KEY_ONLY, '"body_hash"', '"event_id"'])
        expect(text).not.toContain(absent);
    });

    it("refuses an assignment the caller's pod reads no attempt of as 404, and no account as 409", async () => {
      const assignment = await s.assign("equalGroups");
      await start(s, assignment);
      const path = pathOf("getAssignmentAttempts", { id: assignment });
      const stranger = parent();
      await stranger.signUp();
      await stranger.addChild("Stoat");
      const reply = await stranger.call<ErrorEnvelope>("GET", path);
      expect([reply.status, reply.body.error.type]).toEqual([404, "NotFound"]);
      const unknown = await stranger.call<ErrorEnvelope>(
        "GET",
        pathOf("getAssignmentAttempts", { id: idOf(ID_PREFIXES.assignment, randomUUID()) }),
      );
      expect([unknown.status, unknown.body.error.type]).toEqual([404, "NotFound"]);
      const early = await parent().call<ErrorEnvelope>("GET", path);
      expect([early.status, early.body.error.type]).toEqual([409, "AccountMissing"]);
    });

    describe("the parent's review", () => {
      /** Plays equal-groups in practice to the end: q1 missed then right, q4 missed then skipped. */
      async function finishedAttempt(): Promise<string> {
        const { id } = await start(s, await s.assign("equalGroups"));
        await tryAt(s, id, await openQuestion(s, id), false);
        for (let n = 0; n < 3; n++) await tryAt(s, id, await openQuestion(s, id), true);
        await tryAt(s, id, await openQuestion(s, id), false);
        const last = await skipAt(s, id, await openQuestion(s, id), "asked_to_skip");
        expect((last.body as AttemptAnswerResult).attempt_status).toBe("finished");
        return id;
      }

      async function claimed(attempt: string) {
        const p = parent();
        await p.signUp();
        const child = await p.addChild("Hedgehog");
        const claim = await p.call<Claim>("POST", pathOf("claimAttempt", { id: attempt }), {
          learner_id: child.id,
        });
        expect(claim.status).toBe(201);
        return { p, child };
      }

      it("reads a claimed attempt's review with every try, its time and its mistake class, never the key", async () => {
        const id = await finishedAttempt();
        const { p, child } = await claimed(id);
        const path = pathOf("getParentReview", { id: child.id, attempt: id });
        const reply = await p.call<ParentAttemptReview>("GET", path);
        expect(reply.status).toBe(200);
        expect(reply.body).toMatchObject({
          attempt: { id, learner_id: child.id, status: "finished" },
          title: expect.any(String),
          language: "pl",
        });
        const { questions } = reply.body;
        expect(
          questions.map((q) => [q.seq, q.ended, q.tries.map((t) => [t.try_no, t.kind])]),
        ).toEqual([
          [
            1,
            "correct",
            [
              [1, "try"],
              [2, "try"],
            ],
          ],
          [2, "correct", [[1, "try"]]],
          [3, "correct", [[1, "try"]]],
          [
            4,
            "skipped",
            [
              [1, "try"],
              [2, "skip"],
            ],
          ],
        ]);
        const [first, , , fourth] = questions;
        expect(first?.tries.map((t) => [t.correct, t.latency_ms])).toEqual([
          [false, 1200],
          [true, 1200],
        ]);
        expect(first?.result).toMatchObject({ seq: 1, tries: 2, first_try_correct: false });
        // The true-or-false miss names its mistake class; the skip after it ends the question.
        expect(fourth?.tries[0]?.mistake_class).toBe("false_reject");
        expect(fourth?.tries[1]).toMatchObject({ value: null, skip_reason: "asked_to_skip" });
        expect(fourth?.result).toMatchObject({
          mistake_classes: ["false_reject"],
          ended: "skipped",
        });
        expect(fourth?.result.time_ms).toBeGreaterThan(0);
        // The last try's answer and marks, and the solution, as the child's review has them.
        expect(fourth?.parts).toEqual([expect.objectContaining({ correct: false })]);
        expect(fourth?.answer).not.toEqual(fourth?.solution);

        const text = JSON.stringify(reply.body);
        for (const absent of [...KEY_ONLY, '"body_hash"', '"event_id"'])
          expect(text).not.toContain(absent);
      });

      it("refuses an unfinished attempt with AttemptNotFinished", async () => {
        const { id, snapshot } = await start(s, await s.assign("equalGroups"));
        await tryAt(s, id, snapshot.questions[0] as AttemptSnapshot["questions"][number], true);
        const { p, child } = await claimed(id);
        const reply = await p.call<ErrorEnvelope>(
          "GET",
          pathOf("getParentReview", { id: child.id, attempt: id }),
        );
        expect([reply.status, reply.body.error.type]).toEqual([409, "AttemptNotFinished"]);
      });

      it("refuses a learner of another pod, and another pod's caller, as 404", async () => {
        const id = await finishedAttempt();
        const { p, child } = await claimed(id);
        const stranger = parent();
        await stranger.signUp();
        const theirs = await stranger.addChild("Stoat");
        for (const [caller, learner] of [
          [stranger, child.id],
          [p, theirs.id],
        ] as const) {
          const reply = await caller.call<ErrorEnvelope>(
            "GET",
            pathOf("getParentReview", { id: learner, attempt: id }),
          );
          expect([reply.status, reply.body.error.type]).toEqual([404, "NotFound"]);
        }
      });

      it("refuses an attempt not claimed for the learner, another child's, and an unknown one as 404", async () => {
        const unclaimed = await finishedAttempt();
        const id = await finishedAttempt();
        const { p, child } = await claimed(id);
        const sibling = await p.addChild("Mole");
        for (const [learner, attempt] of [
          [child.id, unclaimed],
          [sibling.id, id],
          [child.id, idOf(ID_PREFIXES.attempt, randomUUID())],
        ] as const) {
          const reply = await p.call<ErrorEnvelope>(
            "GET",
            pathOf("getParentReview", { id: learner, attempt }),
          );
          expect([reply.status, reply.body.error.type]).toEqual([404, "NotFound"]);
        }
      });

      it("refuses a caller with no token as 401, and one with no account yet as 409", async () => {
        const id = await finishedAttempt();
        const { child } = await claimed(id);
        const path = pathOf("getParentReview", { id: child.id, attempt: id });
        const anonymous = await s.call<ErrorEnvelope>("GET", path);
        expect([anonymous.status, anonymous.body.error.type]).toEqual([401, "NotSignedIn"]);
        const early = await parent().call<ErrorEnvelope>("GET", path);
        expect([early.status, early.body.error.type]).toEqual([409, "AccountMissing"]);
      });
    });
  });
}
