/**
 * English letters (dl-5ssh.34.24): English writes no letter with a mark, so it has no letter row,
 * and NFD alone takes the mark off a borrowed word's letter (`café`).
 */

/** No letter row: an English answer types on any keyboard. */
export const EN_LETTER_ROW = [] as const;

/** Nothing beyond NFD. */
export const EN_FOLDING: Readonly<Record<string, string>> = {};
