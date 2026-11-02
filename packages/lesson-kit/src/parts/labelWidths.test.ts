import { describe, expect, it } from "vitest";
import { labelWidths, textOnly } from "./labelWidths.ts";

const at = (x: number, y: number, alignment = "below") => ({
  coordinates: [x, y] as [number, number],
  alignment,
});

describe("labelWidths", () => {
  it("gives 4 labels at x=1..4 on one row each the column spacing", () => {
    const range = [
      [0, 5],
      [0, 10],
    ] as const;
    expect(labelWidths([at(1, 0), at(2, 0), at(3, 0), at(4, 0)], range)).toEqual([20, 20, 20, 20]);
  });

  it("uses the nearest neighbour when the columns are uneven", () => {
    const range = [
      [0, 10],
      [0, 10],
    ] as const;
    expect(labelWidths([at(1, 0), at(2, 0), at(6, 0)], range)).toEqual([10, 10, 40]);
  });

  it("leaves a label alone on its row on one line", () => {
    const range = [
      [0, 10],
      [0, 10],
    ] as const;
    // The y-axis ticks share an x but not a row; the axis title sits above, a row of its own.
    const items = [at(0, 2, "left"), at(0, 4, "left"), at(5, 0, "below"), at(5, 0, "above")];
    expect(labelWidths(items, range)).toEqual([null, null, null, null]);
  });
});

describe("textOnly", () => {
  it("reads the words of a label that is only \\text{…}", () => {
    expect(textOnly("\\text{Fancy Farm}")).toBe("Fancy Farm");
    expect(textOnly(" \\text{Farma Słoneczna} ")).toBe("Farma Słoneczna");
    // Khan's graphs pad a category with an empty copy of itself; the words are what is drawn.
    expect(textOnly("\\text{Fancy Farm}\\hphantom{Fancy Farm}")).toBe("Fancy Farm");
  });

  it("leaves real maths to KaTeX", () => {
    expect(textOnly("\\blueD{4}")).toBeNull();
    expect(textOnly("\\text{a} + 1")).toBeNull();
    expect(textOnly("12")).toBeNull();
  });
});
