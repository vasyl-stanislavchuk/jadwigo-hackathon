// The mastery rebuild where a failure must not refuse the request: a fold that throws writes
// nothing, and is logged as one line with no learner data.
import { randomUUID } from "node:crypto";
import { ID_PREFIXES, idOf, LearnerId, type LearnerSnapshot, type Me } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it, vi } from "vitest";
import { learnerFed, rebuildAfter } from "./mastery.ts";
import { pathOf, seeded } from "./testing/client.ts";
import { bearerOf, signToken } from "./testing/token.ts";

vi.mock("@jadwigo/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@jadwigo/core")>()),
  foldLearner: () => {
    throw new Error("planted fold failure");
  },
}));

describe("rebuildAfter", () => {
  it("logs a fold that throws, writes nothing and goes on", async () => {
    const store = new InMemoryStore();
    const s = seeded(store);
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    await s.call<Me>("POST", pathOf("createAccount", {}), { language: "pl" }, headers);
    const child = await s.call<LearnerSnapshot>(
      "POST",
      pathOf("createLearner", {}),
      { first_name: "Fox" },
      headers,
    );
    const learner = child.body.learner.id;
    const pod = await store.findLearnerPod(learner);
    if (pod === undefined) throw new Error("no pod");
    await store.replaceMastery(pod, learner, [
      {
        skill_code: "test.kept.row",
        level: "attempted",
        needs_attention: false,
        tries: 1,
        last_answered_at: null,
        due_at: null,
        card: null,
      },
    ]);
    const kept = await store.getMastery(pod, learner);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(rebuildAfter(store, learner, new Date())).resolves.toBeUndefined();
      expect(await store.getMastery(pod, learner)).toEqual(kept);
      expect(logged).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(logged.mock.calls[0]?.[0]))).toEqual({
        level: "ERROR",
        message: "mastery rebuild failed",
        error: { name: "Error", message: "planted fold failure" },
      });
    } finally {
      logged.mockRestore();
    }
  });

  it("holds the learner before it reads the evidence, so overlapping rebuilds take turns", async () => {
    const store = new InMemoryStore();
    const s = seeded(store);
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    await s.call<Me>("POST", pathOf("createAccount", {}), { language: "pl" }, headers);
    const child = await s.call<LearnerSnapshot>(
      "POST",
      pathOf("createLearner", {}),
      { first_name: "Fox" },
      headers,
    );
    const calls: string[] = [];
    const watched = new Proxy(store, {
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          calls.push(String(name));
          return value.apply(target, args);
        };
      },
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await rebuildAfter(watched, child.body.learner.id, new Date());
    } finally {
      logged.mockRestore();
    }
    // The fold is planted to throw, so the rebuild stops before replaceMastery.
    expect(calls).toEqual(["findLearnerPod", "lockLearner", "getLearnerEvidence", "listSkills"]);
  });

  it("feeds a real attempt's learner only", () => {
    const learner = LearnerId.parse(idOf(ID_PREFIXES.learner, randomUUID()));
    expect(learnerFed({ mode: "real", learner_id: learner })).toBe(learner);
    expect(learnerFed({ mode: "preview", learner_id: learner })).toBeUndefined();
    expect(learnerFed({ mode: "real", learner_id: null })).toBeUndefined();
  });
});
