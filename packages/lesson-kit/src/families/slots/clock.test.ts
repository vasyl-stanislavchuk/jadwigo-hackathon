/**
 * Read the clock (clock_read, dl-w3.61.5): the generated key names the misreadings, and the checks
 * refuse a key that reads another clock or alt text that tells. The judge is `packages/core`'s.
 */
import { describe, expect, it } from "vitest";
import { Family, QuestionType } from "../names.ts";
import type { SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { CLOCK_GAPS, clockReadKey } from "./clock.ts";
import { type SlotsData, takes } from "./model.ts";

const data = (h: number, m: number, alt = "A clock with hands."): SlotsData => ({
  figure: { kind: "clock", h, m, alt },
  template: "{h} : {m}",
  gaps: [
    { id: "h", kind: Family.Enter, input: "number" },
    { id: "m", kind: Family.Enter, input: "number" },
  ],
});
const spec = (
  d: SlotsData,
  k = clockReadKey(
    d.figure?.kind === "clock" ? d.figure.h : 1,
    d.figure?.kind === "clock" ? d.figure.m : 0,
  ),
): SpecOf<typeof Family.Slots> => ({
  id: "s1",
  say: "What time is it?",
  question_type: QuestionType.ClockRead,
  family: Family.Slots,
  data: d,
  key: { gaps: k },
});

describe("clockReadKey", () => {
  it("writes the misreadings of half past seven, and 7 and 19 both right (addendum 4.6)", () => {
    const k = clockReadKey(7, 30);
    expect(k.h).toMatchObject({
      accept: ["7", "19"],
      near: {
        "8": "half_past_wrong_hour",
        "20": "half_past_wrong_hour",
        "6": "hands_swapped",
        "18": "hands_swapped",
      },
    });
    expect(k.m).toMatchObject({
      accept: ["30"],
      near: { "6": "minute_hand_as_number", "35": "hands_swapped", "40": "hands_swapped" },
    });
  });
  it("writes a whole hour as 00 and the 12 the minute hand points at", () => {
    const k = clockReadKey(3, 0);
    expect(k.m.accept).toEqual(["00"]);
    expect(k.m.near?.["12"]).toBe("minute_hand_as_number");
  });
  it("takes one reading when the instruction names the part of the day", () => {
    expect(clockReadKey(7, 30, "morning").h.accept).toEqual(["7"]);
    expect(clockReadKey(7, 30, "evening").h.accept).toEqual(["19"]);
    expect(clockReadKey(12, 0).h.accept).toEqual(["12", "0"]);
  });
});

describe("the clock gaps (addendum 2.4)", () => {
  it("are two digits, the hour 0 to 23 and the minutes 0 to 59, so 73 is never taken", () => {
    const [h, m] = CLOCK_GAPS;
    expect(h).toMatchObject({ id: "h", max_length: 2, range: [0, 23] });
    expect(m).toMatchObject({ id: "m", max_length: 2, range: [0, 59] });
    expect(takes(h, "7")).toBe(true);
    expect(takes(h, "73")).toBe(false);
    expect(takes(h, "19")).toBe(true);
    expect(takes(m, "60")).toBe(false);
    expect(takes(m, "59")).toBe(true);
  });
});

describe("the clock_read checks", () => {
  const rules = (s: SpecOf<typeof Family.Slots>) => validate(s).map((p) => p.rule);
  it("accept a clock and its key", () => {
    expect(validate(spec(data(7, 30))).filter((p) => p.level === "error")).toEqual([]);
  });
  it("refuse a key that reads another clock, an hour off the face, and alt text with the time", () => {
    expect(rules(spec(data(7, 30), clockReadKey(8, 30)))).toContain("clock_mismatch");
    expect(rules(spec(data(13, 0), clockReadKey(1, 0)))).toContain("clock_hour");
    expect(rules(spec(data(7, 30, "The clock shows 7:30.")))).toContain("key_in_alt");
  });
});
