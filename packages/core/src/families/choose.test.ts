import type { ChooseData, ChooseKey } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { chooseMarks, chooseSolution, judgeChoose } from "./choose.ts";

/**
 * The Choose judge beyond the dispatcher's cases (judge.test.ts): mark the numbers (inline,
 * dl-w3.61.2), "none of these" (dl-w3.70.4), a line with its pick in place, and the marks after a
 * miss. Ported from the judge halves of david-learns `frontend/src/families/choose/{inline,none,
 * line,views}.test.tsx`; their view halves stay with the web app.
 */

const cls = (data: ChooseData, key: ChooseKey, chosen: string[]) => {
  const v = judgeChoose(data, key, { chosen });
  return v.correct ? "right" : v.mistake_class;
};

describe("the inline judge", () => {
  const stickers: ChooseData = {
    stem: {
      text: "Ola is {o1} years old. She bought {o2} packs of {o3} stickers. How many stickers?",
    },
    options: [8, 3, 6].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number" as const, number: n },
    })),
    select: "many",
    layout: "inline",
  };
  const key: ChooseKey = { correct: ["o2", "o3"] };

  it("names a number taken before one left out", () => {
    expect(cls(stickers, key, ["o2", "o3"])).toBe("right");
    expect(cls(stickers, key, ["o2"])).toBe("missed_needed_number");
    expect(cls(stickers, key, ["o2", "o3", "o1"])).toBe("took_unneeded_number");
    expect(cls(stickers, key, ["o3", "o1"])).toBe("took_unneeded_number");
    expect(judgeChoose(stickers, key, chooseSolution(key)).correct).toBe(true);
  });

  it("keeps a plain word in the answer and judges only the numbers", () => {
    const words: ChooseData = { ...stickers, tokens: "words" };
    expect(cls(words, key, ["o2", "o3", "w:4"])).toBe("right");
  });
});

describe("none of these", () => {
  /** How is the shape cut? Its parts are not equal, so none of the names fits. */
  const cut: ChooseData = {
    options: [
      { id: "o1", content: { kind: "text", text: "Halves" } },
      { id: "o2", content: { kind: "text", text: "Thirds" } },
      { id: "o3", content: { kind: "none" } },
    ],
    select: "one",
    layout: "list",
  };
  const cutKey: ChooseKey = { correct: ["o3"], why: "The parts are **not** the same size." };

  it("is judged like any option, and its key is the solution", () => {
    expect(judgeChoose(cut, cutKey, { chosen: ["o3"] }).correct).toBe(true);
    expect(judgeChoose(cut, cutKey, { chosen: ["o1"] })).toMatchObject({
      correct: false,
      mistake_class: "other_wrong",
    });
    expect(judgeChoose(cut, cutKey, chooseSolution(cutKey)).correct).toBe(true);
  });

  it("stands alone when several may be picked", () => {
    const names: ChooseData = { ...cut, select: "many" };
    // Picked beside another, the answer says two things at once: never right.
    expect(judgeChoose(names, { correct: ["o3"] }, { chosen: ["o1", "o3"] }).correct).toBe(false);
  });
});

describe("a line with its pick in place", () => {
  const compare: ChooseData = {
    stem: {
      figure: {
        kind: "fraction_bars",
        items: [
          { n: 1, d: 3 },
          { n: 1, d: 5 },
        ],
        shape: "bar",
        alt: "Two bars of one length, cut in 3 and in 5, one part of each shaded.",
      },
    },
    line: "$\\frac{1}{3}$ {pick} $\\frac{1}{5}$",
    options: ["<", "=", ">"].map((text, i) => ({
      id: `c${i + 1}`,
      content: { kind: "text" as const, text },
    })),
    select: "one",
    layout: "grid",
  };
  const key: ChooseKey = {
    correct: ["c3"],
    near: { c1: "bigger_denominator_bigger", c2: "compared_numerators_only" },
  };

  it("takes the right sign and names the near one", () => {
    expect(judgeChoose(compare, key, { chosen: ["c3"] }).correct).toBe(true);
    expect(judgeChoose(compare, key, { chosen: ["c1"] }).mistake_class).toBe(
      "bigger_denominator_bigger",
    );
  });
});

describe("the marks after a miss", () => {
  // Two TeX expressions out of four (the Khan item xa98fa383484a7a64, in its shape).
  const many: ChooseData = {
    options: ["o1", "o2", "o3", "o4"].map((id, i) => ({
      id,
      content: { kind: "text" as const, text: `$${i} + ${i}$` },
    })),
    select: "many",
    layout: "list",
  };
  const key: ChooseKey = { correct: ["o1", "o3"] };

  it("marks only the distractors picked; a missed option alone marks the whole set", () => {
    expect(judgeChoose(many, key, chooseSolution(key)).correct).toBe(true);
    const wrong = { chosen: ["o1", "o2"] };
    const verdict = judgeChoose(many, key, wrong);
    expect(verdict.correct).toBe(false);
    expect(verdict.mistake_class).toBe("wrong_pick");
    expect(chooseMarks(many, wrong, verdict)).toEqual([{ id: "o2", correct: false }]);
    const onlyMissed = { chosen: ["o1"] };
    expect(judgeChoose(many, key, onlyMissed).mistake_class).toBe("missed_option");
    expect(chooseMarks(many, onlyMissed, judgeChoose(many, key, onlyMissed))).toBeNull();
  });

  it("refuses a doubled pick or an unknown id, and marks nothing for a right answer", () => {
    expect(cls(many, key, ["o1", "o1"])).toBe("other_wrong");
    expect(cls(many, key, ["o9"])).toBe("other_wrong");
    const right = { chosen: ["o3", "o1"] };
    expect(chooseMarks(many, right, judgeChoose(many, key, right))).toBeNull();
  });

  it("the solution of any key is judged right", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string(), { minLength: 1, maxLength: 6 }),
        fc.boolean(),
        (ids, one) => {
          const data: ChooseData = {
            options: ids.map((id) => ({ id, content: { kind: "text" as const, text: id } })),
            select: one ? "one" : "many",
            layout: "list",
          };
          const k: ChooseKey = {
            correct: one ? ids.slice(0, 1) : ids.filter((_, i) => i % 2 === 0),
          };
          expect(judgeChoose(data, k, chooseSolution(k)).correct).toBe(true);
        },
      ),
    );
  });
});

describe("the near table", () => {
  it("an option id like toString finds no class on Object.prototype", () => {
    const data: ChooseData = {
      options: ["toString", "c2"].map((id) => ({
        id,
        content: { kind: "text" as const, text: id },
      })),
      select: "one",
      layout: "grid",
    };
    expect(
      judgeChoose(data, { correct: ["c2"], near: { c2: "unused" } }, { chosen: ["toString"] })
        .mistake_class,
    ).toBe("other_wrong");
  });
});
