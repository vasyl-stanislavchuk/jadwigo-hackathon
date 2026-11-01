import type { Language } from "@jadwigo/contracts";

/**
 * Whether an agent message is in the lesson's language (dl-z5ja.64, Lead decision 43): the model
 * drifting into English on a Polish lesson, or into Polish on an English one, is refused like an
 * invented number. Pure and cautious: it says `false` only when the other language is plainly the
 * one written, so a short line, a name or a quoted title never trips it.
 *
 * The signals are function words, which every sentence carries and no name or title is made of,
 * and for Polish its letters with diacritics.
 */
export function inLanguage(text: string, language: Language): boolean {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  let pl = 0;
  let en = 0;
  for (const word of words) {
    if (POLISH.has(word) || DIACRITIC.test(word)) pl += 1;
    if (ENGLISH.has(word)) en += 1;
  }
  const [own, other] = language === "pl" ? [pl, en] : [en, pl];
  return !(other >= MIN_SIGNALS && other > own * 2);
}

/** The fewest signals of the other language that can refuse a message. */
const MIN_SIGNALS = 3;

const DIACRITIC = /[ąćęłńóśźż]/u;

/** Words only one of the 2 languages uses: `a`, `i`, `to`, `no` and `on` are in both, so in neither. */
const POLISH = new Set([
  "jest",
  "są",
  "się",
  "nie",
  "że",
  "do",
  "dla",
  "na",
  "w",
  "z",
  "ze",
  "czy",
  "co",
  "jak",
  "ten",
  "ta",
  "te",
  "już",
  "oraz",
  "lub",
  "ale",
  "tak",
  "lekcja",
  "lekcji",
  "lekcję",
  "pytania",
  "pytanie",
  "pytań",
  "gotowa",
  "gotowe",
  "dziecko",
  "dziecka",
  "jego",
  "jej",
  "mogę",
  "możesz",
]);

const ENGLISH = new Set([
  "the",
  "and",
  "is",
  "are",
  "was",
  "you",
  "your",
  "it",
  "of",
  "in",
  "for",
  "with",
  "this",
  "that",
  "will",
  "can",
  "be",
  "have",
  "has",
  "what",
  "which",
  "not",
  "lesson",
  "questions",
  "question",
  "ready",
  "here",
  "now",
  "done",
  "child",
  "shall",
  "would",
  "about",
]);
