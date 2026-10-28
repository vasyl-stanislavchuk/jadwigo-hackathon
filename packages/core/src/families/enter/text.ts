import type { EnterKey } from "@jadwigo/contracts";
import { letterUnits } from "../letters.ts";

/**
 * Short text (dl-w3.28, dl-w3.61.2): how a typed word is compared with its accepted forms, and what
 * a near miss shows. The typed text is never changed: it is stored as typed, and every folding below
 * happens only inside the comparison.
 *
 * A miss is classified in this order (docs/18 short_text):
 * 1. The author's `near` class for that exact entry.
 * 2. `missing_diacritics`: right once the accents are taken off both sides (`czterdziesci` for
 *    `czterdzieści`). With `accents: 'ignore'` this is right.
 * 3. `wrong_case`: right once case is folded, when the key keeps case.
 * 4. `typo`: one letter added, dropped, changed or two swapped, against an accepted form of four or
 *    more letters (a shorter word changes meaning with one letter: `sum`, `sun`). With
 *    `typo: 'accept'` this is right.
 *
 * The author's near class comes first (design.md put it after the other three): a form the author
 * listed before the task is the stronger evidence, and a lesson that lists `Update` as a form error
 * keeps that class.
 *
 * Both sides are compared in Unicode NFC (dl-r772.12, UAX #15): `ó` typed as `o` plus a combining
 * accent is the same letter as the one-character `ó`. NFC is a comparison form, not a correction:
 * it changes no letter, and the entry is stored exactly as typed (never normalize a transcript).
 *
 * A phrase or a short sentence (dl-w3.68.1) is compared with every run of spaces read as one space
 * and a final `.`, `!` or `?` left out, on both sides: `Ala  ma kota.` is `Ala ma kota`. These are
 * comparison forms too, never stored, and they fold only what a sentence's meaning and spelling do
 * not hang on. Nothing folds toward the expected answer.
 *
 * After an accent or one-letter slip, `slippedLetters` names the letters to fix by their place in
 * the text as typed (Enter addendum 3.6, dl-y3th 8b): only those are marked, and the class stays the
 * whole word's. A dropped letter has no letter of its own, so the one now standing in its place is
 * marked (the last letter when the end was dropped).
 *
 * After a right answer, `otherForm` names the first accepted form the entry did not match, so the
 * child sees once that it could also be written that way (handoff-language-questions §L1).
 */

/** The shortest accepted form a one-letter slip is counted against. */
const TYPO_MIN_LENGTH = 4;

const trimEnds = (s: string): string => s.replace(/^\s+|\s+$/g, "");

/** The form a text is compared in: the ends trimmed, runs of spaces folded to one, one final `.`,
 * `!` or `?` left out, then NFC. Only for comparing, never stored. */
const comparable = (s: string): string =>
  trimEnds(
    trimEnds(s)
      .replace(/\s+/g, " ")
      .replace(/[.!?]$/, ""),
  ).normalize("NFC");

/** The author's near class for an entry, its forms compared in NFC too. */
function nearClass(key: Pick<EnterKey, "near">, entry: string): string | undefined {
  if (key.near === undefined) return undefined;
  return Object.entries(key.near).find(([form]) => comparable(form) === entry)?.[1];
}

/** Letters with their accents taken off: NFD, combining marks dropped, and the Polish ł (which has
 * no decomposition) read as l. */
export function foldAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .normalize("NFC");
}

/** Whether two strings are at most one edit apart: one letter added, dropped or changed, or two
 * neighbours swapped (Damerau). Compared by code point. */
export function oneEditApart(a: string, b: string): boolean {
  const x = [...a];
  const y = [...b];
  if (Math.abs(x.length - y.length) > 1) return false;
  if (x.length === y.length) {
    const diff: number[] = [];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) diff.push(i);
    if (diff.length <= 1) return true;
    const [i, j] = diff;
    return (
      diff.length === 2 &&
      i !== undefined &&
      j !== undefined &&
      j === i + 1 &&
      x[i] === y[j] &&
      x[j] === y[i]
    );
  }
  const [long, short] = x.length > y.length ? [x, y] : [y, x];
  let i = 0;
  while (i < short.length && long[i] === short[i]) i++;
  return long.slice(i + 1).join("") === short.slice(i).join("");
}

type TextKey = Pick<EnterKey, "case" | "accents" | "typo">;

const caseFold = (key: TextKey, s: string): string => (key.case === "ignore" ? s.toLowerCase() : s);
const accentFold = (key: TextKey, s: string): string =>
  key.accents === "ignore" ? foldAccents(s) : s;
/** What the key itself ignores: case when it says so, accents when it says so. */
const keyFold = (key: TextKey, s: string): string => accentFold(key, caseFold(key, comparable(s)));

/** Whether one slip away from this accepted form counts: a form long enough, and one edit apart
 * after what the key folds anyway. */
function isTypo(key: TextKey, accept: string, entered: string): boolean {
  const a = keyFold(key, accept);
  const e = keyFold(key, entered);
  return [...a].length >= TYPO_MIN_LENGTH && a !== e && oneEditApart(a, e);
}

/** Whether a typed text matches one accepted form: the ends trimmed, case and accents folded where
 * the key says, and a one-letter slip taken when the key says `typo: 'accept'`. */
export function textMatches(key: TextKey, accept: string, entered: string): boolean {
  if (keyFold(key, accept) === keyFold(key, entered)) return true;
  return key.typo === "accept" && isTypo(key, accept, entered);
}

/** The accepted form a right entry did not match, to show after it (dl-w3.68.1): the first such form
 * in the key's order, as written there, or null when the entry is not right or matched them all. */
export function otherForm(
  key: Pick<EnterKey, "accept" | "case" | "accents" | "typo">,
  entered: string,
): string | null {
  if (comparable(entered) === "" || !key.accept.some((a) => textMatches(key, a, entered)))
    return null;
  return key.accept.find((a) => !textMatches(key, a, entered)) ?? null;
}

/** The class of a missed text, or null when none of the text classes fits. */
export function textClass(key: EnterKey, entered: string): string | null {
  const e = comparable(entered);
  if (e === "") return null;
  const authored = nearClass(key, e);
  if (authored !== undefined) return authored;
  const accepts = key.accept.map(comparable);
  if (accepts.some((a) => foldAccents(caseFold(key, a)) === foldAccents(caseFold(key, e))))
    return "missing_diacritics";
  if (
    key.case !== "ignore" &&
    accepts.some((a) => accentFold(key, a.toLowerCase()) === accentFold(key, e.toLowerCase()))
  )
    return "wrong_case";
  if (accepts.some((a) => isTypo(key, a, e))) return "typo";
  return null;
}

/** A text as compared, one letter at a time (letterUnits), each with its place in the text as
 * typed: the same folding as `comparable`, so the places survive spaces at the ends, runs of spaces
 * and a final `.`, `!` or `?`. */
function comparableLetters(s: string): { letters: string[]; at: number[] } {
  const units = letterUnits(s);
  const unit = (i: number): string => units[i] ?? "";
  const space = (u: string) => /^\s$/u.test(u);
  let from = 0;
  let to = units.length;
  while (from < to && space(unit(from))) from++;
  while (to > from && space(unit(to - 1))) to--;
  if (to > from && /^[.!?]$/.test(unit(to - 1))) to--;
  while (to > from && space(unit(to - 1))) to--;
  const letters: string[] = [];
  const at: number[] = [];
  for (let i = from; i < to; i++) {
    if (space(unit(i))) {
      if (space(unit(i - 1))) continue;
      letters.push(" ");
    } else letters.push(unit(i).normalize("NFC"));
    at.push(i);
  }
  return { letters, at };
}

/** The places, in the text as typed, of the letters that differ between two letter lists of one
 * edit apart (a change, two neighbours swapped, one added or one dropped), or null. */
function editPlaces(a: readonly string[], e: readonly string[]): number[] | null {
  if (e.length === a.length) {
    const diff: number[] = [];
    for (let i = 0; i < e.length; i++) if (e[i] !== a[i]) diff.push(i);
    return diff.length > 0 && diff.length <= 2 ? diff : null;
  }
  if (Math.abs(e.length - a.length) !== 1 || e.length === 0) return null;
  let i = 0;
  while (i < Math.min(a.length, e.length) && e[i] === a[i]) i++;
  // One added: the extra letter. One dropped: the letter now in its place, or the last one.
  return [Math.min(i, e.length - 1)];
}

/**
 * The letters to mark after a `missing_diacritics` or `typo` miss: their places in the entry as
 * typed (0 at its first letter, letterUnits), against the first accepted form that miss was judged
 * against. Null for any other class, or when the slip cannot be placed.
 */
export function slippedLetters(
  key: EnterKey,
  entered: string,
  cls: string | null,
): number[] | null {
  if (cls !== "missing_diacritics" && cls !== "typo") return null;
  const mine = comparableLetters(entered);
  const typed = (i: number): number[] => {
    const place = mine.at[i];
    return place === undefined ? [] : [place];
  };
  const fold = (u: string) =>
    cls === "missing_diacritics" ? caseFold(key, u) : accentFold(key, caseFold(key, u));
  const e = mine.letters.map(fold);
  for (const accept of key.accept) {
    const a = comparableLetters(accept).letters.map(fold);
    if (cls === "missing_diacritics") {
      if (
        a.length !== e.length ||
        a.map((u) => foldAccents(u)).join("") !== e.map((u) => foldAccents(u)).join("")
      )
        continue;
      const places = e.flatMap((u, i) => (u === a[i] ? [] : typed(i)));
      if (places.length > 0) return places;
      continue;
    }
    if (!isTypo(key, accept, entered)) continue;
    const places = editPlaces(a, e);
    if (places !== null) return places.flatMap(typed);
  }
  return null;
}
