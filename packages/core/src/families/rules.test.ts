// The number-line rule on fractions (dl-w3.55). The whole-number behaviour is held to the Python
// by the golden corpus (golden.test.ts); this file covers positions and steps that are not whole,
// where the 3 classes keep their meaning: off_by_tick, scale_misread and wrong_direction.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyRule, classify, classifyNumberLine, isNum, withinTolerance } from "./rules.ts";

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
