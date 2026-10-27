import type { GroupData, GroupKey } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { groupMarks, groupSolution, judgeGroup } from "./group.ts";

/**
 * The Group judge. No group question is in the golden corpus, so these are its parity check. The
 * cases come from david-learns `frontend/src/families/judge.test.ts` (Group), the marks half of
 * `group/columns.test.tsx` (three pairs marked each, two marked whole) and the judge's own rules;
 * `group/group.test.ts` checks validation only and stays with it.
 */

const groups = (n: number): GroupData => ({
  groups: ["even", "odd", "prime"].slice(0, n).map((id) => ({ id, label: id })),
  items: [
    { id: "i4", label: "4" },
    { id: "i9", label: "9" },
  ],
  each_item: "one",
});
const key: GroupKey = {
  items: { i4: ["even"], i9: ["odd"] },
  near: { i9: { even: "last_digit_ignored" } },
};

describe("the Group judge", () => {
  it("a part per item: right, a near class, not placed", () => {
    const v = judgeGroup(groups(2), key, { items: { i4: ["even"], i9: ["even"] } });
    expect(v.parts).toEqual([
      { id: "i4", correct: true, mistake_class: null },
      { id: "i9", correct: false, mistake_class: "last_digit_ignored" },
    ]);
    expect(v.mistake_class).toBe("last_digit_ignored");
    expect(judgeGroup(groups(2), key, { items: { i4: ["even"] } }).mistake_class).toBe(
      "not_placed",
    );
  });

  it("a group the author named nothing for is wrong_group; the first missed item names the step", () => {
    const v = judgeGroup(groups(3), key, { items: { i4: ["prime"], i9: ["even"] } });
    expect(v.correct).toBe(false);
    expect(v.mistake_class).toBe("wrong_group");
    expect(v.parts.map((p) => p.mistake_class)).toEqual(["wrong_group", "last_digit_ignored"]);
  });

  it("is right only with every item's groups exactly, in any order", () => {
    const many: GroupData = { ...groups(3), each_item: "many" };
    const both: GroupKey = { items: { i4: ["even"], i9: ["odd", "prime"] } };
    expect(judgeGroup(many, both, { items: { i4: ["even"], i9: ["prime", "odd"] } })).toEqual({
      correct: true,
      mistake_class: null,
      parts: [
        { id: "i4", correct: true, mistake_class: null },
        { id: "i9", correct: true, mistake_class: null },
      ],
    });
    expect(judgeGroup(many, both, { items: { i4: ["even"], i9: ["odd"] } }).mistake_class).toBe(
      "wrong_group",
    );
  });

  it("ignores what is not a group id, and refuses a value it cannot read", () => {
    expect(judgeGroup(groups(2), key, { items: { i4: ["even", 4], i9: "odd" } }).parts).toEqual([
      { id: "i4", correct: true, mistake_class: null },
      { id: "i9", correct: false, mistake_class: "not_placed" },
    ]);
    for (const value of [null, [], "x", { items: null }, { items: [] }, {}])
      expect(judgeGroup(groups(2), key, value)).toEqual({
        correct: false,
        mistake_class: "other_wrong",
        parts: [],
      });
  });
});

describe("the Group marks", () => {
  it("two groups mark the whole step; three or more mark the items", () => {
    const value = { items: { i4: ["even"], i9: ["even"] } };
    expect(groupMarks(groups(2), judgeGroup(groups(2), key, value))).toBeNull();
    expect(groupMarks(groups(3), judgeGroup(groups(3), key, value))).toEqual([
      { id: "i4", correct: true },
      { id: "i9", correct: false },
    ]);
  });

  it("marks nothing for a right answer", () => {
    const value = { items: { i4: ["even"], i9: ["odd"] } };
    expect(groupMarks(groups(3), judgeGroup(groups(3), key, value))).toBeNull();
  });
});

describe("the Group solution", () => {
  it("is a copy of the key's groups, and is judged right", () => {
    const solution = groupSolution(key);
    expect(solution).toEqual({ items: { i4: ["even"], i9: ["odd"] } });
    expect(solution.items["i9"]).not.toBe(key.items["i9"]);
    expect(judgeGroup(groups(2), key, solution).correct).toBe(true);
  });

  it("the solution of any key is judged right", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.uniqueArray(fc.string(), { maxLength: 3 })),
        (items) => {
          const data: GroupData = {
            groups: [],
            items: Object.keys(items).map((id) => ({ id, label: id })),
            each_item: "many",
          };
          const k: GroupKey = { items };
          expect(judgeGroup(data, k, groupSolution(k)).correct).toBe(true);
        },
      ),
    );
  });
});
