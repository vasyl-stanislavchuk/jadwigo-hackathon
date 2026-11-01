/**
 * The harsh-word check of `packages/copy/src/harsh.ts`, copied (Lead decision 25, `dl-z5ja.31`).
 * jadwigo-ai may not import `@jadwigo/copy`, so the word list lives here too, and `harsh.test.ts`
 * fails when the two lists drift. Change the words in copy first, then here.
 */

const HARSH_WORDS = {
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
} as const satisfies Record<string, readonly string[]>;

/** Every word on the list, each language's in turn: what the parity test compares. */
export const HARSH_WORD_LIST: readonly string[] = Object.values(HARSH_WORDS).flat();

function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
}

const PATTERNS = HARSH_WORD_LIST.map((word) => ({ word, pattern: wordPattern(word) }));

/** The harsh words `text` contains, matched as whole words in any case, as copy matches them. */
export function harshWordsIn(text: string): string[] {
  return PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ word }) => word);
}
