import type { PyramidRows, SlotsData, SlotsKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgeSlots } from "./judge.ts";
import { fillOrder } from "./model.ts";
import { pyramidFillOrder, pyramidKey } from "./pyramid.ts";

/**
 * Number pyramids (dl-w3.61.4): the pyramid solves itself from its givens, and the key and the two
 * classic slips come from it. The validator's cases stay with the validator.
 */

const step = (rows: PyramidRows, ids: string[]): { data: SlotsData; key: SlotsKey } => ({
  data: {
    template: "",
    pyramid: rows,
    gaps: ids.map((id) => ({ id, kind: "enter", input: "number" })),
  },
  key: { gaps: pyramidKey(rows) },
});

describe("pyramidKey", () => {
  it("solves upward and downward", () => {
    expect(pyramidKey([["{g1}"], ["{g2}", 9], [6, 5, 4]])).toMatchObject({
      g1: { accept: ["20"] },
      g2: { accept: ["11"] },
    });
    expect(pyramidKey([[15], [8, 7], ["{g1}", 5, "{g2}"]])).toMatchObject({
      g1: { accept: ["3"] },
      g2: { accept: ["2"] },
    });
  });
  it("names the two slips", () => {
    expect(pyramidKey([["{g1}"], ["{g2}", 9], [6, 5, 4]])["g2"]?.near).toMatchObject({
      "1": "subtracted_for_sum",
    });
    expect(pyramidKey([[15], [8, 7], ["{g1}", 5, "{g2}"]])["g1"]?.near).toEqual({
      "13": "added_for_missing",
    });
  });
});

describe("pyramidFillOrder", () => {
  it("fills the bottom row first, left to right, then up (addendum 4.5)", () => {
    expect(pyramidFillOrder([["{g1}"], ["{g2}", 9], [6, 5, 4]])).toEqual(["g2", "g1"]);
    expect(pyramidFillOrder([["{g1}"], ["{g2}", "{g3}"], ["{g4}", 2, "{g5}"]])).toEqual([
      "g4",
      "g5",
      "g2",
      "g3",
      "g1",
    ]);
    expect(
      fillOrder({ template: "", pyramid: [["{g1}"], ["{g2}", 9], [6, 5, 4]], gaps: [] }),
    ).toEqual(["g2", "g1"]);
  });
});

describe("a pyramid step", () => {
  const { data, key } = step([[15], [8, 7], ["{g1}", 5, "{g2}"]], ["g1", "g2"]);
  it("is judged brick by brick", () => {
    expect(judgeSlots(data, key, { gaps: { g1: "3", g2: "2" } }).correct).toBe(true);
    expect(
      judgeSlots(data, key, { gaps: { g1: "13", g2: "2" } }).parts.map((p) => p.mistake_class),
    ).toEqual(["added_for_missing", null]);
  });
});
