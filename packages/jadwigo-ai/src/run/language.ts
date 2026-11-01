import type { Language } from "@jadwigo/contracts";

/**
 * Whether an agent message is in the lesson's language (dl-z5ja.64, Lead decision 43): the model
 * drifting into English on a Polish lesson, or into Polish on an English one, is refused like an
 * invented number. Pure and cautious: it says `false` only when the other language is plainly the
 * one written, so a short line, a name or a quoted title never trips it.
 *
 * The signals are function words, which every sentence carries and no name or title is made of,
 * and for Polish its letters with diacritics. Quoted spans ("...", „...", «...») are a lesson's
 * own words, a title or a question, so they are left out first. A capitalised word is left out
 * too: it is a name, or the first word of a sentence, and a name like Łucja says nothing about the
 * language around it. And a lone word between punctuation is a list item, such as the words a
 * lesson teaches ("is, are, was"), not prose: only runs of 2 words or more are read (dl-z5ja.64
 * review).
 */
export function inLanguage(text: string, language: Language): boolean {
  const unquoted = text.replace(QUOTED, " ");
  const words = unquoted
    .split(/[,;:.!?()[\]\n]+/u)
    .map((run) => run.match(/\p{L}+/gu) ?? [])
    .filter((run) => run.length >= 2)
    .flat();
  let pl = 0;
  let en = 0;
  for (const word of words) {
    if (/^\p{Lu}/u.test(word)) continue;
    if (POLISH.has(word) || DIACRITIC.test(word)) pl += 1;
    if (ENGLISH.has(word)) en += 1;
  }
  const [own, other] = language === "pl" ? [pl, en] : [en, pl];
  return !(other >= MIN_SIGNALS && other > own * 2);
}

/** The fewest signals of the other language that can refuse a message. */
const MIN_SIGNALS = 3;

const DIACRITIC = /[ąćęłńóśźż]/u;

/**
 * A quoted span: straight or curly double quotes, the Polish „...”, guillemets, and single quotes
 * '...' or ‘...’. A single quote opens a span only after a space, a bracket or the start, and
 * closes it only before a space, punctuation or the end, so an apostrophe inside a word ("don't",
 * "child's") never opens one.
 */
const QUOTED =
  /"[^"]*"|„[^”"]*[”"]|“[^”]*”|«[^»]*»|(?<=^|[\s([])['‘][^'‘’\n]+['’](?=$|[\s.,;:!?)\]])/gu;

/**
 * Words only one of the 2 languages uses: `a`, `i`, `to`, `no`, `on`, `do`, `ten`, `ale`, `ta`,
 * `te` and `co` are English words too, so they are in neither.
 */
const POLISH = new Set([
  "jest",
  "są",
  "się",
  "nie",
  "że",
  "dla",
  "na",
  "w",
  "z",
  "ze",
  "czy",
  "jak",
  "już",
  "oraz",
  "lub",
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
