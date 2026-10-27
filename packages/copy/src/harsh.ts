/**
 * Harsh or discouraging words that never appear in learner-facing copy (dl-dm9). A miss is
 * information, not failure: the page says "not yet", never "wrong". Matched as whole words,
 * any case. A parent may extend these lists; the copy tables are checked against them.
 */

import type { Language } from "./types.ts";

export const HARSH_WORDS: Record<Language, readonly string[]> = {
  pl: [
    "źle",
    "zły",
    "zła",
    "złe",
    "błąd",
    "błędu",
    "błędy",
    "błędnie",
    "błędna",
    "błędny",
    "niepoprawnie",
    "niepoprawna",
    "niepoprawny",
    "nie tak",
    "porażka",
  ],
  en: ["wrong", "incorrect", "mistake", "mistakes", "fail", "failed", "failure", "bad"],
};

function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
}

/** The harsh words `text` contains, from every language's list. */
export function harshWordsIn(text: string): string[] {
  return Object.values(HARSH_WORDS)
    .flat()
    .filter((word) => wordPattern(word).test(text));
}
