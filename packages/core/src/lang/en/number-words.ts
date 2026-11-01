import { toCardinal as british } from "n2words/en-GB";
import { toCardinal as american } from "n2words/en-US";

/**
 * English number words (dl-liwi.34, docs/research/i18n.md section 7): a whole number from 0 to
 * 999 999 written out by n2words. Jadwigo writes the British form, `one hundred and one`; a child
 * may write the American one, `one hundred one`, and both read back to the same number.
 */

/** The largest number written or read, the same as Polish. */
export const EN_NUMBER_WORDS_MAX = 999_999;

/** A whole number from 0 to 999 999 in English words, British style. Throws a RangeError for any
 * other number. */
export function englishNumberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > EN_NUMBER_WORDS_MAX) {
    throw new RangeError(
      `englishNumberWords: ${n} is not a whole number from 0 to ${EN_NUMBER_WORDS_MAX}`,
    );
  }
  return british(n);
}

/** Every way the number is written: British, then American when it differs. */
export function englishNumberWordForms(n: number): string[] {
  const forms = [englishNumberWords(n), american(n)];
  return [...new Set(forms)];
}
