import type { Language } from "@jadwigo/contracts";
import { EN_FOLDING, EN_LETTER_ROW } from "./en/letters.ts";
import { EN_DECIMAL_SEPARATOR, EN_LOCALE } from "./en/numbers.ts";
import { PL_FOLDING, PL_LETTER_ROW } from "./pl/letters.ts";
import { PL_DECIMAL_SEPARATOR, PL_LOCALE } from "./pl/numbers.ts";

/**
 * What grading and the page need to know about a language (dl-5ssh.34.24, docs/research/i18n.md
 * section 7). Grading itself stays language-free: a question carries no language, so the judges
 * read every language's folding table and both separators, and only what Jadwigo writes or draws
 * (the letter row, a decimal, an amount of money) follows the lesson's language.
 */

const LETTER_ROW: Record<Language, readonly string[]> = { pl: PL_LETTER_ROW, en: EN_LETTER_ROW };
const DECIMAL_SEPARATOR: Record<Language, string> = {
  pl: PL_DECIMAL_SEPARATOR,
  en: EN_DECIMAL_SEPARATOR,
};
const LOCALE: Record<Language, string> = { pl: PL_LOCALE, en: EN_LOCALE };

/** The letters with marks the page draws under a typed answer in this language; none for English. */
export function letterRow(language: Language): readonly string[] {
  return LETTER_ROW[language];
}

/** Every language's letters whose mark NFD does not take off, with what each reads as. The judges
 * fold with all of them: no English answer holds a `ł`, so Polish's table costs English nothing. */
export const FOLDING: Readonly<Record<string, string>> = { ...PL_FOLDING, ...EN_FOLDING };

/** The separators a decimal may be typed with, in every language: the judge reads each the same. */
export const DECIMAL_SEPARATORS: readonly string[] = [...new Set(Object.values(DECIMAL_SEPARATOR))];

/** A decimal written with this language's separator: `0.29` is `0,29` in Polish. Any other text
 * comes back as it is. */
export function writeDecimal(text: string, language: Language): string {
  return /^-?[0-9]*[.,][0-9]+$/.test(text)
    ? text.replace(/[.,]/, DECIMAL_SEPARATOR[language])
    : text;
}

/** An amount in grosze as this language writes money: `3,50 zł` in Polish, `3.50 zł` in English.
 * English lessons count zloty too, written with a decimal point and the zł sign the child sees on
 * Polish money (jadwigo-learner-knowledge/decisions/2026-11-01-english-lessons-count-zloty-written-3-50-z).
 * A no-break space keeps the amount and `zł` on one line, as Intl writes Polish. */
export function formatMoney(gr: number, language: Language): string {
  if (language === "pl") {
    return new Intl.NumberFormat(PL_LOCALE, { style: "currency", currency: "PLN" }).format(
      gr / 100,
    );
  }
  const amount = new Intl.NumberFormat(LOCALE[language], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(gr / 100);
  return `${amount}\u00a0zł`;
}
