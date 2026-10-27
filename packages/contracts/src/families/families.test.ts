import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AnswerValue,
  Family,
  FamilyQuestion,
  Help,
  PageFamilyQuestion,
  PartMark,
  QUESTION_TYPE_FAMILY,
  QuestionType,
  Verdict,
  valueFor,
} from "./index.ts";

// Invented questions, one per family, shaped like the playground's lesson questions.
const QUESTIONS = {
  choose: {
    family: "choose",
    data: {
      stem: { text: "$3 + 3$" },
      options: [
        { id: "o1", content: { kind: "text", text: "2 × 3" } },
        { id: "o2", content: { kind: "number", number: 5 } },
        { id: "o3", content: { kind: "none" } },
      ],
      select: "many",
      layout: "grid",
    },
    key: { correct: ["o1"], near: { o2: "add_for_multiply" } },
  },
  enter: {
    family: "enter",
    data: {
      input: "number",
      entry: "keypad",
      voice: true,
      figure: { kind: "expression", text: "3 × 4 = ?" },
    },
    key: {
      accept: ["12"],
      near: { "7": "add_for_multiply" },
      rule: { rule: "times_table", a: 3, b: 4, recent: [] },
    },
  },
  slots: {
    family: "slots",
    data: {
      template: "3 × 7 = 21, so 6 × 7 = {g1} and {g2}",
      gaps: [
        { id: "g1", kind: "enter", input: "number" },
        { id: "g2", kind: "choose", options: [{ id: "a", label: "even" }] },
      ],
    },
    key: {
      gaps: {
        g1: {
          kind: "enter",
          accept: ["42"],
          rule: {
            rule: "fill_blank",
            template: "6 × 7 = □",
            operands: [6, 7],
            op: "mul",
            recent: [],
          },
        },
        g2: { kind: "choose", correct: ["a"] },
      },
    },
  },
  sequence: {
    family: "sequence",
    data: {
      items: [
        { id: "a", text: "7" },
        { id: "b", text: "2" },
      ],
      first_label: "smallest",
      last_label: "largest",
    },
    key: { orders: [["b", "a"]] },
  },
  group: {
    family: "group",
    data: {
      groups: [
        { id: "even", label: "even" },
        { id: "odd", label: "odd", capacity: 3 },
      ],
      items: [
        { id: "i1", label: "4" },
        { id: "i2", label: "9" },
      ],
      each_item: "one",
    },
    key: { items: { i1: ["even"], i2: ["odd"] }, near: { i1: { odd: "parity" } } },
  },
  place: {
    family: "place",
    data: { surface: "grid", size: 10, label: "3 × 5", split: "one", cells: "squares" },
    key: { surface: "grid", rows: 5, cols: 3, either_order: true, split: { accept_at: [1] } },
  },
  explain: {
    family: "explain",
    data: { input: "text", prompt: "Why is 2 × 6 the same as 6 × 2?" },
    key: {
      criteria: [{ id: "c1", text: "names the order of factors", cite: "invented" }],
      criteria_version: "1",
    },
  },
} as const;

const VALUES = {
  choose: { chosen: ["o1"] },
  enter: { entered: "12" },
  slots: { gaps: { g1: "42", g2: "a" } },
  sequence: ["b", "a"],
  group: { items: { i1: ["even"], i2: ["odd"] } },
  place: { rows: 5, cols: 3, split: { axis: "rows", at: 1 } },
  explain: { text: "the groups swap", spoken: false },
} as const;

describe("family questions", () => {
  for (const family of Family.options) {
    it(`parses an invented ${family} question, and its page form without the key`, () => {
      const question = QUESTIONS[family];
      expect(FamilyQuestion.parse(question)).toEqual(question);
      const page = PageFamilyQuestion.parse(question);
      expect(page).not.toHaveProperty("key");
      expect(page.family).toBe(family);
    });

    it(`refuses a ${family} question whose key is another family's`, () => {
      const other = family === "choose" ? QUESTIONS.enter : QUESTIONS.choose;
      expect(FamilyQuestion.safeParse({ ...QUESTIONS[family], key: other.key }).success).toBe(
        false,
      );
    });

    it(`parses a ${family} value, alone and as an answer value`, () => {
      expect(valueFor(family).parse(VALUES[family])).toEqual(VALUES[family]);
      expect(AnswerValue.parse(VALUES[family])).toEqual(VALUES[family]);
    });
  }

  it("refuses a place key on another surface than its data", () => {
    const key = { surface: "clock", h: 3, m: 0 };
    expect(FamilyQuestion.safeParse({ ...QUESTIONS.place, key }).success).toBe(false);
  });

  it("parses every place value shape, and refuses extra keys", () => {
    const place = valueFor("place");
    for (const value of [
      { at: 0.5 },
      { points: [{ x: 0.1, y: 0.2 }] },
      { rows: 2, cols: 3 },
      { heights: { apples: 4 } },
      { hour_at: 3, m: 15 },
      { items: ["zl1", "gr50"] },
      { shaded: [0, 2] },
    ]) {
      expect(place.parse(value)).toEqual(value);
    }
    expect(place.safeParse({ at: 1, extra: true }).success).toBe(false);
  });

  it("tells group's items record from coins' items list", () => {
    expect(valueFor("group").safeParse({ items: ["zl1"] }).success).toBe(false);
    expect(valueFor("place").safeParse({ items: { i1: ["even"] } }).success).toBe(false);
    expect(AnswerValue.parse({ items: ["zl1"] })).toEqual({ items: ["zl1"] });
  });

  it("maps every question type to a family", () => {
    for (const type of QuestionType.options) {
      expect(Family.options).toContain(QUESTION_TYPE_FAMILY[type]);
    }
  });
});

describe("help and verdicts", () => {
  it("parses a ladder and drops a twin, which is its own lesson question", () => {
    const help = {
      look: { text: "Count the rows." },
      boost: { text: "Count in fives.", picture: { kind: "dots", rows: 2, cols: 5, alt: "dots" } },
      boost_by_mistake: { add_for_multiply: { text: "That adds them." } },
      worked: ["2 × 5 is two fives", "5 + 5 = 10"],
      almost: ["5 + 5 = □"],
      hints: [
        { text: "Two groups.", pictures: [{ src: "/a.png", alt: "a", width: 1, height: 1 }] },
      ],
    };
    expect(Help.parse(help)).toEqual(help);
    expect(Help.parse({ ...help, twin: QUESTIONS.enter })).not.toHaveProperty("twin");
  });

  it("parses a verdict and a part mark", () => {
    const verdict = {
      correct: false,
      mistake_class: "neighbour_row",
      parts: [{ id: "g1", correct: false, mistake_class: "neighbour_row" }],
    };
    expect(Verdict.parse(verdict)).toEqual(verdict);
    expect(PartMark.parse({ id: "g1", correct: false })).toEqual({ id: "g1", correct: false });
  });
});

describe("JSON Schema", () => {
  for (const [name, schema] of Object.entries({
    FamilyQuestion,
    PageFamilyQuestion,
    AnswerValue,
    Help,
    Verdict,
  })) {
    it(`writes ${name} as JSON Schema`, () => {
      expect(z.toJSONSchema(schema)).toHaveProperty("$schema");
    });
  }
});
