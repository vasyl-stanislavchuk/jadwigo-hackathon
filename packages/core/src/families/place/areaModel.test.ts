import type { PlaceData, PlaceKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgePlace, placeMarks, placeSolution } from "./judge.ts";

/**
 * area_model (dl-w3.61.7): the grid judge with a split, per part. The checks stay with validation
 * and the split strip with the web app.
 */

const data: PlaceData = {
  surface: "grid",
  size: 9,
  label: "6 × 7",
  split: "one",
  cells: "squares",
};
const key: PlaceKey = {
  surface: "grid",
  rows: 6,
  cols: 7,
  either_order: true,
  split: { accept_at: [5] },
};

describe("the area model judge", () => {
  const judge = (value: unknown, k: PlaceKey = key) => judgePlace(k, value, data);
  it("is right with the split at 5 from either end, either way round", () => {
    expect(judge({ rows: 6, cols: 7, split: { axis: "cols", at: 5 } }).correct).toBe(true);
    expect(judge({ rows: 6, cols: 7, split: { axis: "cols", at: 2 } }).correct).toBe(true);
    expect(judge({ rows: 7, cols: 6, split: { axis: "rows", at: 5 } }).correct).toBe(true);
  });
  it("marks size and split apart", () => {
    const v = judge({ rows: 6, cols: 6, split: { axis: "cols", at: 3 } });
    expect(v.mistake_class).toBe("wrong_size");
    expect(v.parts.map((p) => [p.id, p.mistake_class])).toEqual([
      ["size", "wrong_size"],
      ["split", "split_not_helpful"],
    ]);
    expect(placeMarks(data, v)).toEqual([
      { id: "size", correct: false },
      { id: "split", correct: false },
    ]);
  });
  it("is no_split with none", () =>
    expect(judge({ rows: 6, cols: 7 }).mistake_class).toBe("no_split"));
  it("is split_not_helpful elsewhere, or across the other side", () => {
    expect(judge({ rows: 6, cols: 7, split: { axis: "cols", at: 3 } }).mistake_class).toBe(
      "split_not_helpful",
    );
    expect(judge({ rows: 6, cols: 7, split: { axis: "rows", at: 5 } }).mistake_class).toBe(
      "split_not_helpful",
    );
  });
  it("takes any split of the side when the key lists none", () => {
    expect(
      judge({ rows: 6, cols: 7, split: { axis: "cols", at: 3 } }, { ...key, split: {} }).correct,
    ).toBe(true);
  });
  it("calls a plain grid one row or column off grid_off_by_one", () => {
    const k: PlaceKey = { surface: "grid", rows: 4, cols: 6, either_order: true, off_by_one: true };
    expect(judgePlace(k, { rows: 4, cols: 5 }).mistake_class).toBe("grid_off_by_one");
    expect(judgePlace(k, { rows: 7, cols: 4 }).mistake_class).toBe("grid_off_by_one");
    expect(judgePlace(k, { rows: 3, cols: 8 }).mistake_class).toBe("other_wrong");
    const { off_by_one: _, ...plain } = k;
    expect(judgePlace(plain, { rows: 4, cols: 5 }).mistake_class).toBe("other_wrong");
  });
  it("leaves a plain grid judged as before", () => {
    expect(
      judgePlace({ surface: "grid", rows: 3, cols: 4, either_order: true }, { rows: 4, cols: 3 }),
    ).toEqual({ correct: true, mistake_class: null, parts: [] });
  });
  it("draws the solution with its split", () =>
    expect(placeSolution(key)).toEqual({ rows: 6, cols: 7, split: { axis: "cols", at: 5 } }));
});
