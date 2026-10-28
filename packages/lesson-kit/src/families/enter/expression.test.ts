/**
 * The expression parser behind Enter's `input: expression` (dl-w3.51.1): what reads as an
 * expression, its value, its form, and the signs a hardware key stands for.
 */

import { describe, expect, it } from "vitest";
import { must } from "../../parts/must.ts";
import { evaluate, formOf, parseExpression, plainSigns, signOf, unfinished } from "./expression.ts";

const value = (text: string): number | null => {
  const e = parseExpression(text);
  return e === null ? null : evaluate(e);
};
const form = (text: string) => formOf(must(parseExpression(text)));

describe("parseExpression", () => {
  it.each([
    ["2×5", 10],
    ["5 × 2", 10],
    ["2*5", 10],
    ["2x5", 10],
    ["2\\times5", 10],
    ["2\\cdot 5", 10],
    ["12÷3", 4],
    ["12/3", 4],
    ["12\\div3", 4],
    ["2+2+2+2+2", 10],
    ["10−3", 7],
    ["10-3", 7],
    ["2×(3+4)", 14],
    ["(2×3)+4", 10],
    ["2×3+4", 10],
    ["−3", -3],
    ["7", 7],
    ["007", 7],
  ])("%s has the value %s", (text, want) => {
    expect(value(text)).toBe(want);
  });

  it.each(["", "  ", "abc", "2×", "×5", "(2×5", "2×5)", "2 5", "2(5)", "2++5", "2.5×2", "5÷0"])(
    "refuses or cannot value %j",
    (text) => {
      expect(value(text)).toBeNull();
    },
  );
});

describe("formOf", () => {
  it.each([
    ["2×5", "product"],
    ["(2×5)", "product"],
    ["2+2+2", "sum"],
    ["2×3+4", "sum"],
    ["2×(3+4)", "product"],
    ["10−3", "difference"],
    ["12÷3", "quotient"],
    ["10", "number"],
    ["−10", "number"],
  ])("%s is a %s", (text, want) => {
    expect(form(text)).toBe(want);
  });
});

describe("signOf and plainSigns", () => {
  it("maps a hardware key to the keypad sign it stands for", () => {
    expect(["*", "x", "X", "·", "×"].map(signOf)).toEqual(["×", "×", "×", "×", "×"]);
    expect(["/", ":", "÷"].map(signOf)).toEqual(["÷", "÷", "÷"]);
    expect(["-", "−", "–"].map(signOf)).toEqual(["−", "−", "−"]);
    expect(["+", "(", ")"].map(signOf)).toEqual(["+", "(", ")"]);
    expect(["a", "7", " ", "=", "."].map(signOf)).toEqual([null, null, null, null, null]);
  });

  it("folds TeX and synonyms to the keypad glyphs for a key", () => {
    expect(plainSigns("2\\times5")).toBe("2×5");
    expect(plainSigns("4 \\cdot {10}")).toBe("4×10");
    expect(plainSigns("12 / 3")).toBe("12÷3");
  });
});

describe("unfinished", () => {
  it.each(["2×", "2+", "(2×5", "2×(", "−"])("%s is still being written", (text) => {
    expect(unfinished(text)).toBe(true);
  });
  it.each(["", "2×5", "(2×5)", "12", "abc", "2×5)"])("%j is not", (text) => {
    expect(unfinished(text)).toBe(false);
  });
});
