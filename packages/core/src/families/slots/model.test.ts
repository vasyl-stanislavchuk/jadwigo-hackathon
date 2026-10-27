import type { Gap } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { markerIds, pieces } from "./model.ts";

/**
 * The gap template's markers (slots/model.ts): `{g1}` is a gap, and braces inside TeX are TeX
 * (dl-r772.6), so `$\text{fives}$` and `$\blueD{7}$` make no gap. Ported from david-learns
 * `frontend/src/families/slots/model.test.ts`; `startsSentence` stays with the page.
 */

describe("gap markers", () => {
  it("reads every marker in order and cuts the template at them", () => {
    expect(markerIds("{g1} + {g2} = 12")).toEqual(["g1", "g2"]);
    expect(pieces("{g1} + {g2} = 12")).toEqual([
      { gap: "g1" },
      { text: " + " },
      { gap: "g2" },
      { text: " = 12" },
    ]);
  });

  it("reads a table row by row after the template, cells apart by a comma and rows by a stop (dl-w3.51.5)", () => {
    const data = {
      template: "Seven times:",
      table: { header: ["×", "3", "5"], rows: [["7", "{g1}", "{g2}"]] },
    };
    expect(markerIds(data)).toEqual(["g1", "g2"]);
    expect(pieces(data)).toEqual([
      { text: "Seven times:" },
      { text: ". " },
      { text: "×" },
      { text: ", " },
      { text: "3" },
      { text: ", " },
      { text: "5" },
      { text: ". " },
      { text: "7" },
      { text: ", " },
      { gap: "g1" },
      { text: ", " },
      { gap: "g2" },
    ]);
    // A header that says nothing is not read, and an empty template adds no separator.
    expect(
      pieces({ template: "", table: { header: ["", ""], rows: [["$8 \\times 9$", "= {g1}"]] } }),
    ).toEqual([{ text: "$8 \\times 9$" }, { text: ", " }, { text: "= " }, { gap: "g1" }]);
  });

  it("reads the gaps placed on a picture first, then the template (dl-w3.51.2)", () => {
    const picture = { src: "x.svg", alt: "A line.", width: 10, height: 10 };
    const gaps: Gap[] = [
      { id: "g1", kind: "choose", at: { x: 10, y: 50 }, options: [] },
      { id: "g2", kind: "choose", at: { x: 90, y: 50 }, options: [] },
      { id: "g3", kind: "enter", input: "number" },
    ];
    expect(markerIds({ template: "3 × 8 = {g3}", picture, gaps })).toEqual(["g1", "g2", "g3"]);
    expect(pieces({ template: "3 × 8 = {g3}", picture, gaps })).toEqual([
      { gap: "g1" },
      { text: ", " },
      { gap: "g2" },
      { text: ". " },
      { text: "3 × 8 = " },
      { gap: "g3" },
    ]);
    // Without a picture a placed gap is not read from the picture: validate refuses it.
    expect(markerIds({ template: "{g3}", gaps })).toEqual(["g3"]);
  });

  it("skips braces inside a TeX span", () => {
    const template = "Five $\\text{fives}$ make $\\blueD{a}$ {g1}, so $2 \\times {g2}$.";
    expect(markerIds(template)).toEqual(["g1"]);
    expect(pieces(template)).toEqual([
      { text: "Five $\\text{fives}$ make $\\blueD{a}$ " },
      { gap: "g1" },
      { text: ", so $2 \\times {g2}$." },
    ]);
  });
});
