import type { ColumnSum, SlotsData, SlotsKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { columnGiven, columnKey } from "./column.ts";
import { judgeSlots } from "./judge.ts";

/**
 * Written column arithmetic (dl-w3.61.4): the cells, the key and the near misses come from the sum,
 * and the judge reads an empty small cell as no carry. The grid, completeness, voice and validator
 * cases stay with the page and the validator.
 */

const sum = (
  op: ColumnSum["op"],
  a: number,
  b: number,
  given_steps = 0,
  carry_row = true,
): ColumnSum => ({ op, operands: [a, b], given_steps, carry_row });
const step = (s: ColumnSum): { data: SlotsData; key: SlotsKey } => {
  const { gaps, key } = columnKey(s);
  return { data: { template: "", column: s, gaps }, key };
};
const judge = (s: ColumnSum, gaps: Record<string, string>) => {
  const { data, key } = step(s);
  return judgeSlots(data, key, { gaps });
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

describe("judging a column", () => {
  const s = sum("add", 47, 38);
  it("takes the right digits, an empty small cell where no carry belongs too", () => {
    expect(judge(s, { r0: "5", c1: "1", r1: "8" }).correct).toBe(true);
    expect(judge(sum("add", 41, 38), { r0: "9", c1: "", r1: "7" }).correct).toBe(true);
  });
  it("names the slip of each cell", () => {
    expect(judge(s, { r0: "5", c1: "", r1: "7" }).parts.map((p) => p.mistake_class)).toEqual([
      null,
      "carry_not_added",
      "forgot_carry",
    ]);
    expect(judge(s, { r0: "6", c1: "1", r1: "8" }).mistake_class).toBe("fact_error");
  });
});
