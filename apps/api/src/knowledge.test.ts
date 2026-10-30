// The learner knowledge routes on InMemoryStore (step 0 of wave dl-e8ov.5-1). The routes that fold
// wait on core's stubs, and PostgresStore's methods on the store-api lane, which adds the route
// suite on both stores; this pins what step 0 serves.
import { randomUUID } from "node:crypto";
import {
  type ErrorEnvelope,
  FEATURED_POD_ID,
  ID_PREFIXES,
  idOf,
  type LearnerGoals,
  type LearnerReports,
  type LearnerSnapshot,
  type Me,
  type RouteName,
  type Skills,
} from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { pathOf, seeded } from "./testing/client.ts";
import { bearerOf, signToken } from "./testing/token.ts";

async function family(store = new InMemoryStore()) {
  const s = seeded(store);
  const headers = bearerOf(signToken({ sub: randomUUID() }));
  const call = <T>(method: string, path: string, body?: unknown) =>
    s.call<T>(method, path, body, headers);
  await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
  const child = await call<LearnerSnapshot>("POST", pathOf("createLearner", {}), {
    first_name: "Fox",
  });
  return { store, call, learner: child.body.learner.id };
}

describe("the learner knowledge routes on InMemoryStore", () => {
  it("adds, lists and patches a learner's goals, each code resolved and made sure of", async () => {
    const store = new InMemoryStore();
    await store.putPod({ id: FEATURED_POD_ID, name: "Jadwigo", language: "pl" });
    await store.putSkills(FEATURED_POD_ID, [
      {
        code: "maths.multiplication.row-7",
        topic_id: null,
        kind: "accuracy",
        status: "reviewed",
        can_do: null,
        aliases: ["maths.mul.7x"],
        prerequisites: [],
        source: "bank",
      },
    ]);
    const f = await family(store);

    const made = await f.call<LearnerGoals>("POST", pathOf("createGoal", { id: f.learner }), {
      name: "Row of 7",
      words: "The 7s by Christmas.",
      skill_codes: ["maths.mul.7x", "test.unknown.code"],
    });
    expect(made.status).toBe(201);
    expect(made.body.goals).toMatchObject([
      {
        goal: { name: "Row of 7", status: "active", words: "The 7s by Christmas." },
        skill_codes: ["maths.multiplication.row-7", "test.unknown.code"],
      },
    ]);
    const goal = made.body.goals[0]?.goal.id ?? "";
    const patched = await f.call<LearnerGoals>(
      "PATCH",
      pathOf("patchGoal", { id: f.learner, goal }),
      { status: "paused" },
    );
    expect(patched.body.goals[0]?.goal.status).toBe("paused");
    const empty = await f.call<ErrorEnvelope>(
      "PATCH",
      pathOf("patchGoal", { id: f.learner, goal }),
      {},
    );
    expect([empty.status, empty.body.error.type]).toEqual([400, "BadRequest"]);

    const skills = await f.call<Skills>("GET", pathOf("listSkills", {}));
    expect(skills.body.skills.map((s) => [s.code, s.status])).toEqual([
      ["maths.multiplication.row-7", "reviewed"],
      ["test.unknown.code", "draft"],
    ]);
    const reports = await f.call<LearnerReports>(
      "GET",
      pathOf("getLearnerReports", { id: f.learner }),
    );
    expect(reports).toMatchObject({ status: 200, body: { reports: [] } });
  });

  it("answers another pod's learner 404 on every learner route", async () => {
    const owner = await family();
    const other = await family(owner.store);
    const routes: [RouteName, string, unknown][] = [
      ["getLearnerSkills", "GET", undefined],
      ["getLearnerGoals", "GET", undefined],
      ["createGoal", "POST", { name: "x", skill_codes: [] }],
      ["getLearnerReports", "GET", undefined],
      ["createReport", "POST", {}],
    ];
    for (const [route, method, body] of routes) {
      const reply = await other.call<ErrorEnvelope>(
        method,
        pathOf(route, { id: owner.learner }),
        body,
      );
      expect([route, reply.status, reply.body.error.type]).toEqual([route, 404, "NotFound"]);
    }
    const goal = idOf(ID_PREFIXES.goal, randomUUID());
    const report = idOf(ID_PREFIXES.learner_report, randomUUID());
    const patches: [RouteName, Record<string, string>, unknown][] = [
      ["patchGoal", { id: owner.learner, goal }, { status: "paused" }],
      [
        "patchReport",
        { id: owner.learner, report },
        { decisions: [{ proposal_id: "p1", decision: "accepted" }] },
      ],
    ];
    for (const [route, params, body] of patches) {
      const reply = await other.call<ErrorEnvelope>("PATCH", pathOf(route, params), body);
      expect([route, reply.status, reply.body.error.type]).toEqual([route, 404, "NotFound"]);
    }
  });
});
