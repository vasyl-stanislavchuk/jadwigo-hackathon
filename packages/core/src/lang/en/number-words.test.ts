// English number words (dl-liwi.34): golden cases, British as written and American as read.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { numberWords, readNumberWords } from "../number-words.ts";
import { EN_NUMBER_WORDS_MAX, englishNumberWordForms } from "./number-words.ts";

/** [number, the British form Jadwigo writes]. */
const GOLDEN: readonly (readonly [number, string])[] = [
  [0, "zero"],
  [1, "one"],
  [7, "seven"],
  [12, "twelve"],
  [15, "fifteen"],
  [20, "twenty"],
  [21, "twenty-one"],
  [56, "fifty-six"],
  [99, "ninety-nine"],
  [100, "one hundred"],
  [101, "one hundred and one"],
  [115, "one hundred and fifteen"],
  [345, "three hundred and forty-five"],
  [1000, "one thousand"],
  [1001, "one thousand and one"],
  [1500, "one thousand five hundred"],
  [2022, "two thousand and twenty-two"],
  [12_345, "twelve thousand three hundred and forty-five"],
  [200_000, "two hundred thousand"],
  [999_999, "nine hundred and ninety-nine thousand nine hundred and ninety-nine"],
];

describe("numberWords in English", () => {
  it.each(GOLDEN)("writes %i as %s", (n, words) => {
    expect(numberWords("en", n)).toBe(words);
  });

  it("refuses a number it cannot write", () => {
    for (const n of [-1, 0.5, EN_NUMBER_WORDS_MAX + 1])
      expect(() => numberWords("en", n)).toThrow(RangeError);
  });

  it("writes every number below a million as words it reads back, in both forms", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: EN_NUMBER_WORDS_MAX }), (n) => {
        for (const form of englishNumberWordForms(n)) expect(readNumberWords("en", form)).toBe(n);
      }),
      { numRuns: 2000 },
    );
  });
});

describe("readNumberWords in English", () => {
  it.each([
    ["one hundred one", 101],
    ["Twenty One", 21],
    ["twenty - one", 21],
    ["fifty six", 56],
    ["  three hundred and forty-five ", 345],
    ["two thousand twenty-two", 2022],
  ] as const)("reads %j as %s", (text, n) => {
    expect(readNumberWords("en", text)).toBe(n);
  });

  it.each([
    "",
    "and",
    "hundred",
    "one hundred and",
    "five two",
    "two hundred hundred",
    "a hundred",
    "fourty",
    "pięćdziesiąt sześć",
  ])("reads %j as no number", (text) => {
    expect(readNumberWords("en", text)).toBeUndefined();
  });
});
