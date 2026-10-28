/**
 * Letter marks (Enter addendum 3.6): after an accent or one-letter slip in a typed word, the
 * verdict marks only the letters to fix, by their place in the typed text. A letter is a code
 * point with the combining marks after it, so an `o` typed with a combining acute is one letter, as
 * the eye reads it. Its part id is `l<n>`, from 0 at the first letter as typed, spaces counted;
 * inside a gap it is `<gap>.l<n>`. Only the judge's half is here; drawing the letters is the
 * page's.
 */

/** The letters of a text: each code point with the combining marks that follow it. */
export function letterUnits(text: string): string[] {
  return text.match(/\P{M}\p{M}*|\p{M}+/gu) ?? [];
}

/** A letter's part id: `l3`, or `g1.l3` for a gap's. */
export const letterId = (n: number, of?: string): string =>
  of === undefined ? `l${n}` : `${of}.l${n}`;
