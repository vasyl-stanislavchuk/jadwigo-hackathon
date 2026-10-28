import type { PlaceData, PlaceKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { touching } from "./fraction.ts";
import { judgePlace, placeSolution } from "./judge.ts";

/**
 * fraction_shade (dl-w3.61.7): the judge per class. The checks stay with validation and the
 * surface and figure with the web app.
 */

const bar: PlaceData = { surface: "fraction", shape: "bar", parts: 4, label: "$\\frac{3}{4}$" };
const key: PlaceKey = { surface: "fraction", count: 3 };
const judge = (shaded: number[], data: PlaceData = bar) => judgePlace(key, { shaded }, data);

describe("the fraction judge", () => {
  it("takes any three parts of four", () => {
    expect(judge([0, 1, 2]).correct).toBe(true);
    expect(judge([0, 2, 3]).correct).toBe(true);
  });
  it.each([
    [[3], "shaded_the_rest"],
    [[0, 1, 2, 3], "shaded_whole"],
    [[0, 1], "off_by_one_part"],
  ])("%j is %s", (shaded, cls) => {
    expect(judge(shaded)).toEqual({ correct: false, mistake_class: cls, parts: [] });
  });
  it("is wrong_count beyond one part off", () => {
    const circle: PlaceData = {
      surface: "fraction",
      shape: "circle",
      parts: 6,
      label: "$\\frac{2}{6}$",
    };
    expect(
      judgePlace({ surface: "fraction", count: 2 }, { shaded: [0, 1, 2, 3, 4] }, circle)
        .mistake_class,
    ).toBe("wrong_count");
  });
  it("counts a part once, and ignores parts that do not exist", () => {
    expect(judge([0, 0, 1, 2, 9]).correct).toBe(true);
  });
  it("with contiguous, parts apart are parts_apart", () => {
    const together: PlaceData = { ...bar, contiguous: true };
    expect(judge([0, 2, 3], together).mistake_class).toBe("parts_apart");
    expect(judge([1, 2, 3], together).correct).toBe(true);
  });
  it("touching wraps round a circle and runs edge to edge on a rectangle", () => {
    expect(touching({ shape: "circle", parts: 6 }, [5, 0])).toBe(true);
    expect(touching({ shape: "rect", parts: 6, rows: 2 }, [0, 3])).toBe(true);
    expect(touching({ shape: "rect", parts: 6, rows: 2 }, [0, 4])).toBe(false);
  });
  it("is other_wrong for a value that is not a shading", () => {
    expect(judgePlace(key, { at: 3 }, bar).mistake_class).toBe("other_wrong");
  });
  it("draws the first parts as the solution", () => {
    expect(placeSolution(key)).toEqual({ shaded: [0, 1, 2] });
  });
});
