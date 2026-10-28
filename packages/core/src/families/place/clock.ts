import type { ClockValue, PartVerdict, PlaceData, PlaceKey, Verdict } from "@jadwigo/contracts";
import { isNum } from "../rules.ts";

/**
 * The clock judge (clock_set, dl-w3.61.5). Two parts, `h` the hour hand and `m` the minute hand,
 * each judged on its own so the marks fall on the hand that is off.
 * - The minute hand is right on the key's minute exactly (it snaps to `minute_step`).
 * - The hour hand is right within 2.5 marks of where a real clock puts it (5h + m/12): half way
 *   between two numbers, a child's hand is never exactly on the mark, and a judge that asked for it
 *   would mark a sound answer as missed. 2.5 marks is half an hour's gap.
 *
 * A missed hand takes, in this order:
 * - `hands_swapped` (both hands): the minute hand where the hour hand belongs and the hour hand
 *   within one number of the key's minute (geared, the hour hand never sits exactly on it), the common mix-up of the two hands (Burny, Valcke and Desoete 2009, on how children learn to tell the time: children
 *   confuse which hand is which before they read the minutes).
 * - `hour_hand_not_moved` (h): free hands only, the hour hand left right on the hour when the
 *   minutes should have carried it at least half way to the next.
 * - `half_past_wrong_hour` (h): at half past, the hour hand on the next hour, the trap of the
 *   Polish "wpół do ósmej" (7:30), which names 8.
 * - `minute_off_by_step` (m): the minute hand one `minute_step` off either way.
 * - else `wrong_hour` or `wrong_minute`.
 * The step's class is its first missed part's, the hour hand first.
 *
 * Ported from david-learns `frontend/src/families/place/clock.judge.ts`, with the clock geometry
 * it needs from `frontend/src/components/parts/clock.ts`.
 */

type ClockKey = Extract<PlaceKey, { surface: "clock" }>;
type ClockData = Extract<PlaceData, { surface: "clock" }>;

// The clock's geometry, from components/parts/clock.ts. Both hands are measured in minute marks
// round the face, 0 at the top and 60 marks a full turn: the minute hand sits on mark `minute`, the
// hour hand on mark `hourAt`, which may fall between marks (at 7:30 a real hour hand is half way
// from 7 to 8, mark 37.5).

interface ClockHands {
  /** The hour hand, in minute marks, 0 ≤ hourAt < 60. */
  hourAt: number;
  /** The minute hand, a whole minute, 0 to 59. */
  minute: number;
}

type Gearing = ClockData["hands"];

const MARKS = 60;

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Where a real hour hand sits at h:m (h 0 to 23; 12 and 0 are the top). */
export function hourAtOf(h: number, m: number): number {
  return mod(h, 12) * 5 + m / 12;
}

/** The hour a hand position reads as, 1 to 12: the last number the hour hand passed. Geared, the
 * minutes' share is taken off first, so the hour is exact. */
export function hourOf(hands: ClockHands, gearing: Gearing): number {
  const base = gearing === "geared" ? hands.hourAt - hands.minute / 12 : hands.hourAt;
  const h = mod(Math.floor(base / 5 + 1e-6), 12);
  return h === 0 ? 12 : h;
}

/** The shortest way round the face between two marks, 0 to 30. */
export function markDistance(a: number, b: number): number {
  const d = mod(a - b, MARKS);
  return Math.min(d, MARKS - d);
}

/** How far the hour hand may sit from a real clock's and still be right, in minute marks. */
const HOUR_TOLERANCE = 2.5;

function isClockValue(value: unknown): value is ClockValue {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const hourAt = v["hour_at"];
  const m = v["m"];
  return (
    isNum(hourAt) &&
    isNum(m) &&
    Number.isInteger(m) &&
    m >= 0 &&
    m < 60 &&
    hourAt >= 0 &&
    hourAt < 60
  );
}

export function judgeClock(key: ClockKey, value: unknown, data?: PlaceData): Verdict {
  if (!isClockValue(value)) return { correct: false, mistake_class: "other_wrong", parts: [] };
  const gearing = data?.surface === "clock" ? data.hands : "geared";
  const step = data?.surface === "clock" ? data.minute_step : 5;
  const want = hourAtOf(key.h, key.m);
  const hourRight = markDistance(value.hour_at, want) < HOUR_TOLERANCE;
  const minuteRight = value.m === mod(key.m, 60);
  const swapped =
    !hourRight &&
    !minuteRight &&
    markDistance(value.m, want) <= HOUR_TOLERANCE &&
    markDistance(value.hour_at, key.m) <= 2 * HOUR_TOLERANCE;
  const h: PartVerdict = hourRight
    ? { id: "h", correct: true, mistake_class: null }
    : {
        id: "h",
        correct: false,
        mistake_class: swapped ? "hands_swapped" : hourClass(key, value, gearing),
      };
  const m: PartVerdict = minuteRight
    ? { id: "m", correct: true, mistake_class: null }
    : {
        id: "m",
        correct: false,
        mistake_class: swapped
          ? "hands_swapped"
          : markDistance(value.m, key.m) === step
            ? "minute_off_by_step"
            : "wrong_minute",
      };
  const parts = [h, m];
  const firstWrong = parts.find((p) => !p.correct);
  return firstWrong
    ? { correct: false, mistake_class: firstWrong.mistake_class, parts }
    : { correct: true, mistake_class: null, parts };
}

function hourClass(key: ClockKey, value: ClockValue, gearing: Gearing): string {
  const onTheHour = markDistance(value.hour_at, hourAtOf(key.h, 0)) < 0.5;
  if (gearing === "free" && onTheHour && key.m >= 30) return "hour_hand_not_moved";
  const read = hourOf({ hourAt: value.hour_at, minute: value.m }, gearing);
  const next = mod(key.h, 12) + 1;
  if (key.m === 30 && (read === next || markDistance(value.hour_at, hourAtOf(next, 0)) < 0.5))
    return "half_past_wrong_hour";
  return "wrong_hour";
}

/** The clock as the key sets it: the hour hand where a real clock puts it. */
export function clockSolution(key: ClockKey): ClockValue {
  return { hour_at: hourAtOf(key.h, key.m), m: mod(key.m, 60) };
}
