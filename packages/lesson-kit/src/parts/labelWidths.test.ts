import { describe, expect, it } from "vitest";
import { isAxisTitle, labelLines, labelWidths, textOnly } from "./labelWidths.ts";

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

describe("labelWidths beside a y-axis", () => {
  it("does not squeeze the axis title against the tick at its height", () => {
    // Grade 1's bar graph: ticks 0..10 left of the axis, the title "Liczba dzieci" centred at y = 5.
    const range = [
      [-0.65, 3.52],
      [-1, 11],
    ] as const;
    const ticks = [4, 5, 6].map((y) => at(-0.05, y, "left"));
    expect(labelWidths([...ticks, at(-0.52, 5, "center")], range)).toEqual([
      null,
      null,
      null,
      null,
    ]);
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

describe("isAxisTitle", () => {
  // The pony picture graph's range: a margin left of the y-axis at x = 0.
  const range = [
    [-0.53, 4.3],
    [-2.04, 5],
  ] as const;

  it("finds the centred title left of the y-axis", () => {
    expect(isAxisTitle(at(-0.45, 2.65, "center"), range)).toBe(true);
  });

  it("leaves the x-axis names, the x-axis title and other labels level", () => {
    expect(isAxisTitle(at(0.65, 0, "below"), range)).toBe(false);
    expect(isAxisTitle(at(2.15, -1.6, "below"), range)).toBe(false);
    expect(isAxisTitle(at(-0.45, 2, "left"), range)).toBe(false);
    expect(isAxisTitle(at(1, 2, "center"), range)).toBe(false);
    // A drawing with no margin left of 0 has no such title.
    expect(
      isAxisTitle(at(-1, 0, "center"), [
        [-5, -0.5],
        [0, 1],
      ]),
    ).toBe(false);
  });
});

describe("labelLines", () => {
  it("splits a label at <br>, <br/> and <br />", () => {
    expect(labelLines("Break<br>dance")).toEqual(["Break", "dance"]);
    expect(labelLines("Twist and<br/>shout")).toEqual(["Twist and", "shout"]);
    expect(labelLines("a<BR />b")).toEqual(["a", "b"]);
    expect(labelLines("Oatmeal ")).toEqual(["Oatmeal"]);
  });
});
