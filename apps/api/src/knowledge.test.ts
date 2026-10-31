// The learner knowledge routes on InMemoryStore: the route suite, with core's fold, brief and digest
// stood in by testing/fold.ts (src/knowledge.int.test.ts runs it on PostgresStore), and what
// only the in-memory store can set up.
import { randomUUID } from "node:crypto";
import {
  type ErrorEnvelope,
  FEATURED_POD_ID,
  type LearnerReports,
  type LearnerSnapshot,
  type Me,
  type Skills,
} from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it, vi } from "vitest";
import { pathOf, seeded } from "./testing/client.ts";
import { knowledgeSuite } from "./testing/knowledge.suite.ts";
import { bearerOf, signToken } from "./testing/token.ts";

vi.mock("@jadwigo/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@jadwigo/core")>()),
  ...(await import("./testing/fold.ts")).STAND_IN_CORE,
}));

knowledgeSuite("InMemoryStore", () => new InMemoryStore());

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
  it("lists the catalogue and the reports, and refuses an empty goal patch", async () => {
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
    const pod = await store.findLearnerPod(f.learner);
    if (pod === undefined) throw new Error("the learner has no pod");
    const { goal } = await store.addGoal(pod, f.learner, {
      name: "Row of 7",
      skill_codes: ["test.unknown.code"],
    });

    const skills = await f.call<Skills>("GET", pathOf("listSkills", {}));
    expect(skills.body.skills.map((s) => [s.code, s.status])).toEqual([
      ["maths.multiplication.row-7", "reviewed"],
      ["test.unknown.code", "draft"],
    ]);
    const empty = await f.call<ErrorEnvelope>(
      "PATCH",
      pathOf("patchGoal", { id: f.learner, goal: goal.id }),
      {},
    );
    expect([empty.status, empty.body.error.type]).toEqual([400, "BadRequest"]);
    const reports = await f.call<LearnerReports>(
      "GET",
      pathOf("getLearnerReports", { id: f.learner }),
    );
    expect(reports).toEqual({ status: 200, body: { reports: [] } });
  });
});
