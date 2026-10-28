import type {
  EnterData,
  EnterInput,
  EnterKey,
  EnterValue,
  Figure,
  PartMark,
  PartVerdict,
  Simplify,
  Verdict,
} from "@jadwigo/contracts";
import {
  exact,
  formAllowed,
  parseDecimal,
  parseFraction,
  parseKeyNumber,
  sameExact,
  within,
} from "../exact.ts";
import { letterId, letterUnits } from "../letters.ts";
import { applyRule } from "../rules.ts";
import {
  type Expr,
  formOf,
  isEquation,
  parseEquation,
  parseExpression,
  sameTerms,
  sameValue,
} from "./expression.ts";
import { slippedLetters, textClass, textMatches } from "./text.ts";

/**
 * The Enter judge, also used for every typed gap in Gaps.
 *
 * A number is right when its digits read as an accepted whole number, within the key's tolerance
 * (a leading minus is allowed, `07` reads as 7). A decimal (dl-w3.70.7, enter/exact.ts) is read
 * exactly, with a comma or a point: `0,5`, `0.5`, `,5` and `0,50` are all a half. A fraction
 * (dl-w3.70.16), typed in stacked boxes as `3/4` or `2 1/4`, is right when it is the same number,
 * in a form the key takes (`forms`, Khan's strict `answerForms`), and in lowest terms where the step
 * enforces it. Its misses: `wrong_form` (the right number as an improper fraction where a mixed
 * number is asked), `unsimplified` (only under `simplify: enforced`), `fraction_flipped`. Text is right when it equals an accepted form after
 * the spaces at its two ends, runs of spaces and a final `.`, `!` or `?` (dl-w3.68.1); case and
 * accents count unless the key says `ignore`, and a miss is
 * `missing_diacritics`, `wrong_case`, the author's near class or `typo` (enter/text.ts, dl-w3.61.2). An expression (dl-w3.51.1)
 * is right when it parses and has the value of an accepted form, and the form the key asks for:
 * `5×2` is the product `2×5`, `2+2+2+2+2` is not. A miss takes the author's `near` class for that
 * exact entry, then the key's number rule, else `other_wrong`. An expression miss has its own
 * classes: `not_an_expression` (it does not parse), `sum_for_product` and `product_for_sum` (the
 * other operation), `number_for_expression` (the result typed where an expression was asked),
 * `wrong_form` (another shape), then `value_off`. An empty entry is never right. An equation key
 * (dl-w3.70.17, `6=2×3`) asks for each side's terms, a product's factors in either order, and the
 * sides either way round (`2×3=6` too, Enter addendum 3.7, dl-y3th): a right equation written the
 * other way round carries `sides_swapped` on its verdict, so the band can show the question's form.
 * A key with `sides: 'kept'` keeps them where the question put them, and the other way round is
 * then the miss `equation_sides_swapped`. Its misses add `not_an_equation`.
 *
 * A fraction under `simplify: 'required'` is judged first: an equal fraction not in lowest terms is
 * right, and the page then asks for it more simply before it is recorded. v0 has no such ask on
 * the wire, so the playground's enterNudge is not ported.
 *
 * A text miss that is an accent or a one-letter slip (Enter addendum 3.6, dl-y3th 8b, which settles
 * dl-uukj.29.50) carries one part per letter of the entry as typed, `l0` to `ln`: the slipped letters
 * missed with the word's class, every other letter right. The step's class stays the word's. The
 * page is told which letters to mark only with this verdict, after the miss (ruling 05).
 *
 * A number read off a ruler (dl-w3.51.4, a `ruler` figure) takes the key's tolerance, or half a
 * unit on a centimetre ruler and one on a millimetre ruler when the key names none. Its misses:
 * `off_by_one_unit` (one mark too many or too few, the zero end or the count), `unit_mixed`
 * (millimetres for centimetres or the other way), else `other_wrong`.
 */

const NUMBER = /^-?[0-9]+$/;

/** What a step's data tells the judge: the input kind, for a measurement the ruler, and for a
 * fraction its rule on lowest terms. */
type EnterJudged = Pick<EnterData, "input" | "figure" | "simplify">;

type Ruler = Extract<Figure, { kind: "ruler" }>;

const RULER_TOLERANCE = { cm: 0.5, mm: 1 };

/** The tolerance a number is judged within: the key's, else the ruler's unit's, else none. */
function toleranceOf(key: Pick<EnterKey, "tolerance">, figure?: Figure): number {
  if (key.tolerance !== undefined) return key.tolerance;
  return figure?.kind === "ruler" ? RULER_TOLERANCE[figure.unit] : 0;
}

/** The class of a measurement the key did not name: one unit off, or the other unit. */
function measureClass(key: EnterKey, entered: string, figure: Ruler): string | null {
  const v = entered.replace(/^\s+|\s+$/g, "");
  if (!NUMBER.test(v)) return null;
  const n = Number.parseInt(v, 10);
  const target = Number.parseInt(key.accept[0] ?? "", 10);
  const tolerance = toleranceOf(key, figure);
  if (Math.abs(n - target) <= 1 + tolerance) return "off_by_one_unit";
  const other = figure.unit === "cm" ? target * 10 : target / 10;
  if (Math.abs(n - other) <= tolerance * 10 + 1) return "unit_mixed";
  return null;
}

function readEntered(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const entered = (value as { entered?: unknown }).entered;
  return typeof entered === "string" ? entered : null;
}

const trimEnds = (s: string): string => s.replace(/^\s+|\s+$/g, "");

/** Whether an expression has the form the key asks for; a key with no form takes any. */
function hasForm(key: Pick<EnterKey, "form">, e: Expr): boolean {
  return key.form === undefined || key.form === "any" || formOf(e) === key.form;
}

/**
 * A fraction entry against one accepted value (dl-w3.70.16): the same number exactly, in a form
 * the key accepts, and in lowest terms when the step enforces it. `required` lowest terms is the
 * page's to ask for before the answer is committed (complete.ts), so it never makes a miss here.
 */
function fractionMatches(
  key: Pick<EnterKey, "forms" | "exact_terms">,
  accept: string,
  entered: string,
  simplify?: Simplify,
): boolean {
  const mine = parseFraction(entered);
  const theirs = parseKeyNumber(accept);
  if (mine === null || theirs === null || !sameExact(mine.value, theirs)) return false;
  if (key.exact_terms) return trimEnds(entered).replace(/\s+/g, " ") === accept.trim();
  return formAllowed(key.forms, mine.form) && (simplify !== "enforced" || mine.simplified);
}

/** The class of a missed fraction: the right number in a form the key does not take, or not in
 * lowest terms where that is enforced; the fraction turned upside down; else none. */
function fractionClass(key: EnterKey, entered: string): string | null {
  const mine = parseFraction(entered);
  if (mine === null) return null;
  const values = key.accept.map(parseKeyNumber).filter((v) => v !== null);
  if (values.some((v) => sameExact(v, mine.value)))
    return formAllowed(key.forms, mine.form) && !key.exact_terms ? "unsimplified" : "wrong_form";
  const flipped = mine.value.n === 0 ? null : exact(mine.value.d, mine.value.n);
  if (flipped !== null && values.some((v) => sameExact(v, flipped))) return "fraction_flipped";
  return null;
}

/** Whether one entry matches one accepted form. */
export function matchesForm(
  input: EnterInput,
  key: Pick<
    EnterKey,
    "case" | "accents" | "typo" | "tolerance" | "form" | "forms" | "exact_terms" | "sides"
  >,
  accept: string,
  entered: string,
  figure?: Figure,
  simplify?: Simplify,
): boolean {
  if (input === "fraction") return fractionMatches(key, accept, entered, simplify);
  if (input === "number") {
    const v = trimEnds(entered);
    if (NUMBER.test(v) && NUMBER.test(accept))
      return (
        Math.abs(Number.parseInt(v, 10) - Number.parseInt(accept, 10)) <= toleranceOf(key, figure)
      );
    // A decimal (dl-w3.70.7): both sides read exactly, as scaled integers, never as floats.
    const mine = parseDecimal(v);
    const theirs = parseDecimal(accept);
    return mine !== null && theirs !== null && within(mine, theirs, toleranceOf(key, figure));
  }
  if (input === "expression" && isEquation(accept)) {
    // An equation (dl-w3.70.17): each side has the key's terms, a product's factors in either
    // order (6 = 3×2 for 6 = 2×3), and the sides either way round (Enter addendum 3.7, which
    // replaces the owner's 2026-10-25 rule) unless the key keeps them.
    const mine = parseEquation(entered);
    const theirs = parseEquation(accept);
    if (mine === null || theirs === null) return false;
    if (sameTerms(mine.left, theirs.left) && sameTerms(mine.right, theirs.right)) return true;
    return key.sides !== "kept" && sidesSwapped(entered, accept);
  }
  if (input === "expression") {
    const mine = parseExpression(entered);
    const theirs = parseExpression(accept);
    return mine !== null && theirs !== null && sameValue(mine, theirs) && hasForm(key, mine);
  }
  return textMatches(key, accept, entered);
}

/** Whether an equation has the accepted one's sides the other way round (2×3=6 for 6=2×3). */
function sidesSwapped(entered: string, accept: string): boolean {
  const mine = parseEquation(entered);
  const theirs = parseEquation(accept);
  if (mine === null || theirs === null) return false;
  // An equation the same either way round (2×3=3×2) is not swapped.
  if (sameTerms(mine.left, theirs.left) && sameTerms(mine.right, theirs.right)) return false;
  return sameTerms(mine.left, theirs.right) && sameTerms(mine.right, theirs.left);
}

/** The class of a missed equation: not one equation, its sides the other way round where the key
 * keeps them, the side that is asked for in another shape (a sum for the product), other terms of
 * the right value, then another value. */
function equationClass(key: EnterKey, entered: string): string {
  const mine = parseEquation(entered);
  const theirs = parseEquation(key.accept[0] ?? "");
  if (mine === null || theirs === null)
    return isEquation(entered) ? "not_an_expression" : "not_an_equation";
  if (sameTerms(mine.left, theirs.right) && sameTerms(mine.right, theirs.left))
    return "equation_sides_swapped";
  for (const side of ["left", "right"] as const) {
    if (sameTerms(mine[side], theirs[side])) continue;
    const got = formOf(mine[side]);
    const want = formOf(theirs[side]);
    if (got === "sum" && want === "product") return "sum_for_product";
    if (got === "product" && want === "sum") return "product_for_sum";
    if (got === "number" && want !== "number") return "number_for_expression";
    return sameValue(mine[side], theirs[side]) ? "wrong_form" : "value_off";
  }
  return "value_off";
}

/** The class of a missed expression: the shape first, then the value. */
function expressionClass(key: EnterKey, entered: string): string {
  if (isEquation(key.accept[0] ?? "")) return equationClass(key, entered);
  const mine = parseExpression(entered);
  if (mine === null) return "not_an_expression";
  if (!hasForm(key, mine)) {
    const form = formOf(mine);
    if (form === "number") return "number_for_expression";
    if (form === "sum" && key.form === "product") return "sum_for_product";
    if (form === "product" && key.form === "sum") return "product_for_sum";
    return "wrong_form";
  }
  return "value_off";
}

/** The class of a missed entry, or null when neither the author nor a rule names one. */
export function enterClass(
  input: EnterInput,
  key: EnterKey,
  entered: string,
  figure?: Figure,
): string | null {
  // Text (dl-w3.61.2): accents, case, the author's near forms, then a one-letter slip (enter/text.ts).
  if (input === "text") return textClass(key, entered);
  const typed = trimEnds(entered);
  const authored =
    key.near !== undefined && Object.hasOwn(key.near, typed) ? key.near[typed] : undefined;
  if (authored !== undefined) return authored;
  // A number rule reasons about whole numbers; a decimal key takes the author's near forms only.
  const first = key.accept[0] ?? "";
  if (input === "number" && key.rule !== undefined && NUMBER.test(first)) {
    const v = trimEnds(entered);
    const n = NUMBER.test(v) ? Number.parseInt(v, 10) : v;
    const cls = applyRule(key.rule, n, Number.parseInt(first, 10), toleranceOf(key, figure));
    if (cls !== "other_wrong") return cls;
  }
  if (input === "number" && figure?.kind === "ruler") return measureClass(key, entered, figure);
  if (input === "expression") return expressionClass(key, entered);
  if (input === "fraction") return fractionClass(key, entered);
  return null;
}

function judgeEntry(
  input: EnterInput,
  key: EnterKey,
  entered: string,
  figure?: Figure,
  simplify?: Simplify,
): Verdict {
  if (
    trimEnds(entered) !== "" &&
    key.accept.some((a) => matchesForm(input, key, a, entered, figure, simplify))
  ) {
    // A right equation the other way round from the question's form (Enter addendum 3.7): the
    // band's second line can give that form, from the key, after the verdict.
    const swapped =
      input === "expression" &&
      isEquation(entered) &&
      !key.accept.some(
        (a) => isEquation(a) && matchesForm(input, { ...key, sides: "kept" }, a, entered),
      );
    return swapped
      ? { correct: true, mistake_class: null, parts: [], sides_swapped: true }
      : { correct: true, mistake_class: null, parts: [] };
  }
  const cls = enterClass(input, key, entered, figure) ?? "other_wrong";
  return {
    correct: false,
    mistake_class: cls,
    parts: input === "text" ? letterParts(key, entered, cls) : [],
  };
}

/** One part per letter of a text entry after an accent or one-letter slip (`l0` to `ln`, or
 * `<gap>.l<n>` in a gap): the slipped letters missed with the word's class, the rest right. Empty
 * for any other miss, which marks the field as a whole. */
export function letterParts(
  key: EnterKey,
  entered: string,
  cls: string | null,
  of?: string,
): PartVerdict[] {
  const slipped = slippedLetters(key, entered, cls);
  if (slipped === null) return [];
  return letterUnits(entered).map((_, n) =>
    slipped.includes(n)
      ? { id: letterId(n, of), correct: false, mistake_class: cls }
      : { id: letterId(n, of), correct: true, mistake_class: null },
  );
}

/** What the page is told after an Enter miss: the letters to mark after a slip, else null for the
 * whole field (families/judge.ts pageMarks). Right or missed only, never the class. */
export function enterMarks(verdict: Verdict): PartMark[] | null {
  if (verdict.correct || verdict.parts.length === 0) return null;
  return verdict.parts.map(({ id, correct }) => ({ id, correct }));
}

export function judgeEnter(data: EnterJudged, key: EnterKey, value: unknown): Verdict {
  const entered = readEntered(value);
  if (entered === null) return { correct: false, mistake_class: "other_wrong", parts: [] };
  return judgeEntry(data.input, key, entered, data.figure, data.simplify);
}

export function enterSolution(key: EnterKey): EnterValue {
  return { entered: key.accept[0] ?? "" };
}
