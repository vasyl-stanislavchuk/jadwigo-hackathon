import { toCardinal } from "n2words/pl-PL";

/**
 * Polish number words (dl-liwi.34, docs/research/i18n.md section 7): a whole number from 0 to
 * 999 999 written out in the case and gender a sentence needs, e.g. `pięćdziesięciu sześciu`
 * ("do pięćdziesięciu sześciu").
 *
 * The nominative comes from n2words. n2words writes no other case, so the oblique cases come from
 * the tables below. The accusative of a count is its nominative for every noun a lesson counts
 * (things, not men), so it has no case of its own here; neither has the vocative, which numbers
 * never take in a lesson.
 *
 * Two rules hold in every case:
 * - A compound ending in 1 keeps `jeden` as it is: `dwadzieścia jeden`, `dwudziestu jeden`,
 *   `dwudziestoma jeden`, whatever the gender. Only 1 alone is `jedna` or `jedno`.
 * - `tysiąc` takes no `jeden`, and the thousands are counted as a masculine noun: `dwa tysiące`,
 *   `dwóch tysięcy`, `dwoma tysiącami`, `pięciu tysiącom`.
 */

export const PL_CASES = ["nominative", "genitive", "dative", "instrumental", "locative"] as const;
export type PlCase = (typeof PL_CASES)[number];

export const PL_GENDERS = ["masculine", "feminine", "neuter"] as const;
export type PlGender = (typeof PL_GENDERS)[number];

export interface PlNumberWordsOptions {
  /** The grammatical case. Nominative unless given. */
  readonly case?: PlCase;
  /** The gender of the counted noun; it changes 1 and 2 only. Masculine unless given. */
  readonly gender?: PlGender;
}

/** The largest number written or read. A lesson in grades 1 to 3 counts far below it. */
export const PL_NUMBER_WORDS_MAX = 999_999;

type Oblique = Exclude<PlCase, "nominative">;

/** Words for 1..9, masculine, index 0 unused. */
const UNITS: Record<Oblique, readonly string[]> = {
  genitive: [
    "",
    "jednego",
    "dwóch",
    "trzech",
    "czterech",
    "pięciu",
    "sześciu",
    "siedmiu",
    "ośmiu",
    "dziewięciu",
  ],
  dative: [
    "",
    "jednemu",
    "dwóm",
    "trzem",
    "czterem",
    "pięciu",
    "sześciu",
    "siedmiu",
    "ośmiu",
    "dziewięciu",
  ],
  instrumental: [
    "",
    "jednym",
    "dwoma",
    "trzema",
    "czterema",
    "pięcioma",
    "sześcioma",
    "siedmioma",
    "ośmioma",
    "dziewięcioma",
  ],
  locative: [
    "",
    "jednym",
    "dwóch",
    "trzech",
    "czterech",
    "pięciu",
    "sześciu",
    "siedmiu",
    "ośmiu",
    "dziewięciu",
  ],
};

/** 1 and 2 when the noun is feminine; every other unit is the masculine word. */
const FEMININE: Record<Oblique, { readonly 1: string; readonly 2: string }> = {
  genitive: { 1: "jednej", 2: "dwóch" },
  dative: { 1: "jednej", 2: "dwóm" },
  instrumental: { 1: "jedną", 2: "dwiema" },
  locative: { 1: "jednej", 2: "dwóch" },
};

const ZERO: Record<Oblique, string> = {
  genitive: "zera",
  dative: "zeru",
  instrumental: "zerem",
  locative: "zerze",
};

/** The genitive, dative and locative of 10..19, 20..90 and 100..900 are one word. */
const TEENS_GDL = [
  "dziesięciu",
  "jedenastu",
  "dwunastu",
  "trzynastu",
  "czternastu",
  "piętnastu",
  "szesnastu",
  "siedemnastu",
  "osiemnastu",
  "dziewiętnastu",
];
const TEENS_INS = [
  "dziesięcioma",
  "jedenastoma",
  "dwunastoma",
  "trzynastoma",
  "czternastoma",
  "piętnastoma",
  "szesnastoma",
  "siedemnastoma",
  "osiemnastoma",
  "dziewiętnastoma",
];
/** Index 2..9 for 20..90. */
const TENS_GDL = [
  "",
  "",
  "dwudziestu",
  "trzydziestu",
  "czterdziestu",
  "pięćdziesięciu",
  "sześćdziesięciu",
  "siedemdziesięciu",
  "osiemdziesięciu",
  "dziewięćdziesięciu",
];
const TENS_INS = [
  "",
  "",
  "dwudziestoma",
  "trzydziestoma",
  "czterdziestoma",
  "pięćdziesięcioma",
  "sześćdziesięcioma",
  "siedemdziesięcioma",
  "osiemdziesięcioma",
  "dziewięćdziesięcioma",
];
/** Index 1..9 for 100..900, the same in every oblique case (`stu`, `pięciuset`). */
const HUNDREDS = [
  "",
  "stu",
  "dwustu",
  "trzystu",
  "czterystu",
  "pięciuset",
  "sześciuset",
  "siedmiuset",
  "ośmiuset",
  "dziewięciuset",
];

/** `tysiąc` alone (a count of 1), and after any other count. */
const THOUSAND: Record<Oblique, { readonly one: string; readonly many: string }> = {
  genitive: { one: "tysiąca", many: "tysięcy" },
  dative: { one: "tysiącowi", many: "tysiącom" },
  instrumental: { one: "tysiącem", many: "tysiącami" },
  locative: { one: "tysiącu", many: "tysiącach" },
};

const at = (words: readonly string[], i: number): string => words[i] ?? "";

/** 1..999 in an oblique case. `tail` is true for the last group of a number above 1, where a
 * final 1 stays `jeden`. */
function group(n: number, c: Oblique, gender: PlGender, tail: boolean): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) words.push(at(HUNDREDS, hundreds));
  if (rest >= 10 && rest < 20)
    words.push(at(c === "instrumental" ? TEENS_INS : TEENS_GDL, rest - 10));
  else {
    const tens = Math.floor(rest / 10);
    const unit = rest % 10;
    if (tens > 0) words.push(at(c === "instrumental" ? TENS_INS : TENS_GDL, tens));
    if (unit === 1 && tail) words.push("jeden");
    else if (unit > 0) {
      words.push(
        gender === "feminine" && (unit === 1 || unit === 2)
          ? FEMININE[c][unit]
          : at(UNITS[c], unit),
      );
    }
  }
  return words;
}

function oblique(n: number, c: Oblique, gender: PlGender): string {
  if (n === 0) return ZERO[c];
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const words: string[] = [];
  if (thousands === 1) words.push(THOUSAND[c].one);
  else if (thousands > 1) words.push(...group(thousands, c, "masculine", true), THOUSAND[c].many);
  if (rest > 0) words.push(...group(rest, c, gender, n > 1));
  return words.join(" ");
}

function nominative(n: number, gender: PlGender): string {
  if (n === 1) return gender === "feminine" ? "jedna" : gender === "neuter" ? "jedno" : "jeden";
  // n2words writes `dwadzieścia jedna` for a feminine 21, where Polish keeps `jeden`, so only the
  // last 2 is feminine here (`dwadzieścia dwie`), and only below the thousands.
  const words = toCardinal(n).split(" ");
  if (gender === "feminine" && n % 10 === 2 && n % 100 !== 12 && words.at(-1) === "dwa")
    words[words.length - 1] = "dwie";
  return words.join(" ");
}

/** A whole number from 0 to 999 999 in Polish words. Throws a RangeError for any other number. */
export function polishNumberWords(n: number, options: PlNumberWordsOptions = {}): string {
  if (!Number.isInteger(n) || n < 0 || n > PL_NUMBER_WORDS_MAX) {
    throw new RangeError(
      `polishNumberWords: ${n} is not a whole number from 0 to ${PL_NUMBER_WORDS_MAX}`,
    );
  }
  const c = options.case ?? "nominative";
  const gender = options.gender ?? "masculine";
  return c === "nominative" ? nominative(n, gender) : oblique(n, c, gender);
}

/** Every way the number is written, one per case and gender, without repeats. */
export function polishNumberWordForms(n: number): string[] {
  const forms = new Set<string>();
  for (const c of PL_CASES)
    for (const gender of PL_GENDERS) forms.add(polishNumberWords(n, { case: c, gender }));
  return [...forms];
}
