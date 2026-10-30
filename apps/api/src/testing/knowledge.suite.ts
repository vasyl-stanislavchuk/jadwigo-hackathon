// The learner knowledge routes (wave 1 of epic dl-e8ov.5): run on InMemoryStore by
// src/knowledge.test.ts and on PostgresStore by src/knowledge.int.test.ts, each with core's fold,
// brief and digest stood in by ./fold.ts. Every case makes its own parents, learners and codes,
// so the Postgres runs share one database.
import { randomUUID } from "node:crypto";
import {
  type AttemptAnswerResult,
  AttemptId,
  type Claim,
  ERROR_STATUS,
  type ErrorEnvelope,
  type ErrorType,
  type LearnerGoals,
  type LearnerReport,
  type LearnerReports,
  type LearnerSkills,
  type LearnerSnapshot,
  type Me,
  type PageAttemptQuestion,
  type ReportNarrative,
  type RouteName,
  type Skills,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { openQuestion, pathOf, type Seeded, seeded, start, tryAt } from "./client.ts";
import { bearerOf, signToken } from "./token.ts";

export function knowledgeSuite(name: string, makeStore: () => Store): void {
  describe(`the learner knowledge routes on ${name}`, () => {
    /** A signed-up parent with one child, and calls carrying the parent's token. */
    async function family(s: Seeded) {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const call = <T>(method: string, path: string, body?: unknown) =>
        s.call<T>(method, path, body, headers);
      const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
      const child = await call<LearnerSnapshot>("POST", pathOf("createLearner", {}), {
        first_name: "Fox",
      });
      expect([me.status, child.status]).toEqual([201, 201]);
      const learner = child.body.learner.id;
      const pod = await s.store.findLearnerPod(learner);
      const account = me.body.account?.id;
      if (pod === undefined || account === undefined) throw new Error("the family has no pod");
      return { call, learner, pod, account };
    }

    /**
     * The featured equal-groups lesson played in an anonymous tab, its first question missed once
     * then answered, and claimed for the child: the claim rebuilds the child's mastery. Returns
     * the first question's skill codes.
     */
    async function playAndClaim(s: Seeded, f: Awaited<ReturnType<typeof family>>) {
      const { id, snapshot } = await start(s, await s.assign("equalGroups"));
      const first = snapshot.questions[0];
      if (first === undefined) throw new Error("no first question");
      expect((await tryAt(s, id, first, false)).body).toMatchObject({
        correct: false,
        ended: null,
      });
      const again = await tryAt(s, id, await openQuestion(s, id), true);
      expect(again.body).toMatchObject({ correct: true, ended: "correct" });
      const claim = await f.call<Claim>("POST", pathOf("claimAttempt", { id }), {
        learner_id: f.learner,
      });
      expect(claim.status).toBe(201);
      const codes = [...new Set((await s.questionOf(first)).skill_ids)].sort();
      expect(codes.length).toBeGreaterThan(0);
      return { attempt: id, codes };
    }

    it("rebuilds the mastery after a claim, and folds the skills fresh on read", async () => {
      const s = seeded(makeStore());
      const f = await family(s);
      expect(await s.store.getMastery(f.pod, f.learner)).toEqual([]);
      const { codes } = await playAndClaim(s, f);

      const cached = await s.store.getMastery(f.pod, f.learner);
      expect(cached.map((m) => [m.skill_code, m.level, m.needs_attention, m.tries])).toEqual(
        codes.map((code) => [code, "familiar", false, 2]),
      );
      const read = await f.call<LearnerSkills>(
        "GET",
        pathOf("getLearnerSkills", { id: f.learner }),
      );
      expect(read.status).toBe(200);
      expect(read.body.learner.id).toBe(f.learner);
      expect(read.body.skills.map((m) => [m.skill_code, m.level, m.pod_id])).toEqual(
        codes.map((code) => [code, "familiar", f.pod]),
      );
      expect(read.body.skills[0]).not.toHaveProperty("card");
      expect(read.body.brief).toMatchObject({ entries: [], school: "nothing_recorded" });
      expect(read.body.goals).toEqual([]);
    });

    it("rebuilds the mastery when a real attempt with a learner finishes, in the learner's pod", async () => {
      const s = seeded(makeStore());
      const f = await family(s);
      const assignment = await s.assign(
        "equalGroups",
        { identity: "pick" },
        { id: f.pod, name: "home", language: "pl" },
      );
      const { id, snapshot } = await start(s, assignment, { learner_id: f.learner });
      let page: PageAttemptQuestion | null | undefined = snapshot.questions[0];
      let answers = 0;
      while (page) {
        const reply = await tryAt(s, id, page, true);
        expect(reply.status).toBe(201);
        answers += 1;
        // Nothing is rebuilt before the finish.
        if (reply.body.next !== null) {
          expect(await s.store.getMastery(f.pod, f.learner)).toEqual([]);
        }
        page = (reply.body as AttemptAnswerResult).next;
      }
      expect(answers).toBeGreaterThan(1);
      const finished = await s.store.getAttempt(f.pod, AttemptId.parse(id));
      expect(finished.attempt.status).toBe("finished");
      const cached = await s.store.getMastery(f.pod, f.learner);
      expect(cached.length).toBeGreaterThan(0);
      expect(cached.every((m) => m.level === "familiar" && m.pod_id === f.pod)).toBe(true);
    });

    it("adds, changes and lists a learner's goals, their skills made sure of in the pod", async () => {
      const s = seeded(makeStore());
      const f = await family(s);
      const { codes } = await playAndClaim(s, f);
      const draft = `test.lk${randomUUID().slice(0, 8)}.own`;
      const [code] = codes;
      if (code === undefined) throw new Error("no code");

      const created = await f.call<LearnerGoals>("POST", pathOf("createGoal", { id: f.learner }), {
        name: "Equal groups",
        words: "Groups of 2 by Friday.",
        skill_codes: [code, draft],
      });
      expect(created.status).toBe(201);
      expect(created.body.goals).toHaveLength(1);
      const [view] = created.body.goals;
      expect(view).toMatchObject({
        goal: { name: "Equal groups", words: "Groups of 2 by Friday.", status: "active" },
        skill_codes: [code, draft].sort(),
        status: "on_its_way",
        can_do_now: [code],
        needs_attention: [],
      });
      const catalogue = await f.call<Skills>("GET", pathOf("listSkills", {}));
      expect(catalogue.status).toBe(200);
      expect(
        catalogue.body.skills.filter((sk) => sk.code === draft).map((sk) => [sk.pod_id, sk.status]),
      ).toEqual([[f.pod, "draft"]]);

      const goal = view?.goal.id ?? "";
      const paused = await f.call<LearnerGoals>(
        "PATCH",
        pathOf("patchGoal", { id: f.learner, goal }),
        { status: "paused", skill_codes: [draft] },
      );
      expect(paused.status).toBe(200);
      expect(paused.body.goals[0]).toMatchObject({
        goal: { id: goal, status: "paused" },
        skill_codes: [draft],
        status: "not_started",
      });
      const listed = await f.call<LearnerGoals>(
        "GET",
        pathOf("getLearnerGoals", { id: f.learner }),
      );
      expect(listed).toEqual({ status: 200, body: paused.body });

      const empty = await f.call<ErrorEnvelope>(
        "PATCH",
        pathOf("patchGoal", { id: f.learner, goal }),
        {},
      );
      expect([empty.status, empty.body.error.type]).toEqual([400, "BadRequest"]);
    });

    it("writes reports newest first, reuses an unchanged digest, and replaces the mastery cache", async () => {
      const s = seeded(makeStore());
      const f = await family(s);
      const { codes } = await playAndClaim(s, f);
      // The digest replays the period from the evidence, whatever the cache holds.
      await s.store.replaceMastery(f.pod, f.learner, []);
      const firstAnswer = (await s.store.getLearnerEvidence(f.pod, f.learner))[0]?.answered_at;

      const first = await f.call<LearnerReport>(
        "POST",
        pathOf("createReport", { id: f.learner }),
        {},
      );
      expect(first.status).toBe(201);
      expect(first.body).toMatchObject({
        learner_id: f.learner,
        pod_id: f.pod,
        reused: false,
        narrative: null,
        decisions: [],
        period_starts_at: firstAnswer,
      });
      expect(first.body.digest.skills_moved.map((m) => [m.skill_code, m.from, m.to])).toEqual(
        codes.map((code) => [code, "not_started", "familiar"]),
      );
      // The report replaced the cache with its fold.
      expect((await s.store.getMastery(f.pod, f.learner)).map((m) => m.skill_code)).toEqual(codes);

      const second = await f.call<LearnerReport>(
        "POST",
        pathOf("createReport", { id: f.learner }),
        undefined,
      );
      expect(second.status).toBe(201);
      expect(second.body).toMatchObject({
        reused: true,
        inputs_hash: first.body.inputs_hash,
        period_starts_at: first.body.period_ends_at,
      });
      expect(second.body.digest).toEqual(first.body.digest);

      const listed = await f.call<LearnerReports>(
        "GET",
        pathOf("getLearnerReports", { id: f.learner }),
      );
      expect(listed.status).toBe(200);
      expect(listed.body.reports.map((r) => r.id)).toEqual([second.body.id, first.body.id]);

      const refused = await f.call<ErrorEnvelope>(
        "POST",
        pathOf("createReport", { id: f.learner }),
        { narrative: null },
      );
      expect([refused.status, refused.body.error.type]).toEqual([400, "BadRequest"]);
    });

    it("writes a narrative once, only one the digest holds up, and stamps the parent's decisions", async () => {
      const s = seeded(makeStore());
      const f = await family(s);
      const { codes } = await playAndClaim(s, f);
      const report = (
        await f.call<LearnerReport>("POST", pathOf("createReport", { id: f.learner }), {})
      ).body;
      const focus = report.digest.proposals[0]?.skill_codes[0];
      expect(focus).toBe(codes[0]);
      const path = pathOf("patchReport", { id: f.learner, report: report.id });
      const narrative = narrativeOn(focus ?? "");
      const refuse = async (body: unknown, type: ErrorType, says: string) => {
        const reply = await f.call<ErrorEnvelope>("PATCH", path, body);
        expect([reply.status, reply.body.error.type]).toEqual([ERROR_STATUS[type], type]);
        expect(reply.body.error.message).toContain(says);
      };

      await refuse(
        {
          narrative: {
            ...narrative,
            answers: [
              {
                ...narrative.answers[0],
                citations: [{ kind: "skill", skill_code: "test.not.in.digest" }],
              },
            ],
          },
        },
        "BadRequest",
        "test.not.in.digest",
      );
      await refuse(
        { narrative: { ...narrative, headline: "Zrobił 99 zadań." } },
        "BadRequest",
        "the number 99",
      );
      await refuse(
        { narrative: { ...narrative, direction_now: "Mnożenie jest już opanowane." } },
        "BadRequest",
        "names a level",
      );
      await refuse(
        { narrative: { ...narrative, headline: "Mastered the groups." } },
        "BadRequest",
        "names a level",
      );
      await refuse(
        {
          narrative: {
            ...narrative,
            proposals: [{ ...narrative.proposals[0], proposal_id: "p3" }],
          },
        },
        "BadRequest",
        "no proposal p3",
      );

      const written = await f.call<LearnerReport>("PATCH", path, { narrative });
      expect(written.status).toBe(200);
      expect(written.body.narrative).toEqual(narrative);
      expect(await f.call<LearnerReport>("PATCH", path, { narrative })).toEqual(written);
      await refuse(
        { narrative: { ...narrative, headline: "Inny nagłówek." } },
        "WriteOnce",
        "narrative",
      );

      await refuse(
        { decisions: [{ proposal_id: "p9", decision: "accepted" }] },
        "BadRequest",
        "p9",
      );
      const decided = await f.call<LearnerReport>("PATCH", path, {
        decisions: [{ proposal_id: "p1", decision: "accepted" }],
      });
      expect(decided.status).toBe(200);
      expect(decided.body.decisions).toEqual([
        {
          proposal_id: "p1",
          decision: "accepted",
          decided_by: f.account,
          decided_at: expect.any(String),
        },
      ]);
      expect(decided.body.narrative).toEqual(narrative);
      await refuse(
        { decisions: [{ proposal_id: "p1", decision: "accepted", decided_by: f.account }] },
        "BadRequest",
        "decided_by",
      );
    });

    it("answers another pod's learner 404 on every learner route, and lists only its own catalogue", async () => {
      const s = seeded(makeStore());
      const owner = await family(s);
      await playAndClaim(s, owner);
      const draft = `test.lk${randomUUID().slice(0, 8)}.own`;
      const goal = (
        await owner.call<LearnerGoals>("POST", pathOf("createGoal", { id: owner.learner }), {
          name: "Mine",
          skill_codes: [draft],
        })
      ).body.goals[0]?.goal.id;
      const report = (
        await owner.call<LearnerReport>("POST", pathOf("createReport", { id: owner.learner }), {})
      ).body.id;
      if (goal === undefined) throw new Error("no goal");
      const other = await family(s);

      const id = owner.learner;
      const routes: [RouteName, string, Record<string, string>, unknown][] = [
        ["getLearnerSkills", "GET", { id }, undefined],
        ["getLearnerGoals", "GET", { id }, undefined],
        ["createGoal", "POST", { id }, { name: "x", skill_codes: [] }],
        ["patchGoal", "PATCH", { id, goal }, { status: "paused" }],
        ["getLearnerReports", "GET", { id }, undefined],
        ["createReport", "POST", { id }, {}],
        [
          "patchReport",
          "PATCH",
          { id, report },
          { decisions: [{ proposal_id: "p1", decision: "accepted" }] },
        ],
      ];
      for (const [route, method, params, body] of routes) {
        const reply = await other.call<ErrorEnvelope>(method, pathOf(route, params), body);
        expect([route, reply.status, reply.body.error.type]).toEqual([route, 404, "NotFound"]);
      }
      // The other pod's own learner cannot reach the owner's goal or report either.
      const mine = other.learner;
      for (const [route, params, body] of [
        ["patchGoal", { id: mine, goal }, { status: "paused" }],
        [
          "patchReport",
          { id: mine, report },
          { decisions: [{ proposal_id: "p1", decision: "accepted" }] },
        ],
      ] as const) {
        const reply = await other.call<ErrorEnvelope>("PATCH", pathOf(route, params), body);
        expect([route, reply.status, reply.body.error.type]).toEqual([route, 404, "NotFound"]);
      }
      const theirs = await other.call<Skills>("GET", pathOf("listSkills", {}));
      expect(theirs.status).toBe(200);
      expect(theirs.body.skills.some((sk) => sk.code === draft)).toBe(false);
      expect(theirs.body.skills.every((sk) => sk.pod_id !== owner.pod)).toBe(true);
      // Nothing the other pod sent changed the owner's records.
      const owned = await s.store.listGoals(owner.pod, owner.learner);
      expect(owned.map((g) => g.goal.status)).toEqual(["active"]);
    });
  });
}

/** A narrative the stand-in digest holds up: it cites the focus skill and gives no number. */
function narrativeOn(focus: string): ReportNarrative {
  return {
    language: "pl",
    headline: "Dobry tydzień z grupami.",
    direction_now: "Ćwiczymy dalej równe grupy.",
    answers: [
      {
        question: "next_focus",
        answer: "Powtórka równych grup.",
        citations: [{ kind: "skill", skill_code: focus }],
      },
    ],
    proposals: [
      {
        proposal_id: "p1",
        claim: "Powtórzyć równe grupy.",
        rationale: "Poszło dobrze za drugim razem.",
        citations: [{ kind: "skill", skill_code: focus }],
      },
    ],
    asks: [],
    made_by: "test",
  };
}
