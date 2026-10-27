/**
 * Exact numbers for the typed answers (dl-w3.70.7): a decimal as a child types it, read as a
 * fraction of whole numbers, so `0,5`, `0.5`, `,5` and `0.50` are the same number and nothing is
 * ever compared as a float. A decimal is a scaled integer: `12,37` is 1237 hundredths. The views
 * read and show what was typed with these; judging it against the key is packages/core's.
 *
 * The rule follows Perseus's numeric-input scorer, read and cited, never copied
 * (https://github.com/Khan/perseus, packages/perseus-score/src/widgets/numeric-input/: a decimal
 * form takes a leading point and trailing zeros, and an answer with no tolerance must be equal).
 * The separator is the school's: a Polish child writes a comma, and a `.` typed from a hardware
 * keyboard is read the same (owner, 2026-10-25).
 */

import type { Language } from "../stage/types.ts";

/** A number as a fraction of whole numbers in lowest terms, the sign on `n`, `d` above zero. */
export interface Exact {
  n: number;
  d: number;
}

/** The separators a decimal may be typed with: the keypad's comma, or a hardware `.`. */
export const DECIMAL_SEPARATORS: readonly string[] = [",", "."];

/** The separator the keypad draws (owner, 2026-10-25: a comma key, as Polish school writes it). */
export const DECIMAL_KEY = ",";

/** The most digits a decimal may hold: the answers a grade 4 child meets have far fewer, and the
 * cap keeps every scaled integer exact. */
const MAX_DIGITS = 12;

const DECIMAL = /^(-?)([0-9]*)(?:[.,]([0-9]*))?$/;

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** n/d in lowest terms, the sign on n; null when d is 0. */
export function exact(n: number, d: number): Exact | null {
  if (d === 0 || !Number.isSafeInteger(n) || !Number.isSafeInteger(d)) return null;
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

/**
 * A decimal or whole number as typed, or null when it is not one: digits with at most one
 * separator, a comma or a point. A leading separator reads as a zero before it (`,5` is a half)
 * and trailing zeros count for nothing (`0,50`). A separator with no digit after it (`5,`) is not
 * yet a number, and neither is a lone separator. Spaces at the two ends are ignored.
 */
export function parseDecimal(text: string): Exact | null {
  const m = DECIMAL.exec(text.replace(/^\s+|\s+$/g, ""));
  if (m === null) return null;
  const [, sign, whole = "", frac] = m;
  if (
    frac === "" ||
    (whole === "" && frac === undefined) ||
    whole.length + (frac ?? "").length > MAX_DIGITS
  )
    return null;
  const places = frac?.length ?? 0;
  const scaled = Number.parseInt(`${whole}${frac ?? ""}` || "0", 10);
  return exact(sign === "-" ? -scaled : scaled, 10 ** places);
}

/** Whether two exact numbers are the same number. */
export function sameExact(a: Exact, b: Exact): boolean {
  return a.n === b.n && a.d === b.d;
}

/** Whether a typed decimal is still being written: it ends in its separator (`5,`). */
export function unfinishedDecimal(text: string): boolean {
  const t = text.trim();
  return t !== "" && DECIMAL_SEPARATORS.includes(t.at(-1) ?? "");
}

/** How many separators a typed number holds: the keypad takes one. */
export function separatorCount(text: string): number {
  return [...text].filter((ch) => DECIMAL_SEPARATORS.includes(ch)).length;
}

/** A key's decimal as the learner's language writes it: `0,29` in Polish, `0.29` in
 * English (owner, 2026-10-25). Only for showing a key; what a learner typed is shown as typed. */
export function decimalShown(text: string, language: Language): string {
  return language === "en" ? text.replace(",", ".") : text.replace(".", ",");
}

/** The forms a typed number may take, as Perseus names them (numeric-input `answerForms`). */
export type NumberForm = "integer" | "proper" | "improper" | "mixed" | "decimal";

export const NUMBER_FORMS: readonly NumberForm[] = [
  "integer",
  "proper",
  "improper",
  "mixed",
  "decimal",
];

/** A fraction as typed into the stacked boxes (dl-w3.70.16): its value, its form, and whether it
 * is in lowest terms (a mixed number's fraction part also below one). */
export interface ReadFraction {
  value: Exact;
  form: NumberForm;
  simplified: boolean;
}

const WHOLE = /^[0-9]+$/;
const FRACTION = /^(?:([0-9]+) )?([0-9]+)\/([0-9]+)$/;

/** A whole number (`3`), a fraction (`3/4`, `5/4`) or a mixed number (`2 1/4`), or null when the
 * text is none of these or its denominator is 0. Spaces at the two ends are ignored. */
export function parseFraction(text: string): ReadFraction | null {
  const t = text.replace(/^\s+|\s+$/g, "");
  if (WHOLE.test(t) && t.length <= MAX_DIGITS)
    return { value: { n: Number.parseInt(t, 10), d: 1 }, form: "integer", simplified: true };
  const m = FRACTION.exec(t);
  if (m === null || t.length > MAX_DIGITS + 2) return null;
  const [, w, a = "", b = ""] = m;
  const num = Number.parseInt(a, 10);
  const den = Number.parseInt(b, 10);
  if (den === 0) return null;
  const lowest = gcd(num, den) === 1;
  if (w === undefined)
    return {
      value: exact(num, den) as Exact,
      form: num < den ? "proper" : "improper",
      simplified: lowest,
    };
  const whole = Number.parseInt(w, 10);
  return {
    value: exact(whole * den + num, den) as Exact,
    form: "mixed",
    simplified: lowest && num > 0 && num < den,
  };
}

/** Whether a typed number's form is one the key accepts: any, when the key names none. */
export function formAllowed(forms: readonly NumberForm[] | undefined, form: NumberForm): boolean {
  return forms === undefined || forms.length === 0 || forms.includes(form);
}
