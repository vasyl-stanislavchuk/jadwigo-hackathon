import type { PlaceData, PlaceKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgePlace, placeMarks } from "./judge.ts";

/**
 * The Place judge's surfaces the dispatcher's cases (judge.test.ts) leave out: a line graph and a
 * histogram judged as bars, and a picture, where each tap is judged by the target it lands in.
 */

const bars = (kind: "line" | "histogram", bins?: number[]): PlaceData => ({
  surface: "bars",
  kind,
  categories: [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ],
  max: 10,
  step: 1,
  ...(bins ? { bins } : {}),
});

describe("a line graph and a histogram", () => {
  it("are judged as bars: per point or bar, one step off or wrong", () => {
    const key: PlaceKey = { surface: "bars", heights: { a: 2, b: 3 } };
    for (const data of [bars("line"), bars("histogram", [0, 5, 10])]) {
      expect(judgePlace(key, { heights: { a: 2, b: 3 } }, data).correct).toBe(true);
      expect(judgePlace(key, { heights: { a: 2, b: 4 } }, data)).toMatchObject({
        correct: false,
        mistake_class: "bar_off_by_step",
      });
      expect(judgePlace(key, { heights: { a: 5, b: 3 } }, data)).toMatchObject({
        correct: false,
        mistake_class: "bar_wrong",
        parts: [
          { id: "a", correct: false },
          { id: "b", correct: true },
        ],
      });
    }
  });
});

describe("a picture", () => {
  const square = [
    { x: 0.5, y: 0.5 },
    { x: 0.6, y: 0.5 },
    { x: 0.6, y: 0.6 },
    { x: 0.5, y: 0.6 },
  ];
  const left = square.map((p) => ({ x: p.x - 0.4, y: p.y }));
  const data: PlaceData = { surface: "image", image: "a.svg", image_alt: "Two squares", taps: 2 };
  const key: PlaceKey = {
    surface: "image",
    targets: [
      { id: "r1", polygon: square },
      { id: "r2", polygon: left },
    ],
    require_all: true,
  };

  it("with require_all, a target nobody tapped is target_missed; each tap is a part", () => {
    const one = judgePlace(key, { points: [{ x: 0.55, y: 0.55 }] }, data);
    expect(one).toEqual({
      correct: false,
      mistake_class: "target_missed",
      parts: [{ id: "t1", correct: true, mistake_class: null }],
    });
    expect(placeMarks(data, one)).toEqual([{ id: "t1", correct: true }]);
    expect(
      judgePlace({ ...key, require_all: false }, { points: [{ x: 0.55, y: 0.55 }] }, data),
    ).toMatchObject({ correct: true });
  });

  it("refuses no taps, or a tap that is not a point", () => {
    expect(judgePlace(key, { points: [] }, data).mistake_class).toBe("other_wrong");
    expect(judgePlace(key, { points: [{ x: "0.5", y: 0.5 }] }, data).mistake_class).toBe(
      "other_wrong",
    );
  });
});
