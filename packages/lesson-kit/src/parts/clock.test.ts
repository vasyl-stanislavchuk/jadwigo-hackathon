/**
 * A clock's geometry (clock.ts, dl-w3.61.5): where the hands sit, how they snap, and how geared
 * hands carry the hour round 12.
 */
import { describe, expect, it } from "vitest";
import {
  CAP_HEIGHT,
  DIGIT_WIDTH,
  FACE,
  faceNumbers,
  hourAtOf,
  hourOf,
  markDistance,
  marksAt,
  nudgeHand,
  numeralReach,
  setHour,
  setMinute,
  snapMinute,
} from "./clock.ts";

describe("the clock", () => {
  it("puts the hour hand where a real clock does", () => {
    expect(hourAtOf(7, 30)).toBe(37.5);
    expect(hourAtOf(12, 0)).toBe(0);
    expect(hourAtOf(19, 0)).toBe(35);
    expect(hourOf({ hourAt: 37.5, minute: 30 }, "geared")).toBe(7);
    expect(hourOf({ hourAt: 0, minute: 0 }, "geared")).toBe(12);
    expect(hourOf({ hourAt: 39, minute: 30 }, "free")).toBe(7);
    expect(hourOf({ hourAt: 40, minute: 30 }, "free")).toBe(8);
  });

  it("reads a point round the face as a mark, 0 at the top", () => {
    expect(marksAt(0, -10)).toBe(0);
    expect(marksAt(10, 0)).toBeCloseTo(15);
    expect(marksAt(0, 10)).toBeCloseTo(30);
    expect(marksAt(-10, 0)).toBeCloseTo(45);
  });

  it("snaps the minute hand to its step", () => {
    expect(snapMinute(31, 5)).toBe(30);
    expect(snapMinute(59, 5)).toBe(0);
    expect(snapMinute(40, 15)).toBe(45);
  });

  it("geared, carries the hour on past 12 and back", () => {
    const at = { hourAt: hourAtOf(7, 55), minute: 55 };
    expect(setMinute(at, 0, "geared")).toEqual({ hourAt: hourAtOf(8, 0), minute: 0 });
    expect(setMinute({ hourAt: hourAtOf(8, 0), minute: 0 }, 55, "geared")).toEqual({
      hourAt: hourAtOf(7, 55),
      minute: 55,
    });
    expect(setMinute(at, 30, "geared")).toEqual({ hourAt: hourAtOf(7, 30), minute: 30 });
    expect(nudgeHand(at, "m", 1, 5, "geared")).toEqual({ hourAt: hourAtOf(8, 0), minute: 0 });
  });

  it("geared, the hour hand takes the nearest hour its minutes allow", () => {
    const at = { hourAt: hourAtOf(12, 45), minute: 45 };
    expect(setHour(at, 50, "geared")).toEqual({ hourAt: hourAtOf(9, 45), minute: 45 });
    expect(nudgeHand(at, "h", 1, 5, "geared")).toEqual({ hourAt: hourAtOf(1, 45), minute: 45 });
  });

  it("free, moves each hand on its own, the hour hand by whole marks", () => {
    const at = { hourAt: 0, minute: 0 };
    expect(setMinute(at, 30, "free")).toEqual({ hourAt: 0, minute: 30 });
    expect(setHour(at, 37.4, "free")).toEqual({ hourAt: 37, minute: 0 });
    expect(nudgeHand(at, "h", -1, 5, "free")).toEqual({ hourAt: 59, minute: 0 });
  });

  it("measures the short way round and names the numbers a hand points at", () => {
    expect(markDistance(58, 2)).toBe(4);
    expect(faceNumbers(30)).toEqual({ at: 6 });
    expect(faceNumbers(0)).toEqual({ at: 12 });
    expect(faceNumbers(37.5)).toEqual({ from: 7, to: 8 });
    expect(faceNumbers(57)).toEqual({ from: 11, to: 12 });
  });

  // The numbers sat on the hour ticks (dl-w3.61 smoke test: 10, 11, 2 and 4 crossed by ticks).
  // The face scales as one viewBox, so a check in its own units holds at every size it renders.
  it("keeps every numeral inside the inner end of the longest tick, with room to spare", () => {
    const longestTickIn = Math.min(FACE.hourTickIn, FACE.minuteTickIn);
    const halfNumeral = Math.hypot((2 * DIGIT_WIDTH * FACE.font) / 2, (CAP_HEIGHT * FACE.font) / 2);
    expect(FACE.numberR + halfNumeral).toBeLessThanOrEqual(longestTickIn - 2);
    for (let n = 1; n <= 12; n++) expect(numeralReach(n)).toBeLessThanOrEqual(longestTickIn - 4);
    // and the numbers keep clear of the hub
    for (let n = 1; n <= 12; n++)
      expect(FACE.numberR - (numeralReach(n) - FACE.numberR)).toBeGreaterThan(40);
  });

  it("measures a two-digit numeral wider than a one-digit one", () => {
    expect(numeralReach(10)).toBeGreaterThan(numeralReach(9));
    expect(numeralReach(3)).toBeCloseTo(FACE.numberR + (DIGIT_WIDTH * FACE.font) / 2);
  });
});
