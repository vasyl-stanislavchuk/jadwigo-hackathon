import type { PlaceData, PlaceKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { hourAtOf, hourOf, markDistance } from "./clock.ts";
import { judgePlace, placeMarks, placeSolution } from "./judge.ts";

/**
 * Set the clock (clock_set, dl-w3.61.5): the judge per hand and per class, and the geometry it
 * reads. Ported from the judge half of david-learns `frontend/src/families/place/clock.test.tsx`
 * and the cases of `frontend/src/components/parts/clock.test.ts` for the helpers ported here;
 * the checks stay with validation and the view with the web app.
 */

type ClockData = Extract<PlaceData, { surface: "clock" }>;
const data = (over: Partial<ClockData> = {}): ClockData => ({
  surface: "clock",
  target_label: "wpół do ósmej",
  minute_step: 5,
  hands: "geared",
  ...over,
});
const key = (h: number, m: number): PlaceKey => ({ surface: "clock", h, m });
const judge = (k: PlaceKey, hour_at: number, m: number, d: ClockData = data()) =>
  judgePlace(k, { hour_at, m }, d);

describe("the clock judge", () => {
  it("takes the hour hand anywhere within half an hour gap of a real clock", () => {
    expect(judge(key(7, 30), 37.5, 30)).toMatchObject({
      correct: true,
      parts: [
        { id: "h", correct: true },
        { id: "m", correct: true },
      ],
    });
    expect(judge(key(9, 45), 49, 45, data({ hands: "free", minute_step: 15 })).correct).toBe(true);
    expect(judge(key(9, 45), 50, 45, data({ hands: "free", minute_step: 15 })).correct).toBe(true);
  });

  it("names each miss", () => {
    expect(judge(key(7, 30), 42.5, 30).mistake_class).toBe("half_past_wrong_hour");
    expect(judge(key(7, 30), 40, 30, data({ hands: "free" })).mistake_class).toBe(
      "half_past_wrong_hour",
    );
    expect(judge(key(7, 30), hourAtOf(6, 35), 35)).toMatchObject({
      mistake_class: "hands_swapped",
      parts: [
        { correct: false, mistake_class: "hands_swapped" },
        { correct: false, mistake_class: "hands_swapped" },
      ],
    });
    expect(judge(key(9, 45), 45, 45, data({ hands: "free", minute_step: 15 })).mistake_class).toBe(
      "hour_hand_not_moved",
    );
    expect(judge(key(9, 45), 49, 30, data({ hands: "free", minute_step: 15 })).mistake_class).toBe(
      "minute_off_by_step",
    );
    expect(judge(key(9, 45), 49, 15, data({ hands: "free", minute_step: 15 })).mistake_class).toBe(
      "wrong_minute",
    );
    expect(judge(key(7, 30), 35, 0).mistake_class).toBe("wrong_hour");
    expect(judgePlace(key(7, 30), { at: 3 }).mistake_class).toBe("other_wrong");
  });

  it("marks each hand, and the solution is the clock the key sets", () => {
    const verdict = judge(key(7, 30), 37.5, 35);
    expect(placeMarks(data(), verdict)).toEqual([
      { id: "h", correct: true },
      { id: "m", correct: false },
    ]);
    expect(placeSolution(key(7, 30), data())).toEqual({ hour_at: 37.5, m: 30 });
  });
});

describe("the clock's geometry", () => {
  it("puts the hour hand where a real clock does", () => {
    expect(hourAtOf(7, 30)).toBe(37.5);
    expect(hourAtOf(12, 0)).toBe(0);
    expect(hourAtOf(19, 0)).toBe(35);
    expect(hourOf({ hourAt: 37.5, minute: 30 }, "geared")).toBe(7);
    expect(hourOf({ hourAt: 0, minute: 0 }, "geared")).toBe(12);
    expect(hourOf({ hourAt: 39, minute: 30 }, "free")).toBe(7);
    expect(hourOf({ hourAt: 40, minute: 30 }, "free")).toBe(8);
  });

  it("measures the short way round", () => {
    expect(markDistance(58, 2)).toBe(4);
  });
});
