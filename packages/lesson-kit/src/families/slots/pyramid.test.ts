/**
 * Number pyramids (dl-w3.61.4): the pyramid solves itself from its givens, the key and the two
 * classic slips come from it, and the validator checks the shape and the sums.
 */

import { describe, expect, it } from "vitest";
import { Family, QuestionType } from "../names.ts";
import type { FamilySpec } from "../types.ts";
import { validate } from "../validate.ts";
import { fillOrder } from "./model.ts";
import { type PyramidRows, pyramidFillOrder, pyramidKey } from "./pyramid.ts";

const step = (rows: PyramidRows, ids: string[]): FamilySpec => ({
  id: "p",
  question_type: QuestionType.Pyramid,
  say: "Each brick is the sum of the two below it.",
  family: Family.Slots,
  data: {
    template: "",
    pyramid: rows,
    gaps: ids.map((id) => ({ id, kind: Family.Enter, input: "number" })),
  },
  key: { gaps: pyramidKey(rows) },
});
const rules = (spec: FamilySpec, level: "error" | "warning" = "error") =>
  validate(spec)
    .filter((p) => p.level === level)
    .map((p) => p.rule);

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
  const s = step([[15], [8, 7], ["{g1}", 5, "{g2}"]], ["g1", "g2"]);
  it("validates clean, and refuses a broken shape or sum", () => {
    expect(rules(s)).toEqual([]);
    expect(rules(step([[15], [8, 7, 1], ["{g1}", 5, "{g2}"]], ["g1", "g2"]))).toContain(
      "pyramid_shape",
    );
    expect(rules(step([[16], [8, 7], ["{g1}", 5, "{g2}"]], ["g1", "g2"]))).toContain("pyramid_sum");
  });
  it("warns when the givens leave a brick open", () => {
    expect(
      rules(
        step([["{g1}"], ["{g2}", "{g3}"], [1, 2, 3]].map((r) => r) as PyramidRows, [
          "g1",
          "g2",
          "g3",
        ]),
        "warning",
      ),
    ).toEqual([]);
    expect(rules(step([[10], ["{g1}", "{g2}"], [1, 2, 3]], ["g1", "g2"]), "warning")).toEqual([]);
    expect(
      rules(
        step([["{g1}"], ["{g2}", "{g3}"], ["{g4}", 2, 3]], ["g1", "g2", "g3", "g4"]),
        "warning",
      ),
    ).toContain("pyramid_ambiguous");
  });
});
