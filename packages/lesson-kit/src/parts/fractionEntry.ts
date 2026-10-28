/**
 * Part: a fraction typed into stacked boxes (dl-w3.70.16), the numerator over a bar over the
 * denominator, with a box for the whole number in front of a mixed number, as a Polish notebook
 * writes it (owner, 2026-10-25). The keypad types into one box at a time.
 *
 * The answer is one string so it is stored, judged and shown like every typed answer: `3/4`, a
 * mixed number `2 1/4` (a space after the whole number), a whole number alone `3`. An empty box
 * stays empty in the string (`3/` while the denominator is still to come), so the boxes and the
 * string always say the same thing, and nothing the child typed is lost or reordered.
 */

/** The three boxes, in the order a child writes a mixed number. */
export type FractionBox = "whole" | "num" | "den";

export interface FractionBoxes {
  whole: string;
  num: string;
  den: string;
}

/** The most digits one box takes: a grade 4 fraction has at most three. */
const BOX_DIGITS = 3;

/** The longest string the boxes make: three boxes, a space and a bar. */
export const FRACTION_MAX = 3 * BOX_DIGITS + 2;

/** The boxes a string holds. Text with no bar is the whole number alone. */
export function boxesOf(text: string): FractionBoxes {
  const bar = text.indexOf("/");
  if (bar < 0) return { whole: text, num: "", den: "" };
  const left = text.slice(0, bar);
  const space = left.indexOf(" ");
  return space < 0
    ? { whole: "", num: left, den: text.slice(bar + 1) }
    : { whole: left.slice(0, space), num: left.slice(space + 1), den: text.slice(bar + 1) };
}

/** The string the boxes make: the bar once either part of the fraction holds a digit. */
export function textOf(b: FractionBoxes): string {
  const fraction = b.num !== "" || b.den !== "";
  if (!fraction) return b.whole;
  return `${b.whole}${b.whole !== "" ? " " : ""}${b.num}/${b.den}`;
}

/** Whether some box holds a digit and another the step needs is still empty: `3/`, `/4`, `2 3/`. */
export function halfFraction(text: string): boolean {
  const b = boxesOf(text);
  return (b.num === "") !== (b.den === "");
}

/** The box before `box`, for a backspace in an empty box; null at the first. */
function before(box: FractionBox, whole: boolean): FractionBox | null {
  if (box === "den") return "num";
  if (box === "num") return whole ? "whole" : null;
  return null;
}

/**
 * One key into the boxes: a digit goes into `box` while it has room; a backspace takes the last
 * digit of `box`, or, when `box` is already empty, moves back one box and takes its last digit.
 * The text and the box that has the focus after the key.
 */
export function typeInto(
  text: string,
  box: FractionBox,
  key: { digit: string } | "backspace",
  whole: boolean,
): { text: string; box: FractionBox } {
  const b = boxesOf(text);
  if (key === "backspace") {
    if (b[box] === "") {
      const back = before(box, whole);
      if (back === null) return { text, box };
      return { text: textOf({ ...b, [back]: b[back].slice(0, -1) }), box: back };
    }
    return { text: textOf({ ...b, [box]: b[box].slice(0, -1) }), box };
  }
  if (!/^[0-9]$/.test(key.digit) || b[box].length >= BOX_DIGITS) return { text, box };
  return { text: textOf({ ...b, [box]: b[box] + key.digit }), box };
}

/** The box the keypad starts in: the whole number when there is one, else the numerator. */
export const firstBox = (whole: boolean): FractionBox => (whole ? "whole" : "num");

/** The text with one box emptied: a selected box after a miss, which the next key replaces and a
 * backspace clears (paper-behaviour README §3.5). */
export function clearBox(text: string, box: FractionBox): string {
  return textOf({ ...boxesOf(text), [box]: "" });
}
