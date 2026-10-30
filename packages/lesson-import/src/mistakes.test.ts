import { describe, expect, it } from "vitest";
import { mistakeClassesByStep } from "./mistakes.ts";

/** A one-part lesson file of our own, each step a question with the given family, data and key. */
const lesson = (steps: { id: string; question: object }[], language = "pl") => ({
  language,
  script: { parts: [{ part: "p", steps }] },
});
const number = (key: object) => ({
  family: "enter",
  data: { input: "number", entry: "keypad" },
  key: { accept: ["24"], ...key },
});

describe("mistakeClassesByStep (dl-e8ov.5.38.15)", () => {
  it("lists each step's own classes: a bare number key only other_wrong, a rule's only on its step", () => {
    const rule = { rule: "times_table", a: 4, b: 6, recent: [] };
    const out = mistakeClassesByStep(
      lesson([
        { id: "q1", question: number({}) },
        { id: "q2", question: number({ rule, near: { "42": "digits_swapped" } }) },
      ]),
    );
    expect(out["q1"]).toEqual(["other_wrong"]);
    expect(out["q2"]).toEqual(
      expect.arrayContaining(["digits_swapped", "off_by_small", "neighbour_row"]),
    );
    expect(out["q2"]).not.toContain("wrong_case");
  });

  it("names a twin under its own step id, with its own key", () => {
    const twin = {
      data: { input: "number", entry: "keypad" },
      key: { accept: ["5"], near: { "6": "one_more" } },
    };
    const out = mistakeClassesByStep(
      lesson([{ id: "q1", question: { ...number({}), help: { twin } } }]),
    );
    expect(out["q1t"]).toEqual(["one_more", "other_wrong"]);
  });

  it("resolves the file's lines to its language before it reads a question", () => {
    const question = {
      family: "enter",
      data: { input: "text", entry: "keyboard" },
      key: {
        accept: [{ pl: "kot", uk: "кіт", en: "cat" }],
        case: "ignore",
        accents: "ignore",
        typo: "accept",
      },
    };
    expect(mistakeClassesByStep(lesson([{ id: "q1", question }], "en"))["q1"]).toEqual([
      "other_wrong",
    ]);
  });

  it("leaves out a step whose question does not parse, and reads a file of any shape", () => {
    expect(mistakeClassesByStep(lesson([{ id: "q1", question: { family: "draw" } }]))).toEqual({});
    expect(mistakeClassesByStep(null)).toEqual({});
  });
});
