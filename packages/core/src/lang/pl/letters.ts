/**
 * Polish letters (dl-5ssh.34.24, docs/research/i18n.md section 7): the letter row under a typed
 * Polish answer, and the folding table that reads a letter with its mark taken off.
 */

/** The 9 Polish letters with marks, in alphabet order: the letter row (lesson-kit's LetterRow). */
export const PL_LETTER_ROW = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"] as const;

/**
 * Letters whose mark Unicode does not decompose, with the letter they read as when the mark is
 * off. Every other Polish letter (`ą`, `ó`, ...) loses its mark through NFD. Used only to classify
 * a miss as `missing_diacritics`, or to accept it where the key ignores accents.
 */
export const PL_FOLDING: Readonly<Record<string, string>> = { ł: "l", Ł: "L" };
