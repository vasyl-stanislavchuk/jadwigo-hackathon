/**
 * The number line's geometry on fractions (dl-w3.55): ticks, snapping and arrow steps are counted
 * in whole multiples of the snap so sums of tenths and quarters never drift, and a tick is written
 * as a decimal, a fraction or a mixed number. The whole-number cases stay in
 * blocks/number_line/logic.test.ts.
 */

import { describe, expect, it } from "vitest";
import {
  asFraction,
  commonDenominator,
  lastSnap,
  lastTick,
  nudge,
  snapAt,
  tickLabel,
  tickLabelText,
  ticks,
  WIDTH,
  wholeCount,
  xOf,
} from "./numberLine.ts";

const QUARTERS = { min: 0, max: 1, step: 0.25 };
const TENTHS = { min: 0, max: 1, step: 0.1 };
const fractionOf = (value: number, line: { min: number; max: number }) =>
  xOf(value, { ...line, step: 1 }) / WIDTH;

describe("ticks on fractions", () => {
  it("quarters and tenths land on exact values, never 0.30000000000000004", () => {
    expect(ticks(QUARTERS)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(ticks(TENTHS)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(ticks({ min: 1, max: 3, step: 0.5 })).toEqual([1, 1.5, 2, 2.5, 3]);
  });

  it("the last tick and the last snap are the line end when their unit divides it", () => {
    expect(lastTick(TENTHS)).toBe(1);
    expect(lastTick({ min: 0, max: 1, step: 0.3 })).toBe(0.9);
    expect(lastSnap({ ...QUARTERS, snap: 0.125 })).toBe(1);
  });

  it("wholeCount says how many units fit, within a hair, or null", () => {
    expect(wholeCount(1, 0.1)).toBe(10);
    expect(wholeCount(0.75, 0.25)).toBe(3);
    expect(wholeCount(1, 0.3)).toBeNull();
    expect(wholeCount(1, 0)).toBeNull();
  });
});

describe("snapping on fractions", () => {
  it("snaps to the nearest quarter, clamped to the line", () => {
    expect(snapAt(fractionOf(0.7, QUARTERS), QUARTERS)).toBe(0.75);
    expect(snapAt(fractionOf(0.6, QUARTERS), QUARTERS)).toBe(0.5);
    expect(snapAt(0, QUARTERS)).toBe(0);
    expect(snapAt(1, QUARTERS)).toBe(1);
  });

  it("a finer snap than the step takes the positions between ticks", () => {
    const line = { ...QUARTERS, snap: 0.125 };
    expect(snapAt(fractionOf(0.4, line), line)).toBe(0.375);
    expect(snapAt(fractionOf(0.13, line), line)).toBe(0.125);
  });

  it("an arrow press moves one snap unit, a step when there is no finer snap, and starts at min", () => {
    expect(nudge(null, 1, QUARTERS)).toBe(0);
    expect(nudge(0.5, 1, QUARTERS)).toBe(0.75);
    expect(nudge(0.25, -1, QUARTERS)).toBe(0);
    expect(nudge(1, 1, QUARTERS)).toBe(1);
    expect(nudge(0.25, 1, { ...QUARTERS, snap: 0.125 })).toBe(0.375);
    let v: number | null = null;
    for (let i = 0; i < 10; i++) v = nudge(v, 1, TENTHS);
    expect(v).toBe(0.9);
  });
});

describe("tick labels", () => {
  it("writes a fraction as TeX, a mixed number with its whole part, and a whole number as digits", () => {
    expect(tickLabel(0.5, "fraction")).toBe("\\frac{1}{2}");
    expect(tickLabel(1.5, "fraction")).toBe("\\frac{3}{2}");
    expect(tickLabel(1.5, "mixed")).toBe("1\\frac{1}{2}");
    expect(tickLabel(0.75, "mixed")).toBe("\\frac{3}{4}");
    expect(tickLabel(2, "fraction")).toBe("2");
    expect(tickLabel(-0.25, "fraction")).toBe("-\\frac{1}{4}");
  });

  it("decimal style, and a value no small fraction fits, stay digits", () => {
    expect(tickLabel(0.5)).toBe("0.5");
    expect(tickLabel(0.1 + 0.2, "decimal")).toBe("0.3");
    expect(tickLabel(0.123456789, "fraction")).toBe("0.123456789");
  });

  it("tickLabelText wraps TeX in dollars and leaves digits alone", () => {
    expect(tickLabelText(0.5, "fraction")).toBe("$\\frac{1}{2}$");
    expect(tickLabelText(1, "fraction")).toBe("1");
  });

  it("non-reduced writes every tick over the line’s common denominator, whole ones too (dl-w3.70.2)", () => {
    const halves = { min: 0, max: 2, step: 0.5 };
    // Quarters labelled on a line of halves: the base is 4, so a half is 2/4, as Perseus draws it.
    const base = commonDenominator(halves, [0.25]);
    expect(base).toBe(4);
    expect(tickLabel(0.5, "non-reduced", base)).toBe("\\frac{2}{4}");
    expect(tickLabel(0, "non-reduced", base)).toBe("\\frac{0}{4}");
    expect(tickLabel(1, "non-reduced", base)).toBe("\\frac{4}{4}");
    expect(tickLabelText(2, "non-reduced", commonDenominator(halves))).toBe("$\\frac{4}{2}$");
    // Sixths: 1/3 and 1/2 both sit over 6.
    const sixths = { min: 0, max: 1, step: 1 / 6 };
    expect(commonDenominator(sixths)).toBe(6);
    expect(tickLabel(1 / 3, "non-reduced", 6)).toBe("\\frac{2}{6}");
  });

  it("non-reduced on a line of whole numbers, or with no base, stays digits", () => {
    expect(commonDenominator({ min: 0, max: 4, step: 1 })).toBe(1);
    expect(tickLabel(3, "non-reduced", 1)).toBe("3");
    expect(tickLabel(0.5, "non-reduced")).toBe("0.5");
    expect(commonDenominator({ min: 0, max: 1, step: 0.123456789 })).toBeNull();
  });

  it("asFraction finds the simplest small denominator, or none", () => {
    expect(asFraction(0.75)).toEqual({ p: 3, q: 4 });
    expect(asFraction(2 / 3)).toEqual({ p: 2, q: 3 });
    expect(asFraction(3)).toBeNull();
  });
});
