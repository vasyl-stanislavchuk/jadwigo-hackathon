// Grading per language (dl-5ssh.34.24): golden cases for what Jadwigo writes and draws in each
// language, and English answers judged through the same judge as Polish ones.
import { type EnterKey, Language } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { parseDecimal } from "../families/exact.ts";
import { judge } from "../families/judge.ts";
import type { Question } from "../families/question.ts";
import { DECIMAL_SEPARATORS, formatMoney, letterRow, writeDecimal } from "./language.ts";

const NBSP = " ";

describe("the letter row", () => {
  it("is the 9 Polish letters with marks in Polish, and nothing in English", () => {
    expect(letterRow("pl")).toEqual(["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"]);
    expect(letterRow("en")).toEqual([]);
  });
});

describe("decimals", () => {
  it.each([
    ["0.29", "pl", "0,29"],
    ["0,29", "en", "0.29"],
    ["-3.5", "pl", "-3,5"],
    [".5", "pl", ",5"],
    ["12,37", "pl", "12,37"],
    ["12", "pl", "12"],
    ["1/2", "en", "1/2"],
    ["siedem", "pl", "siedem"],
  ] as const)("writes %s in %s as %s", (text, language, written) => {
    expect(writeDecimal(text, language)).toBe(written);
  });

  it("reads every language's separator the same", () => {
    expect(DECIMAL_SEPARATORS).toEqual([",", "."]);
    for (const l of Language.options) {
      expect(parseDecimal(writeDecimal("0.5", l))).toEqual({ n: 1, d: 2 });
    }
  });
});

describe("money", () => {
  it.each([
    [350, "pl", `3,50${NBSP}zł`],
    [5, "pl", `0,05${NBSP}zł`],
    [2000, "pl", `20,00${NBSP}zł`],
    [123_456, "pl", `1234,56${NBSP}zł`],
    [350, "en", `3.50${NBSP}zł`],
    [5, "en", `0.05${NBSP}zł`],
    [2000, "en", `20.00${NBSP}zł`],
    [123_456, "en", `1,234.56${NBSP}zł`],
  ] as const)("writes %i grosze in %s as %s", (gr, language, written) => {
    expect(formatMoney(gr, language)).toBe(written);
  });
});

/** A short_text question with an English key. */
const shortText = (key: EnterKey): Question => ({
  family: "enter",
  question_type: "short_text",
  data: { input: "text", entry: "keyboard" },
  key,
});

const verdictOf = (key: EnterKey, entered: string): string => {
  const v = judge(shortText(key), { entered });
  return v.correct ? "right" : (v.mistake_class ?? "wrong");
};

describe("an English answer", () => {
  const seventy: EnterKey = { accept: ["seventy-two"], near: { seventy: "tens_only" } };
  it.each([
    ["seventy-two", "right"],
    ["seventy-two.", "right"],
    ["Seventy-two", "wrong_case"],
    ["seventy", "tens_only"],
    ["seventy-tow", "typo"],
    ["sixty-two", "other_wrong"],
  ])("judges %j as %s", (entered, verdict) => {
    expect(verdictOf(seventy, entered)).toBe(verdict);
  });

  it("names a borrowed word's missing accent, and accepts it where the key ignores accents", () => {
    expect(verdictOf({ accept: ["café"] }, "cafe")).toBe("missing_diacritics");
    expect(verdictOf({ accept: ["café"], accents: "ignore" }, "cafe")).toBe("right");
  });

  it("reads a decimal point and a decimal comma the same", () => {
    const half: Question = {
      family: "enter",
      question_type: "production",
      data: { input: "number", entry: "keypad" },
      key: { accept: ["0.5"] },
    };
    expect(judge(half, { entered: "0.5" }).correct).toBe(true);
    expect(judge(half, { entered: "0,5" }).correct).toBe(true);
  });
});
