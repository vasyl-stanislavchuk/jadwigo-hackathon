/**
 * Polish number and sign notation, applied when maths is drawn (dl-w3.70.23, owner 2026-10-25).
 * Khan's items are American: `1,000` (`1{,}000` in TeX), `0.5`, `12 ÷ 3`, `4 × 5`. A Polish child
 * reads the comma in 1,000 as a decimal comma, so in a Polish lesson the numbers and
 * signs are drawn the school's way: a space between thousands (1 000 000), a decimal comma (0,5),
 * `:` for division and `·` for multiplication (docs/research/khan-grades-1-and-4-polish-mapping.md,
 * "Notation that changes how an item is shown": 2017 II.2.2 prints "1 500, 10 000", the 2026 text
 * lists ":" and "·" in 5.1.m). An English lesson draws the text as it is written. The bank keeps
 * Khan's text unchanged: this runs on the way to the screen, never on a stored line.
 *
 * What is left alone: a colon (12:30 is a time, 3:4 a ratio), a digit inside a word or an id
 * (`x08`, `g1`), a list or a pair written with a comma and a space ("2, 5"), a pair in brackets
 * ("(100,200)"), a group that starts with 0 ("0,125" is already a decimal comma), and a TeX length
 * (`0.5em`). A comma between digits is a thousands separator only when exactly three digits follow
 * it, as US text writes them. Runs once per draw: the output is not input for a second pass.
 *
 * RichText reads the lesson's language from MathNotation, which StepShell and the print sheet
 * provide; with no provider the text is drawn as written.
 */

import { createContext, useContext } from "react";
import type { Language } from "../stage/types.ts";

/** The language whose notation maths is drawn in. English, the default, draws text as written. */
export const MathNotation = createContext<Language>("en");

export const useNotation = (): Language => useContext(MathNotation);

/** Whether a lesson in `language` draws numbers and signs the Polish school's way. */
const schoolNotation = (language: Language): boolean => language === "pl";

// A no-break space keeps 1 000 000 on one line; inside TeX the thin space `\,` does the same.
const NBSP = " ";

// Thousands: one to three digits not starting with 0, then groups of `,ddd`, in a number that no
// word, digit or decimal point touches. The lookahead refuses `1,0000` and `1,000,5`.
const THOUSANDS = /(?<![\w.,])([1-9]\d{0,2})((?:,\d{3})+)(?![\w]|,\d)/g;
// In TeX a macro name may run into its digit argument (`\blueD7,000`), so only a digit, point or
// comma before the number counts.
const TEX_THOUSANDS = /(?<![\d.,])([1-9]\d{0,2})((?:,\d{3})+)(?!\d|,\d)/g;
// A decimal point between digits. In text the number must not touch a word or another point
// (`v1.2`, `1.2.3`, `p1.5.png`); a full stop after it ("is 0.5.") is fine.
const DECIMAL = /(?<![\w.,])(\d+)\.(\d+)(?!\.?\w)/g;
// In TeX a length (`0.5em`) is a size, not a number.
const TEX_DECIMAL = /(?<![\d.])(\d+)\.(\d+)(?![\d.]|\s*(?:em|ex|pt|mu|px|mm|cm|in)\b)/g;
// Khan's braced thousands comma, `1{,}000`.
const TEX_BRACED_THOUSANDS = /(\d)\{,\}(?=\d{3}(?!\d))/g;

/** Whether the match at `start` to `end` is a pair in brackets, "(100,200)": left as written. */
const bracketed = (text: string, start: number, end: number): boolean =>
  text[start - 1] === "(" && text[end] === ")";

function thousands(text: string, pattern: RegExp, space: string): string {
  return text.replace(pattern, (match: string, head: string, groups: string, offset: number) =>
    bracketed(text, offset, offset + match.length) ? match : head + groups.split(",").join(space),
  );
}

/** Plain text (outside TeX) in the notation of `language`. */
export function notationText(text: string, language: Language): string {
  if (!schoolNotation(language)) return text;
  let t = thousands(text, THOUSANDS, NBSP);
  t = t.replace(DECIMAL, "$1,$2");
  return t.replace(/÷/g, ":").replace(/×/g, "·");
}

/** A TeX span (without its dollars) in the notation of `language`. */
export function notationTex(tex: string, language: Language): string {
  if (!schoolNotation(language)) return tex;
  let t = tex.replace(TEX_BRACED_THOUSANDS, "$1\\,");
  t = thousands(t, TEX_THOUSANDS, "\\,");
  // `{,}` keeps TeX from setting the comma as punctuation with a space after it.
  t = t.replace(TEX_DECIMAL, "$1{,}$2");
  // `\mathbin` spaces the colon as a sign between two numbers, as \div was spaced.
  t = t.replace(/\\div(?![A-Za-z])|÷/g, "\\mathbin{:}");
  return t.replace(/\\times(?![A-Za-z])|×/g, "\\cdot ");
}
