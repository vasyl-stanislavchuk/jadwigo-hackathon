/**
 * Letter marks (Enter addendum 3.6, dl-y3th 8b, dl-uukj.29.50): after an accent or one-letter slip
 * in a typed word, the result marks only the letters to fix, by their place in the typed text. A
 * letter is a code point with the combining marks after it, so an `o` typed with a combining acute
 * is one letter, as the eye reads it. Its part id is `l<n>`, from 0 at the first letter as typed,
 * spaces counted; inside a Gaps step it is `<gap>.l<n>`.
 *
 * Pure: the judge (families/enter/text.ts) and the fields that draw the marks (LetterMarks.tsx) share
 * it, so both count letters the same way. Nothing here sees the key.
 */

import type { PartMark } from "../stage/types.ts";

/** The letters of a text: each code point with the combining marks that follow it. */
export function letterUnits(text: string): string[] {
  return text.match(/\P{M}\p{M}*|\p{M}+/gu) ?? [];
}

const LETTER = /^l(\d+)$/;

/** The letters a result marked missed, by their place, for one field (`of` a gap's id, or none for
 * the Enter field). Empty when the result marked no letters. */
export function missedLetters(
  parts: readonly PartMark[] | undefined,
  of?: string,
): ReadonlySet<number> {
  if (parts === undefined) return NONE;
  const prefix = of === undefined ? "" : `${of}.`;
  const missed = new Set<number>();
  for (const p of parts) {
    if (p.correct || !p.id.startsWith(prefix)) continue;
    const m = LETTER.exec(p.id.slice(prefix.length));
    if (m !== null) missed.add(Number(m[1]));
  }
  return missed.size === 0 ? NONE : missed;
}

const NONE: ReadonlySet<number> = new Set();

/** The first run of marked letters as offsets into the text, [start, end), for the field's
 * selection after a miss (stepKeys.ts selectRange): the next key then replaces the slipped letter. */
export function missedRun(text: string, missed: ReadonlySet<number>): [number, number] | undefined {
  if (missed.size === 0) return undefined;
  const units = letterUnits(text);
  let at = 0;
  let start = -1;
  for (let i = 0; i < units.length; i++) {
    if (missed.has(i) && start < 0) start = at;
    else if (!missed.has(i) && start >= 0) return [start, at];
    at += units[i]?.length ?? 0;
  }
  return start >= 0 ? [start, at] : undefined;
}
