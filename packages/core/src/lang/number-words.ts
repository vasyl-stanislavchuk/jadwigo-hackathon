import type { Language } from "@jadwigo/contracts";
import {
  EN_NUMBER_WORDS_MAX,
  englishNumberWordForms,
  englishNumberWords,
} from "./en/number-words.ts";
import {
  PL_NUMBER_WORDS_MAX,
  polishNumberWordForms,
  polishNumberWords,
} from "./pl/number-words.ts";

/**
 * Number words in each language (dl-liwi.34): written by n2words, read back by matching against
 * the same table, as docs/research/i18n.md section 7 asks.
 *
 * Reading never corrects the text. It compares in a throwaway form (trimmed, one space between
 * words, lower case, NFC; in English a hyphen reads as a space), so `Pięćdziesiąt  sześć` is 56 and
 * `piecdziesiat szesc` is no number: a missing accent is the text judge's miss to classify, not
 * this reader's to forgive. A text is a number only when one of the number's own forms, in some
 * case and gender, is exactly that text.
 */

const WRITE: Record<Language, (n: number) => string> = {
  pl: (n) => polishNumberWords(n),
  en: englishNumberWords,
};

const FORMS: Record<Language, (n: number) => string[]> = {
  pl: polishNumberWordForms,
  en: englishNumberWordForms,
};

const MAX: Record<Language, number> = { pl: PL_NUMBER_WORDS_MAX, en: EN_NUMBER_WORDS_MAX };

/** A whole number from 0 to 999 999 in words: Polish in the nominative and masculine, English in
 * the British form. Polish's other cases and genders are `polishNumberWords`. */
export function numberWords(language: Language, n: number): string {
  return WRITE[language](n);
}

function comparable(language: Language, text: string): string {
  const spaced = language === "en" ? text.replace(/-/g, " ") : text;
  return spaced.trim().replace(/\s+/g, " ").toLocaleLowerCase(language).normalize("NFC");
}

/** What each word stands for: a value to add, or a multiplier. Built from the writer's own words. */
type Token = { readonly add: number } | { readonly times: 100 | 1000 };

const tables = new Map<Language, ReadonlyMap<string, Token>>();

/** The numbers each of whose forms is one word, and the multiplier words, in every form. */
function table(language: Language): ReadonlyMap<string, Token> {
  const known = tables.get(language);
  if (known !== undefined) return known;
  const words = new Map<string, Token>();
  const atoms = [...Array.from({ length: 20 }, (_, i) => i), 20, 30, 40, 50, 60, 70, 80, 90];
  if (language === "pl") atoms.push(100, 200, 300, 400, 500, 600, 700, 800, 900);
  for (const n of atoms) {
    for (const form of FORMS[language](n)) words.set(comparable(language, form), { add: n });
  }
  // Each form of 1000 and 2000 ends in its thousand word (`tysiąc`, `tysiące`, `tysięcy`, ...), and
  // 5000 gives the plural cases' words.
  for (const n of [1000, 2000, 5000]) {
    for (const form of FORMS[language](n)) {
      const word = comparable(language, form).split(" ").at(-1);
      if (word !== undefined) words.set(word, { times: 1000 });
    }
  }
  if (language === "en") {
    words.set("hundred", { times: 100 });
    words.set("and", { add: 0 });
  }
  tables.set(language, words);
  return words;
}

/** The number a text names in words, or undefined when it names none. */
export function readNumberWords(language: Language, text: string): number | undefined {
  const typed = comparable(language, text);
  if (typed === "") return undefined;
  const words = table(language);
  let total = 0;
  let current = 0;
  for (const word of typed.split(" ")) {
    const token = words.get(word);
    if (token === undefined) return undefined;
    if ("add" in token) current += token.add;
    else if (token.times === 100) current = current * 100;
    else {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    }
  }
  const n = total + current;
  if (n > MAX[language]) return undefined;
  // The sum alone accepts `pięć dwa`; the number must also be written exactly so.
  const written = FORMS[language](n).map((form) => comparable(language, form));
  return written.includes(typed) ? n : undefined;
}
