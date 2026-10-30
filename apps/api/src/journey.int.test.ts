// The happy path of the learner knowledge base on PostgresStore (dl-e8ov.5.46): a throwaway
// learner plays 2 days of lessons, and the parent's routes show the fold, the brief and a report.
// Against the database `make migrate` built from DATABASE_URL in .env.local; every pod, learner,
// lesson and spelling code is fresh, so runs share one database. Made-up names only.
import { randomUUID } from "node:crypto";
import {
  type Claim,
  type ErrorEnvelope,
  FEATURED_POD_ID,
  type LearnerGoals,
  type LearnerReport,
  type LearnerReports,
  type LearnerSkills,
  type LearnerSnapshot,
  type Me,
  type RouteName,
  SkillId,
  type Skills,
} from "@jadwigo/contracts";
import { brief } from "@jadwigo/core";
import { createPostgresStore, type Store } from "@jadwigo/store";
import { finishedAttempt } from "@jadwigo/testing";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { pathOf, seeded } from "./testing/client.ts";
import { bearerOf, signToken } from "./testing/token.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

const ROW_7 = SkillId.parse("maths.multiplication.row-7");
const ROW_8 = SkillId.parse("maths.multiplication.row-8");

/**
 * An instant `daysAgo` Warsaw days before today, at 09:00 UTC: 10:00 or 11:00 in Warsaw, so 2
 * instants a day apart fall on 2 Europe/Warsaw days whatever the season. Relative to now, since the
 * routes fold with the real clock and a report reads the evidence up to now.
 */
function daysAgo(days: number, minutes = 0): string {
  const today = new Date();
  const at = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days, 9);
  return new Date(at + minutes * 60_000).toISOString();
}

/** A signed-in parent with a pod, an account and one child: its calls carry its token. */
async function parent(first_name: string) {
  const s = seeded(store);
  const headers = bearerOf(signToken({ sub: randomUUID() }));
  const call = <T>(method: string, path: string, body?: unknown) =>
    s.call<T>(method, path, body, headers);
  const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
  expect(me.status).toBe(201);
  const child = await call<LearnerSnapshot>("POST", pathOf("createLearner", {}), { first_name });
  expect(child.status).toBe(201);
  const pod = me.body.pod?.id;
  if (pod === undefined) throw new Error("createAccount made no pod");
  return { call, pod, learner: child.body.learner.id };
}

/** The 2 maths skills in the shared catalogue: the seed's rows stay when it has run. */
async function sharedRows(s: Store): Promise<void> {
  await s.putPod({ id: FEATURED_POD_ID, name: "Jadwigo", language: "pl" });
  await s.putSkills(
    FEATURED_POD_ID,
    [ROW_7, ROW_8].map((code) => ({
      code,
      topic_id: null,
      kind: "accuracy" as const,
      status: "reviewed" as const,
      can_do: null,
      aliases: [],
      prerequisites: [],
      source: "bank" as const,
    })),
  );
}

function levelOf(skills: LearnerSkills, code: SkillId) {
  return skills.skills.find((row) => row.skill_code === code);
}

function listsOf(skills: LearnerSkills, code: SkillId) {
  return skills.brief.entries.filter((e) => e.skill_code === code).map((e) => e.list);
}

describe("the learner knowledge happy path on PostgresStore", () => {
  it("folds 2 days of lessons into mastery, a brief and a report, for the learner's own pod only", async () => {
    await sharedRows(store);
    const p = await parent("Kasztan");
    const L = p.learner;
    const spelling = SkillId.parse(`polish.spelling.journey-${randomUUID().slice(0, 8)}`);

    // 2 goals: the maths rows, and a spelling code no catalogue has, kept as the pod's draft.
    const maths = await p.call<LearnerGoals>("POST", pathOf("createGoal", { id: L }), {
      name: "Tabliczka mnożenia: 7 i 8",
      skill_codes: [ROW_7, ROW_8],
    });
    expect(maths.status).toBe(201);
    const words = await p.call<LearnerGoals>("POST", pathOf("createGoal", { id: L }), {
      name: "Pisownia: ó i u",
      skill_codes: [spelling],
    });
    expect(words.status).toBe(201);
    expect(words.body.goals).toHaveLength(2);
    const [mathsGoal, wordsGoal] = words.body.goals;
    if (mathsGoal === undefined || wordsGoal === undefined) throw new Error("2 goals expected");
    expect(mathsGoal.skill_codes).toEqual([ROW_7, ROW_8]);
    expect(wordsGoal.skill_codes).toEqual([spelling]);
    expect(wordsGoal.status).toBe("not_started");
    const catalogue = await p.call<Skills>("GET", pathOf("listSkills", {}));
    expect(catalogue.body.skills.find((s) => s.code === spelling)).toMatchObject({
      pod_id: p.pod,
      status: "draft",
    });

    // Day 1: 2 clean answers on row-7, so row-7 is familiar and the maths goal on its way.
    const day1 = await finishedAttempt({
      store,
      pod: p.pod,
      learner: L,
      questions: [
        { skills: [ROW_7], correct: true, answered_at: daysAgo(2) },
        { skills: [ROW_7], correct: true, answered_at: daysAgo(2, 1) },
      ],
    });
    expect(day1.record.attempt.status).toBe("finished");
    const afterDay1 = await p.call<LearnerSkills>("GET", pathOf("getLearnerSkills", { id: L }));
    expect(afterDay1.status).toBe(200);
    expect(levelOf(afterDay1.body, ROW_7)).toMatchObject({
      level: "familiar",
      needs_attention: false,
    });
    expect(levelOf(afterDay1.body, ROW_8)).toBeUndefined();
    expect(afterDay1.body.goals.find((g) => g.goal.id === mathsGoal.goal.id)?.status).toBe(
      "on_its_way",
    );

    // Day 2, the next Warsaw day: row-7 clean again (2 days: proficient), row-8 missed.
    const day2 = await finishedAttempt({
      store,
      pod: p.pod,
      learner: L,
      questions: [
        { skills: [ROW_7], correct: true, answered_at: daysAgo(1) },
        { skills: [ROW_8], correct: false, answered_at: daysAgo(1, 1) },
      ],
    });
    const afterDay2 = await p.call<LearnerSkills>("GET", pathOf("getLearnerSkills", { id: L }));
    expect(levelOf(afterDay2.body, ROW_7)).toMatchObject({ level: "proficient" });
    expect(levelOf(afterDay2.body, ROW_8)).toMatchObject({
      level: "attempted",
      needs_attention: true,
    });
    expect(listsOf(afterDay2.body, ROW_8)).toContain("reteach");
    // Row-7 is proficient, so recheck (familiar, 2nd day owed) no longer holds, and review holds
    // once its FSRS date is due (packages/core brief.ts): on no list now, on review at due_at.
    expect(listsOf(afterDay2.body, ROW_7)).toEqual([]);
    const row7Due = levelOf(afterDay2.body, ROW_7)?.due_at;
    if (row7Due == null) throw new Error("a proficient row-7 has no due_at");
    expect(Date.parse(row7Due)).toBeGreaterThan(Date.now());
    const atDue = brief(
      afterDay2.body.goals.map((g) => ({ goal: g.goal, skill_codes: g.skill_codes })),
      afterDay2.body.catalogue,
      afterDay2.body.skills.map(({ pod_id: _p, learner_id: _l, computed_at: _c, ...row }) => ({
        ...row,
        card: null,
      })),
      new Date(row7Due),
    );
    expect(atDue.entries.filter((e) => e.skill_code === ROW_7).map((e) => e.list)).toEqual([
      "review",
    ]);

    // A report: code's digest over both days.
    const report = await p.call<LearnerReport>("POST", pathOf("createReport", { id: L }), {});
    expect(report.status).toBe(201);
    expect(report.body).toMatchObject({ learner_id: L, reused: false, narrative: null });
    const { digest } = report.body;
    expect(digest.counts).toMatchObject({ attempts: 2, days_played: 2 });
    // A move is against the last report's levels (packages/core digest.ts); this is the first
    // report, so both days are its period and row-7 moved from not started, by the day-2 attempt.
    expect(digest.skills_moved).toEqual([
      {
        skill_code: ROW_7,
        from: "not_started",
        to: "proficient",
        attempt_id: day2.record.attempt.id,
      },
      {
        skill_code: ROW_8,
        from: "not_started",
        to: "attempted",
        attempt_id: day2.record.attempt.id,
      },
    ]);
    expect(digest.proposals.length).toBeLessThanOrEqual(3);
    expect(digest.needs_attention.map((n) => n.skill_code)).toContain(ROW_8);

    // No new evidence: the next report is the last one's copy.
    const again = await p.call<LearnerReport>("POST", pathOf("createReport", { id: L }), {});
    expect(again.status).toBe(201);
    expect(again.body.reused).toBe(true);
    expect(again.body.digest).toEqual(digest);
    const reports = await p.call<LearnerReports>("GET", pathOf("getLearnerReports", { id: L }));
    expect(reports.body.reports.map((r) => r.id)).toEqual([again.body.id, report.body.id]);

    // Pod Q, with its own learner, reads and writes nothing of L's: 404 on every learner route.
    const q = await parent("Bursztyn");
    const asQ: [RouteName, string, string, unknown][] = [
      ["getLearnerSkills", "GET", pathOf("getLearnerSkills", { id: L }), undefined],
      ["getLearnerGoals", "GET", pathOf("getLearnerGoals", { id: L }), undefined],
      [
        "createGoal",
        "POST",
        pathOf("createGoal", { id: L }),
        { name: "Cudzy cel", skill_codes: [ROW_7] },
      ],
      [
        "patchGoal",
        "PATCH",
        pathOf("patchGoal", { id: L, goal: mathsGoal.goal.id }),
        { status: "paused" },
      ],
      ["getLearnerReports", "GET", pathOf("getLearnerReports", { id: L }), undefined],
      ["createReport", "POST", pathOf("createReport", { id: L }), {}],
      [
        "patchReport",
        "PATCH",
        pathOf("patchReport", { id: L, report: report.body.id }),
        { decisions: [] },
      ],
    ];
    for (const [name, method, path, body] of asQ) {
      const reply = await q.call<ErrorEnvelope>(method, path, body);
      expect([name, reply.status, reply.body.error?.type]).toEqual([name, 404, "NotFound"]);
    }
    // The 8th route has no learner in its path: Q's catalogue never lists P's draft.
    const qCatalogue = await q.call<Skills>("GET", pathOf("listSkills", {}));
    expect(qCatalogue.status).toBe(200);
    expect(qCatalogue.body.skills.map((s) => s.code)).not.toContain(spelling);
    // And none of Q's calls changed L's goals or reports.
    const goalsAfterQ = await p.call<LearnerGoals>("GET", pathOf("getLearnerGoals", { id: L }));
    expect(goalsAfterQ.body.goals.map((g) => [g.goal.id, g.goal.status])).toEqual([
      [mathsGoal.goal.id, "active"],
      [wordsGoal.goal.id, "active"],
    ]);
    const reportsAfterQ = await p.call<LearnerReports>(
      "GET",
      pathOf("getLearnerReports", { id: L }),
    );
    expect(reportsAfterQ.body.reports).toHaveLength(2);

    // A featured attempt played anonymously a minute ago, then claimed for L, counts in L's evidence.
    const featuredAt = new Date(Date.now() - 60_000).toISOString();
    const featured = await finishedAttempt({
      store,
      pod: FEATURED_POD_ID,
      title: "Rzędy jabłek",
      questions: [{ skills: [ROW_8], correct: true, answered_at: featuredAt }],
    });
    const claimed = await p.call<Claim>(
      "POST",
      pathOf("claimAttempt", { id: featured.record.attempt.id }),
      { learner_id: L },
    );
    expect(claimed.status).toBe(201);
    const evidence = await store.getLearnerEvidence(p.pod, L);
    expect(evidence.filter((e) => e.attempt_id === featured.record.attempt.id)).toEqual([
      expect.objectContaining({ skill_code: ROW_8, correct: true, pod_id: FEATURED_POD_ID }),
    ]);
    const afterClaim = await p.call<LearnerSkills>("GET", pathOf("getLearnerSkills", { id: L }));
    const row8Before = levelOf(afterDay2.body, ROW_8);
    expect(levelOf(afterClaim.body, ROW_8)).toMatchObject({
      tries: (row8Before?.tries ?? 0) + 1,
      last_answered_at: featuredAt,
    });
  });
});
