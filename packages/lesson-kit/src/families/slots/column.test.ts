/**
 * Written column arithmetic (dl-w3.61.4): the cells, the key and the near misses come from the sum,
 * an empty small cell is no gap at Check, and the validator refuses a step whose gaps or key drift
 * from the arithmetic.
 */

import { describe, expect, it } from "vitest";
import { must } from "../../parts/must.ts";
import { missingGaps } from "../complete.ts";
import { Family, QuestionType } from "../names.ts";
import type { FamilySpec } from "../types.ts";
import { validate } from "../validate.ts";
import { type ColumnSum, columnGiven, columnGrid, columnKey } from "./column.ts";

const sum = (
  op: ColumnSum["op"],
  a: number,
  b: number,
  given_steps = 0,
  carry_row = true,
): ColumnSum => ({ op, operands: [a, b], given_steps, carry_row });
const step = (s: ColumnSum): FamilySpec => {
  const { gaps, key } = columnKey(s);
  return {
    id: "c",
    question_type: QuestionType.Column,
    say: "Add in columns.",
    family: Family.Slots,
    data: { template: "", column: s, gaps },
    key,
  };
};
const accept = (s: ColumnSum) =>
  Object.fromEntries(Object.entries(columnKey(s).key.gaps).map(([id, k]) => [id, k.accept[0]]));

describe("columnKey", () => {
  it("works 47 + 38 right to left, the small cell before its column", () => {
    expect(columnKey(sum("add", 47, 38)).gaps.map((g) => g.id)).toEqual(["r0", "c1", "r1"]);
    expect(accept(sum("add", 47, 38))).toEqual({ r0: "5", c1: "1", r1: "8" });
  });
  it("writes a last carry straight into the result", () => {
    expect(accept(sum("add", 57, 68))).toEqual({ r0: "5", c1: "1", r1: "2", r2: "1" });
  });
  it("marks a lent ten as the digit after lending, a 0 that borrowed itself as 9", () => {
    expect(accept(sum("sub", 52, 27))).toEqual({ r0: "5", c1: "4", r1: "2" });
    expect(accept(sum("sub", 503, 128))).toEqual({ r0: "5", c1: "9", r1: "7", c2: "4", r2: "3" });
  });
  it("carries in a product by one digit", () => {
    expect(accept(sum("mul", 23, 4))).toEqual({ r0: "2", c1: "1", r1: "9" });
  });
  it("derives the near misses", () => {
    const add = columnKey(sum("add", 47, 38)).key.gaps;
    expect(add["c1"]?.near).toEqual({ "0": "carry_not_added" });
    expect(add["r1"]?.near).toEqual({ "7": "forgot_carry" });
    const sub = columnKey(sum("sub", 74, 38)).key.gaps;
    expect(sub["r0"]?.near).toEqual({ "4": "borrow_error" });
    expect(sub["c1"]?.near).toEqual({ "7": "borrow_not_marked" });
    expect(sub["r1"]?.near).toEqual({ "4": "forgot_borrow" });
  });
  it("fills the rightmost given_steps columns in, carries included", () => {
    expect(columnGiven(sum("add", 365, 278, 1))).toEqual({ r0: "3", c1: "1" });
    expect(columnKey(sum("add", 365, 278, 1)).gaps.map((g) => g.id)).toEqual(["r1", "c2", "r2"]);
  });
  it("drops the small cells without a carry row", () => {
    expect(columnKey(sum("add", 47, 38, 0, false)).gaps.map((g) => g.id)).toEqual(["r0", "r1"]);
  });
});

describe("columnGrid", () => {
  it("lists the gaps in working order after every digit, with the carry a square above its column", () => {
    const g = columnGrid(sum("add", 47, 38));
    expect(g.cells.filter((c) => c.slot).map((c) => c.slot)).toEqual(["r0", "c1", "r1"]);
    expect(g.cells.find((c) => c.slot === "c1")).toMatchObject({ row: 0, col: 1, small: true });
    expect(g.rows).toBe(4);
    // The rule sits under the second number, the sign's row.
    expect(g.rule).toBe(must(g.cells.find((c) => c.text === "+")).row);
    expect(must(g.cells.find((c) => c.slot === "r1")).row).toBe(3);
  });
  it("crosses a lending digit out once the digit over it is written (addendum 4.4)", () => {
    const g = columnGrid(sum("sub", 52, 27));
    expect(must(g.cells.find((c) => c.text === "5" && c.row === 1)).strikeBy).toBe("c1");
    expect(must(g.cells.find((c) => c.text === "2" && c.row === 1)).strikeBy).toBeUndefined();
    // A given column's new digit is printed, so its digit is crossed out from the start.
    const given = columnGrid(sum("sub", 352, 127, 1));
    expect(given.cells.find((c) => c.text === "5" && c.row === 1)).toMatchObject({ struck: true });
  });
});

describe("a column at Check", () => {
  const s = step(sum("add", 47, 38));
  it("lets a small cell stay empty at Check", () => {
    expect(
      missingGaps(s.family === Family.Slots ? s.data : (null as never), {
        gaps: { r0: "5", r1: "8" },
      }),
    ).toBeNull();
    expect(
      missingGaps(s.family === Family.Slots ? s.data : (null as never), {
        gaps: { c1: "1", r1: "8" },
      })?.parts,
    ).toEqual(["r0"]);
  });
});

describe("validating a column", () => {
  const rules = (spec: FamilySpec) =>
    validate(spec)
      .filter((p) => p.level === "error")
      .map((p) => p.rule);
  it("passes a derived step", () => {
    expect(rules(step(sum("sub", 52, 27)))).toEqual([]);
  });
  it("refuses a key that drifts from the sum", () => {
    const s = step(sum("add", 47, 38));
    if (s.family !== Family.Slots) throw new Error();
    expect(
      rules({ ...s, key: { gaps: { ...s.key.gaps, r1: { kind: Family.Enter, accept: ["9"] } } } }),
    ).toContain("column_mismatch");
  });
  it("refuses a product by two digits, a negative difference and a sum all given", () => {
    expect(rules(step(sum("mul", 23, 14)))).toContain("multiplier_digits");
    expect(rules({ ...step(sum("sub", 27, 52)) })).toContain("negative_difference");
    expect(rules(step(sum("add", 47, 38, 2)))).toContain("all_given");
  });
});
