/**
 * A clock's geometry, for the ClockFace part (dl-w3.61.5). Both hands are measured in minute marks
 * round the face, 0 at the top and 60 marks a full turn: the minute hand sits on mark `minute`, the
 * hour hand on mark `hourAt`, which may fall between marks (at 7:30 a real hour hand is half way
 * from 7 to 8, mark 37.5).
 *
 * Two ways the hands move, a playground switch until the owner and the teacher pick (clock_hands):
 * - geared, as on a real clock and a classroom teaching clock: the hour hand always sits where the
 *   minutes put it. Moving the minute hand past 12 carries the hour on or back, and setting the
 *   hour hand picks the hour while the minutes stay.
 * - free: each hand moves on its own, the hour hand to any whole mark. The child has to place the
 *   hour hand between the numbers, which is the very thing the Polish "wpół do ósmej" asks.
 */

export interface ClockHands {
  /** The hour hand, in minute marks, 0 ≤ hourAt < 60. */
  hourAt: number;
  /** The minute hand, a whole minute, 0 to 59. */
  minute: number;
}

export type Hand = "h" | "m";
export type Gearing = "geared" | "free";

const MARKS = 60;

export const mod = (a: number, n: number): number => ((a % n) + n) % n;

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

/** The mark under a point, from its offset from the face's centre (y grows downwards). */
export function marksAt(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0;
  return mod((Math.atan2(dx, -dy) / (2 * Math.PI)) * MARKS, MARKS);
}

/** The minute nearest a mark that the minute hand may take, every `step` minutes. */
export function snapMinute(marks: number, step: number): number {
  return mod(Math.round(marks / step) * step, MARKS);
}

/** The minute hand moved to `minute`. Geared, the hour hand follows, and crossing 12 the short way
 * carries the hour on (55 → 0) or back (0 → 55), as the hands of a real clock do. */
export function setMinute(hands: ClockHands, minute: number, gearing: Gearing): ClockHands {
  if (gearing === "free") return { ...hands, minute };
  const h = hourOf(hands, "geared");
  const delta = minute - hands.minute;
  const next = delta < -30 ? h + 1 : delta > 30 ? h - 1 : h;
  return { hourAt: hourAtOf(next, minute), minute };
}

/** The hour hand moved towards `marks`. Geared, it takes the nearest hour its minutes allow; free,
 * the nearest whole mark. */
export function setHour(hands: ClockHands, marks: number, gearing: Gearing): ClockHands {
  if (gearing === "free") return { ...hands, hourAt: mod(Math.round(marks), MARKS) };
  const h = Math.round((marks - hands.minute / 12) / 5);
  return { ...hands, hourAt: hourAtOf(h, hands.minute) };
}

/** One step by the keyboard: the minute hand by `step` minutes, the hour hand by an hour when
 * geared and by one mark when free. */
export function nudgeHand(
  hands: ClockHands,
  hand: Hand,
  by: 1 | -1,
  step: number,
  gearing: Gearing,
): ClockHands {
  if (hand === "m")
    return setMinute(hands, mod(snapMinute(hands.minute, step) + by * step, MARKS), gearing);
  if (gearing === "geared")
    return { ...hands, hourAt: hourAtOf(hourOf(hands, "geared") + by, hands.minute) };
  return { ...hands, hourAt: mod(Math.round(hands.hourAt) + by, MARKS) };
}

/** The shortest way round the face between two marks, 0 to 30. */
export function markDistance(a: number, b: number): number {
  const d = mod(a - b, MARKS);
  return Math.min(d, MARKS - d);
}

/** The number on the face a hand points at, or the two it sits between. */
export function faceNumbers(marks: number): { at: number } | { from: number; to: number } {
  const n = (k: number) => (mod(k, 12) === 0 ? 12 : mod(k, 12));
  const exact = Math.round(marks / 5);
  if (Math.abs(marks / 5 - exact) < 1e-6) return { at: n(exact) };
  const from = Math.floor(marks / 5);
  return { from: n(from), to: n(from + 1) };
}

/** A point at `marks` round the face, `r` from the centre, in the face's own units. */
export function pointAt(marks: number, r: number, centre: number): { x: number; y: number } {
  const a = (marks / MARKS) * 2 * Math.PI;
  return { x: centre + r * Math.sin(a), y: centre - r * Math.cos(a) };
}

/**
 * The face's own units (ClockFace draws in a 200 by 200 viewBox, so every size it renders at keeps
 * these proportions). The numerals sit well inside the hour ticks: a numeral's box, measured along
 * the line from the centre, ends `NUMERAL_GAP` short of the inner end of the longest tick.
 */
export const FACE = {
  size: 200,
  rim: 94,
  /** Where every tick starts, in from the rim. */
  tickOut: 91,
  /** The inner end of an hour tick (the longest) and of a minute tick. */
  hourTickIn: 81,
  minuteTickIn: 87,
  numberR: 64,
  font: 17,
  minuteLen: 80,
  hourLen: 48,
} as const;

/** A bold tabular digit is about 0.6 of the font size wide, and its cap height about 0.72. */
export const DIGIT_WIDTH = 0.6;
export const CAP_HEIGHT = 0.72;

/** How far numeral `n` (1 to 12) reaches from the centre: its centre at `numberR` plus the half of
 * its box that lies along the line from the centre. */
export function numeralReach(
  n: number,
  numberR: number = FACE.numberR,
  font: number = FACE.font,
): number {
  const a = (n / 12) * 2 * Math.PI;
  const halfW = (String(n).length * DIGIT_WIDTH * font) / 2;
  const halfH = (CAP_HEIGHT * font) / 2;
  return numberR + halfW * Math.abs(Math.sin(a)) + halfH * Math.abs(Math.cos(a));
}
