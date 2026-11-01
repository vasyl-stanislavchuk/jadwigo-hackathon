// Polish number words (dl-liwi.34): golden cases in every case and gender, checked by hand against
// Polish grammar (Wielki słownik języka polskiego's numeral tables), and the rules they follow.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readNumberWords } from "../number-words.ts";
import {
  PL_CASES,
  PL_GENDERS,
  PL_NUMBER_WORDS_MAX,
  polishNumberWordForms,
  polishNumberWords,
} from "./number-words.ts";

/** [number, nominative, genitive, dative, instrumental, locative], masculine. */
const GOLDEN: readonly (readonly [number, string, string, string, string, string])[] = [
  [0, "zero", "zera", "zeru", "zerem", "zerze"],
  [1, "jeden", "jednego", "jednemu", "jednym", "jednym"],
  [2, "dwa", "dwóch", "dwóm", "dwoma", "dwóch"],
  [3, "trzy", "trzech", "trzem", "trzema", "trzech"],
  [4, "cztery", "czterech", "czterem", "czterema", "czterech"],
  [5, "pięć", "pięciu", "pięciu", "pięcioma", "pięciu"],
  [8, "osiem", "ośmiu", "ośmiu", "ośmioma", "ośmiu"],
  [10, "dziesięć", "dziesięciu", "dziesięciu", "dziesięcioma", "dziesięciu"],
  [12, "dwanaście", "dwunastu", "dwunastu", "dwunastoma", "dwunastu"],
  [15, "piętnaście", "piętnastu", "piętnastu", "piętnastoma", "piętnastu"],
  [19, "dziewiętnaście", "dziewiętnastu", "dziewiętnastu", "dziewiętnastoma", "dziewiętnastu"],
  [20, "dwadzieścia", "dwudziestu", "dwudziestu", "dwudziestoma", "dwudziestu"],
  [
    21,
    "dwadzieścia jeden",
    "dwudziestu jeden",
    "dwudziestu jeden",
    "dwudziestoma jeden",
    "dwudziestu jeden",
  ],
  [
    56,
    "pięćdziesiąt sześć",
    "pięćdziesięciu sześciu",
    "pięćdziesięciu sześciu",
    "pięćdziesięcioma sześcioma",
    "pięćdziesięciu sześciu",
  ],
  [
    92,
    "dziewięćdziesiąt dwa",
    "dziewięćdziesięciu dwóch",
    "dziewięćdziesięciu dwóm",
    "dziewięćdziesięcioma dwoma",
    "dziewięćdziesięciu dwóch",
  ],
  [100, "sto", "stu", "stu", "stu", "stu"],
  [101, "sto jeden", "stu jeden", "stu jeden", "stu jeden", "stu jeden"],
  [
    245,
    "dwieście czterdzieści pięć",
    "dwustu czterdziestu pięciu",
    "dwustu czterdziestu pięciu",
    "dwustu czterdziestoma pięcioma",
    "dwustu czterdziestu pięciu",
  ],
  [500, "pięćset", "pięciuset", "pięciuset", "pięciuset", "pięciuset"],
  [1000, "tysiąc", "tysiąca", "tysiącowi", "tysiącem", "tysiącu"],
  [1001, "tysiąc jeden", "tysiąca jeden", "tysiącowi jeden", "tysiącem jeden", "tysiącu jeden"],
  [
    1500,
    "tysiąc pięćset",
    "tysiąca pięciuset",
    "tysiącowi pięciuset",
    "tysiącem pięciuset",
    "tysiącu pięciuset",
  ],
  [2000, "dwa tysiące", "dwóch tysięcy", "dwóm tysiącom", "dwoma tysiącami", "dwóch tysiącach"],
  [
    5000,
    "pięć tysięcy",
    "pięciu tysięcy",
    "pięciu tysiącom",
    "pięcioma tysiącami",
    "pięciu tysiącach",
  ],
  [
    12_345,
    "dwanaście tysięcy trzysta czterdzieści pięć",
    "dwunastu tysięcy trzystu czterdziestu pięciu",
    "dwunastu tysiącom trzystu czterdziestu pięciu",
    "dwunastoma tysiącami trzystu czterdziestoma pięcioma",
    "dwunastu tysiącach trzystu czterdziestu pięciu",
  ],
  [
    21_000,
    "dwadzieścia jeden tysięcy",
    "dwudziestu jeden tysięcy",
    "dwudziestu jeden tysiącom",
    "dwudziestoma jeden tysiącami",
    "dwudziestu jeden tysiącach",
  ],
  [
    22_000,
    "dwadzieścia dwa tysiące",
    "dwudziestu dwóch tysięcy",
    "dwudziestu dwóm tysiącom",
    "dwudziestoma dwoma tysiącami",
    "dwudziestu dwóch tysiącach",
  ],
];

/** [number, gender, case, words]: where the gender changes the word. */
const GENDERED: readonly (readonly [
  number,
  "feminine" | "neuter",
  (typeof PL_CASES)[number],
  string,
])[] = [
  [1, "feminine", "nominative", "jedna"],
  [1, "neuter", "nominative", "jedno"],
  [1, "feminine", "genitive", "jednej"],
  [1, "feminine", "instrumental", "jedną"],
  [2, "feminine", "nominative", "dwie"],
  [2, "neuter", "nominative", "dwa"],
  [2, "feminine", "instrumental", "dwiema"],
  [22, "feminine", "nominative", "dwadzieścia dwie"],
  [22, "feminine", "instrumental", "dwudziestoma dwiema"],
  [222, "feminine", "nominative", "dwieście dwadzieścia dwie"],
  // A compound ending in 1 keeps `jeden`; n2words writes `dwadzieścia jedna` here.
  [21, "feminine", "nominative", "dwadzieścia jeden"],
  [21, "feminine", "genitive", "dwudziestu jeden"],
  [2002, "feminine", "nominative", "dwa tysiące dwie"],
  // The thousands stay masculine whatever the counted noun.
  [2000, "feminine", "nominative", "dwa tysiące"],
  [2000, "feminine", "instrumental", "dwoma tysiącami"],
];

describe("polishNumberWords", () => {
  it.each(GOLDEN)("writes %i in every case", (n, ...words) => {
    expect(PL_CASES.map((c) => polishNumberWords(n, { case: c }))).toEqual(words);
  });

  it.each(GENDERED)("writes %i %s in the %s as %s", (n, gender, c, words) => {
    expect(polishNumberWords(n, { case: c, gender })).toBe(words);
  });

  it("refuses a number it cannot write", () => {
    for (const n of [-1, 1.5, PL_NUMBER_WORDS_MAX + 1, Number.NaN]) {
      expect(() => polishNumberWords(n)).toThrow(RangeError);
    }
  });

  it("writes every number below a million in every case and gender as words it reads back", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: PL_NUMBER_WORDS_MAX }), (n) => {
        for (const form of polishNumberWordForms(n)) expect(readNumberWords("pl", form)).toBe(n);
      }),
      { numRuns: 2000 },
    );
  });

  it("gives two numbers no form in common", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 0, max: 9999 }), (a, b) => {
        fc.pre(a !== b);
        const forms = new Set(polishNumberWordForms(a));
        expect(polishNumberWordForms(b).some((f) => forms.has(f))).toBe(false);
      }),
    );
  });

  it("keeps a word for every case and gender of the first thousand", () => {
    for (let n = 0; n < 1000; n++) {
      for (const c of PL_CASES) {
        for (const gender of PL_GENDERS)
          expect(polishNumberWords(n, { case: c, gender })).not.toMatch(/^ | $| {2}/);
      }
    }
  });
});

describe("readNumberWords in Polish", () => {
  it.each([
    ["pięćdziesięciu sześciu", 56],
    ["Pięćdziesiąt  sześć", 56],
    [" dwoma tysiącami ", 2000],
    ["tysiąc", 1000],
    ["dwie", 2],
  ] as const)("reads %s as %i", (text, n) => {
    expect(readNumberWords("pl", text)).toBe(n);
  });

  it.each([
    "",
    "piecdziesiat szesc", // accents off: the text judge's miss, not a number here
    "pięć dwa",
    "sześć pięćdziesiąt",
    "dwa tysięcy",
    "jeden tysiąc",
    "dwudziestu sześć", // two cases in one number
    "zero tysięcy",
    "fifty-six",
    "56",
  ])("reads %j as no number", (text) => {
    expect(readNumberWords("pl", text)).toBeUndefined();
  });
});
