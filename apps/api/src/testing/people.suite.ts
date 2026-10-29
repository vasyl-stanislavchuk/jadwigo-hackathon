// The parent login routes (wave 3 of dl-e8ov.2): run on InMemoryStore by src/routes.test.ts and on
// PostgresStore by src/routes.int.test.ts. Tokens are signed with the run's own test key.
import { randomUUID } from "node:crypto";
import {
  type AttemptAnswerResult,
  type AttemptSnapshot,
  type Claim,
  type ErrorEnvelope,
  ID_PREFIXES,
  idOf,
  type LearnerAttempts,
  type LearnerSnapshot,
  type Me,
  ROUTES,
  type RouteName,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import { pathOf, type Seeded, seeded, start, tryAt } from "./client.ts";
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
      expect(TOKEN_ROUTES).toHaveLength(5);
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
            path.replace(
              "{id}",
              ROUTES[route].path.includes("learners/{id}")
                ? idOf(ID_PREFIXES.learner, randomUUID())
                : IDS.id,
            ),
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
  });
}
