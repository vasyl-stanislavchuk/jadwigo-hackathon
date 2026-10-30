// The number-line rule on fractions (dl-w3.55). The whole-number behaviour is held to the Python
// by the golden corpus (golden.test.ts); this file covers positions and steps that are not whole,
// where the 3 classes keep their meaning: off_by_tick, scale_misread and wrong_direction.
import { FamilyQuestion, QuestionType } from "@jadwigo/contracts";
import { GOLDEN_CASES } from "@jadwigo/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { judge } from "./judge.ts";
import {
  applyRule,
  classify,
  classifyNumberLine,
  isNum,
  MISTAKE_CLASSES,
  withinTolerance,
} from "./rules.ts";

const quarters = { rule: "number_line", mode: "place", min: 0, max: 1, step: 0.25 } as const;
const readQuarters = { ...quarters, mode: "read" } as const;

describe("classifyNumberLine on fractions", () => {
  it("one quarter either way is off_by_tick, the mirror is wrong_direction, else other_wrong", () => {
    expect(classifyNumberLine(quarters, 0.75, 0, 0.5)).toBe("off_by_tick");
    expect(classifyNumberLine(quarters, 0.75, 0, 1)).toBe("off_by_tick");
    expect(classifyNumberLine(quarters, 0.75, 0, 0.25)).toBe("wrong_direction");
    expect(classifyNumberLine(quarters, 0.5, 0, 1)).toBe("other_wrong");
  });

  it("read mode: the tick count typed instead of the value is scale_misread", () => {
    expect(classifyNumberLine(readQuarters, 0.75, 0, 3)).toBe("scale_misread");
    expect(classifyNumberLine(readQuarters, 0.75, 0, 0.25)).toBe("wrong_direction");
  });

  it("binary noise never decides: 0.1 + 0.2 is right for 0.3, and a hair past a tick is that tick", () => {
    const tenths = { ...quarters, step: 0.1 };
    expect(withinTolerance(0.1 + 0.2, 0.3, 0)).toBe(true);
    expect(() => classifyNumberLine(tenths, 0.3, 0, 0.1 + 0.2)).toThrow();
    expect(classifyNumberLine(tenths, 0.3, 0, 0.1 + 0.1 + 0.1 + 0.1)).toBe("off_by_tick");
  });

  it("a value that is not a finite number is other_wrong; whole numbers answer as before", () => {
    expect(classifyNumberLine(quarters, 0.75, 0, "x")).toBe("other_wrong");
    expect(classifyNumberLine(quarters, 0.75, 0, Number.NaN)).toBe("other_wrong");
    expect(isNum(0.5)).toBe(true);
    expect(isNum(Number.POSITIVE_INFINITY)).toBe(false);
    const tens = { ...quarters, max: 100, step: 10 };
    expect(applyRule(tens, 50, 40, 2)).toBe("off_by_tick");
    expect(applyRule(tens, 60, 40, 2)).toBe("wrong_direction");
  });
});

describe("classify", () => {
  it("gives every wrong whole number a class and refuses the right one", () => {
    const factor = fc.integer({ min: 1, max: 12 });
    fc.assert(
      fc.property(factor, factor, fc.integer({ min: -200, max: 200 }), (a, b, value) => {
        if (value === a * b) expect(() => classify(a, b, value, [])).toThrow();
        else expect(classify(a, b, value, [])).toMatch(/^[a-z_]+$/);
      }),
    );
  });

  it("calls a neighbouring row's product neighbour_row", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), (a, b) => {
        expect(classify(a, b, a * (b + 1), [])).toBe("neighbour_row");
      }),
    );
  });
});

describe("MISTAKE_CLASSES (dl-e8ov.5.38.11)", () => {
  it("holds every class a judge gave the golden corpus that the question's key does not name", () => {
    const unlisted = new Set<string>();
    for (const c of GOLDEN_CASES) {
      const q = {
        ...FamilyQuestion.parse(c.question),
        question_type: QuestionType.parse(c.question.question_type),
      };
      if (q.family === "explain") continue;
      const v = judge(q, c.value);
      // A class the key names (a near table) is the step's own, added to the family's list.
      const named = JSON.stringify(q.key);
      for (const cls of [v.mistake_class, ...v.parts.map((p) => p.mistake_class)]) {
        if (cls === null || MISTAKE_CLASSES[q.family].includes(cls)) continue;
        if (!named.includes(JSON.stringify(cls))) unlisted.add(`${q.family} ${cls}`);
      }
    }
    expect([...unlisted]).toEqual([]);
  });

  it("holds every class a number rule gives, in each family that reads one", () => {
    const rule = fc.oneof(
      fc.record({
        rule: fc.constant("times_table" as const),
        a: fc.integer({ min: 0, max: 12 }),
        b: fc.integer({ min: 0, max: 12 }),
        recent: fc.array(fc.integer({ min: 0, max: 144 }), { maxLength: 3 }),
      }),
      fc.record({
        rule: fc.constant("fill_blank" as const),
        template: fc.constantFrom("□×3=12", "4×□=12", "4×3=□", "□+3=7", "7-□=3"),
        operands: fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 2 }),
        op: fc.constantFrom("add" as const, "sub" as const, "mul" as const),
        recent: fc.array(fc.integer({ min: 0, max: 144 }), { maxLength: 3 }),
      }),
      fc.record({
        rule: fc.constant("number_line" as const),
        mode: fc.constantFrom("place" as const, "read" as const),
        min: fc.constant(0),
        max: fc.constantFrom(10, 20, 100),
        step: fc.constantFrom(1, 2, 5, 10),
      }),
    );
    fc.assert(
      fc.property(
        rule,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: -10, max: 200 }),
        (r, answer, value) => {
          const key = r.rule === "times_table" ? r.a * r.b : answer;
          if (value === key) return;
          const cls = applyRule(r, value, key, 0);
          for (const family of ["enter", "slots", "place"] as const)
            expect(MISTAKE_CLASSES[family]).toContain(cls);
        },
      ),
    );
  });

  it("lists each class once a family, and none for explain, which has no judge", () => {
    for (const classes of Object.values(MISTAKE_CLASSES))
      expect(new Set(classes).size).toBe(classes.length);
    expect(MISTAKE_CLASSES.explain).toEqual([]);
  });
});
