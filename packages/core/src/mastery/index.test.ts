import { PodId, type Skill } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as core from "../index.ts";
import { resolveSkill } from "./index.ts";

const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");

function skill(code: string, aliases: string[] = []): Skill {
  return {
    pod_id: POD,
    code,
    topic_id: null,
    kind: "accuracy",
    status: "reviewed",
    can_do: null,
    aliases,
    prerequisites: [],
    source: "bank",
    created_at: "2026-10-30T08:00:00.000Z",
  };
}

const CATALOGUE = [
  skill("maths.multiplication.row-7", ["maths.mul.7x", "curriculum.math.multiplication.row-7"]),
  skill("maths.multiplication.row-8"),
];
const code = fc
  .array(fc.stringMatching(/^[a-z0-9-]{1,8}$/), { minLength: 1, maxLength: 3 })
  .map((parts) => `x.${parts.join(".")}`);

describe("the mastery stubs of step 0", () => {
  it("are exported from core's index, and the unbuilt ones say so", () => {
    for (const name of [
      "resolveSkill",
      "masteryOf",
      "foldLearner",
      "brief",
      "goalStatus",
      "goalView",
      "canDoLines",
      "dreamDigest",
    ]) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe("function");
    }
    expect(() => core.foldLearner([], CATALOGUE, new Date(0))).toThrow("not built: core lane");
  });
});

describe("resolveSkill", () => {
  it("resolves an alias to its canonical code and keeps a canonical one", () => {
    expect(resolveSkill("maths.mul.7x", CATALOGUE)).toBe("maths.multiplication.row-7");
    expect(resolveSkill("curriculum.math.multiplication.row-7", CATALOGUE)).toBe(
      "maths.multiplication.row-7",
    );
    expect(resolveSkill("maths.multiplication.row-8", CATALOGUE)).toBe(
      "maths.multiplication.row-8",
    );
  });

  it("keeps an unknown code under its own string, and is idempotent", () => {
    fc.assert(
      fc.property(code, (unknown) => {
        expect(resolveSkill(unknown, CATALOGUE)).toBe(unknown);
        const once = resolveSkill(unknown, CATALOGUE);
        expect(resolveSkill(once, CATALOGUE)).toBe(once);
      }),
    );
  });
});
