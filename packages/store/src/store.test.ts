import { LearnerId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { InMemoryStore } from "./store.ts";

describe("InMemoryStore", () => {
  it("returns what was put, and nothing for an unknown learner", async () => {
    const store = new InMemoryStore();
    const learnerId = LearnerId.parse("lrn_000000000001");
    await store.put({ learnerId, displayName: "Learner one" });
    expect(await store.get(learnerId)).toEqual({ learnerId, displayName: "Learner one" });
    expect(await store.get(LearnerId.parse("lrn_000000000002"))).toBeUndefined();
  });
});
