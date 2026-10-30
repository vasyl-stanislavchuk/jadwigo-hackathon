// The number-line rule on fractions (dl-w3.55). The whole-number behaviour is held to the Python
// by the golden corpus (golden.test.ts); this file covers positions and steps that are not whole,
// where the 3 classes keep their meaning: off_by_tick, scale_misread and wrong_direction.
import { FamilyQuestion, QuestionType } from "@jadwigo/contracts";
import { GOLDEN_CASES } from "@jadwigo/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { judge } from "./judge.ts";
import type { Question } from "./question.ts";
import {
  applyRule,
  classify,
  classifyNumberLine,
  isNum,
  mistakeClassesOf,
  withinTolerance,
} from "./rules.ts";

const quarters = { rule: "number_line", mode: "place", min: 0, max: 1, step: 0.25 } as const;
const readQuarters = { ...quarters, mode: "read" } as const;

describe("classifyNumberLine on fractions", () => {
  it("one quarter either way is off_by_tick, the mirror is wrong_direction, else other_wrong", () => {
    expect(classifyNumberLine(quarters, 0.75, 0, 0.5)).toBe("off_by_tick");
    expect(classifyNumberLine(quarters, 0.75, 0, 1)).toBe("off_by_tick");
    expect(classifyNumberLine(quarters, 0.75, 0, 0.25)).toBe("wrong_direction");
    expect(classifyNumberLine(quarters, 0.5, 0, 1)).toBe("other_wrong");
  });

  it("read mode: the tick count typed instead of the value is scale_misread", () => {
    expect(classifyNumberLine(readQuarters, 0.75, 0, 3)).toBe("scale_misread");
    expect(classifyNumberLine(readQuarters, 0.75, 0, 0.25)).toBe("wrong_direction");
  });

  it("binary noise never decides: 0.1 + 0.2 is right for 0.3, and a hair past a tick is that tick", () => {
    const tenths = { ...quarters, step: 0.1 };
    expect(withinTolerance(0.1 + 0.2, 0.3, 0)).toBe(true);
    expect(() => classifyNumberLine(tenths, 0.3, 0, 0.1 + 0.2)).toThrow();
    expect(classifyNumberLine(tenths, 0.3, 0, 0.1 + 0.1 + 0.1 + 0.1)).toBe("off_by_tick");
  });

  it("a value that is not a finite number is other_wrong; whole numbers answer as before", () => {
    expect(classifyNumberLine(quarters, 0.75, 0, "x")).toBe("other_wrong");
    expect(classifyNumberLine(quarters, 0.75, 0, Number.NaN)).toBe("other_wrong");
    expect(isNum(0.5)).toBe(true);
    expect(isNum(Number.POSITIVE_INFINITY)).toBe(false);
    const tens = { ...quarters, max: 100, step: 10 };
    expect(applyRule(tens, 50, 40, 2)).toBe("off_by_tick");
    expect(applyRule(tens, 60, 40, 2)).toBe("wrong_direction");
  });
});

describe("classify", () => {
  it("gives every wrong whole number a class and refuses the right one", () => {
    const factor = fc.integer({ min: 1, max: 12 });
    fc.assert(
      fc.property(factor, factor, fc.integer({ min: -200, max: 200 }), (a, b, value) => {
        if (value === a * b) expect(() => classify(a, b, value, [])).toThrow();
        else expect(classify(a, b, value, [])).toMatch(/^[a-z_]+$/);
      }),
    );
  });

  it("calls a neighbouring row's product neighbour_row", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), fc.integer({ min: 2, max: 10 }), (a, b) => {
        expect(classify(a, b, a * (b + 1), [])).toBe("neighbour_row");
      }),
    );
  });
});

describe("mistakeClassesOf (dl-e8ov.5.38.15)", () => {
  const questionOf = (c: (typeof GOLDEN_CASES)[number]) => ({
    ...FamilyQuestion.parse(c.question),
    question_type: QuestionType.parse(c.question.question_type),
  });

  it("holds every class a judge gave the golden corpus, the step's and each part's", () => {
    const unlisted = new Set<string>();
    for (const c of GOLDEN_CASES) {
      const q = questionOf(c);
      if (q.family === "explain") continue;
      const v = judge(q, c.value);
      const listed = mistakeClassesOf(q);
      for (const cls of [v.mistake_class, ...v.parts.map((p) => p.mistake_class)])
        if (cls !== null && !listed.includes(cls)) unlisted.add(`${c.question_id} ${cls}`);
    }
    expect([...unlisted]).toEqual([]);
  });

  const enter = (key: object, data: object = {}) =>
    FamilyQuestion.parse({
      family: "enter",
      data: { input: "number", entry: "keypad", ...data },
      key: { accept: ["24"], ...key },
    });

  it("gives a bare whole-number key only other_wrong, and its near table's classes", () => {
    expect(mistakeClassesOf(enter({}))).toEqual(["other_wrong"]);
    expect(mistakeClassesOf(enter({ near: { "42": "digits_swapped" } }))).toEqual([
      "digits_swapped",
      "other_wrong",
    ]);
  });

  it("gives a times_table key classify()'s classes, and never a text or fraction class", () => {
    const rule = { rule: "times_table", a: 4, b: 6, recent: [] };
    const listed = mistakeClassesOf(enter({ rule }));
    expect(listed).toEqual([
      "add_for_multiply",
      "digit_reversal",
      "neighbour_row",
      "off_by_small",
      "other_wrong",
      "same_decade",
    ]);
    expect(mistakeClassesOf(enter({ rule: { ...rule, recent: [20] } }))).toContain(
      "neighbour_fact_swap",
    );
  });

  it("gives a text key its slips, as far as the key counts them", () => {
    const text = (key: object) =>
      mistakeClassesOf(
        FamilyQuestion.parse({
          family: "enter",
          data: { input: "text", entry: "keyboard" },
          key: { accept: ["żółw"], ...key },
        }),
      );
    expect(text({})).toEqual(["missing_diacritics", "other_wrong", "typo", "wrong_case"]);
    expect(text({ case: "ignore", accents: "ignore", typo: "accept" })).toEqual(["other_wrong"]);
  });

  it("holds every class a judged number miss gets on a rule key", () => {
    const rule = fc.oneof(
      fc.record({
        rule: fc.constant("times_table" as const),
        a: fc.integer({ min: 0, max: 12 }),
        b: fc.integer({ min: 0, max: 12 }),
        recent: fc.array(fc.integer({ min: 0, max: 144 }), { maxLength: 3 }),
      }),
      fc.record({
        rule: fc.constant("fill_blank" as const),
        template: fc.constantFrom("□×3=12", "4×□=12", "4×3=□", "□+3=7", "7-□=3"),
        operands: fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 2 }),
        op: fc.constantFrom("add" as const, "sub" as const, "mul" as const),
        recent: fc.array(fc.integer({ min: 0, max: 144 }), { maxLength: 3 }),
      }),
    );
    fc.assert(
      fc.property(
        rule,
        fc.integer({ min: 0, max: 144 }),
        fc.integer({ min: -10, max: 200 }),
        (r, answer, value) => {
          const accept = String(r.rule === "times_table" ? r.a * r.b : answer);
          const q = {
            ...enter({ accept: [accept], rule: r }),
            question_type: "production" as const,
          };
          const v = judge(q, { entered: String(value) });
          if (v.mistake_class !== null) expect(mistakeClassesOf(q)).toContain(v.mistake_class);
        },
      ),
    );
  });

  it("gives explain none, as it has no judge", () => {
    expect(mistakeClassesOf({ family: "explain", data: {}, key: {} } as never)).toEqual([]);
  });
});

/** Our own small questions, one per judge path the golden corpus never reaches, cast past the
 * presentational fields no judge reads. */
const opts = (ids: string[]) => ids.map((id) => ({ id, content: { kind: "text", text: id } }));
const OWN: { q: Question; value: fc.Arbitrary<unknown> }[] = [];
const own = (q: object, value: fc.Arbitrary<unknown>) =>
  OWN.push({ q: { question_type: "production", ...q } as unknown as Question, value });

const pick = (ids: string[]) => fc.subarray(ids).map((chosen) => ({ chosen }));
own(
  {
    family: "choose",
    data: { options: opts(["a", "b", "c", "d"]), select: "many", layout: "grid" },
    key: { correct: ["a", "b"], near: { c: "half_pick" } },
  },
  pick(["a", "b", "c", "d"]),
);
own(
  {
    family: "choose",
    data: { options: opts(["n1", "n2", "n3"]), select: "many", layout: "inline" },
    key: { correct: ["n1", "n2"] },
  },
  pick(["n1", "n2", "n3"]),
);

/** A typed entry near the key's forms: the forms, their case and marks changed, one letter off,
 * numbers around them, and a few expressions and fractions. */
function entered(accept: string[]): fc.Arbitrary<{ entered: string }> {
  const forms = accept.flatMap((a) => [
    a,
    a.toUpperCase(),
    a.toLowerCase(),
    a.normalize("NFD").replace(/\p{M}/gu, ""),
    `${a}x`,
    a.slice(1),
  ]);
  const pool = [
    ...forms,
    "",
    "abc",
    "2×5",
    "5×2",
    "3×5",
    "4+4",
    "2+2+2+2+2",
    "5+5",
    "10",
    "6=2×3",
    "2×3=6",
    "6=2×4",
    "7=2×3",
  ];
  return fc
    .oneof(
      fc.constantFrom(...pool),
      fc.constantFrom("1/2", "2/4", "3/2", "2/3", "1 1/2", "1 2/4", "6/4", "4/6"),
      fc.integer({ min: -5, max: 120 }).map(String),
    )
    .map((e) => ({ entered: e }));
}
const enterQ = (input: string, key: object, data: object = {}) =>
  own(
    { family: "enter", data: { input, entry: "keyboard", ...data }, key },
    entered((key as { accept: string[] }).accept),
  );
enterQ("text", { accept: ["żółw"], near: { zulw: "u_for_o" } });
enterQ("text", { accept: ["Kot"], case: "ignore", typo: "accept" });
enterQ("expression", { accept: ["2×5"], form: "product" });
enterQ("expression", { accept: ["2×5"], form: "sum" });
enterQ("expression", { accept: ["6=2×3"], sides: "kept" });
enterQ("fraction", { accept: ["3/2"], forms: ["mixed"] }, { simplify: "enforced" });
enterQ("fraction", { accept: ["1/2"] }, { simplify: "enforced" });
enterQ(
  "number",
  { accept: ["7"] },
  { figure: { kind: "ruler", unit: "cm", length: 10, pixels_per_unit: 20, picture: {} } },
);

own(
  {
    family: "slots",
    data: {
      template: "3 × 4 = {g1}, {g2}, {g3}",
      gaps: [
        { id: "g1", kind: "enter", input: "number" },
        { id: "g2", kind: "enter", input: "text" },
        { id: "g3", kind: "choose", options: opts(["x", "y"]) },
      ],
    },
    key: {
      gaps: {
        g1: {
          kind: "enter",
          accept: ["12"],
          rule: { rule: "times_table", a: 3, b: 4, recent: [] },
        },
        g2: { kind: "enter", accept: ["dwanaście"] },
        g3: { kind: "choose", correct: ["x"], near: { y: "picked_y" } },
      },
    },
  },
  fc
    .record({
      g1: fc.constantFrom("12", "13", "7", "21", "dwanaście", "", "x"),
      g2: fc.constantFrom("dwanaście", "dwanascie", "Dwanaście", "12", "dwanascie!", "trzy"),
      g3: fc.constantFrom("x", "y", "12"),
    })
    .map((gaps) => ({ gaps })),
);

const ids = ["i1", "i2", "i3", "i4"];
own(
  {
    family: "sequence",
    data: { items: ids.map((id) => ({ id, text: id })) },
    key: { orders: [ids] },
  },
  fc.oneof(fc.shuffledSubarray(ids, { minLength: 4 }), fc.shuffledSubarray(ids)),
);
own(
  {
    family: "sequence",
    data: {
      items: [],
      tiles: ["1", "2", "3", "+"].map((t, i) => ({ id: `t${i}`, text: t })),
      slots: 3,
    },
    key: { orders: [["t0", "t3", "t1"]] },
  },
  fc.array(fc.constantFrom("t0", "t1", "t2", "t3"), { maxLength: 4 }),
);
own(
  {
    family: "group",
    data: {
      groups: [
        { id: "even", label: "" },
        { id: "odd", label: "" },
      ],
      items: [
        { id: "n2", label: "" },
        { id: "n3", label: "" },
      ],
      each_item: "one",
    },
    key: { items: { n2: ["even"], n3: ["odd"] }, near: { n3: { even: "odd_for_even" } } },
  },
  fc
    .record({ n2: fc.subarray(["even", "odd"]), n3: fc.subarray(["even", "odd"]) })
    .map((items) => ({ items })),
);

const place = (data: object, key: object, value: fc.Arbitrary<unknown>) =>
  own({ family: "place", data, key }, value);
const tens = { rule: "number_line", mode: "place", min: 0, max: 100, step: 10 } as const;
place(
  { surface: "number_line", min: 0, max: 100, step: 10 },
  { surface: "number_line", value: 40, tolerance: 2, rule: tens },
  fc.integer({ min: -10, max: 110 }).map((at) => ({ at })),
);
place(
  { surface: "number_line", min: 0, max: 100, step: 10 },
  { surface: "number_line", value: 40, tolerance: 2 },
  fc.integer({ min: -10, max: 110 }).map((at) => ({ at })),
);
const square = (x: number, y: number) => [
  { x, y },
  { x: x + 10, y },
  { x: x + 10, y: y + 10 },
  { x, y: y + 10 },
];
place(
  { surface: "image" },
  {
    surface: "image",
    targets: [
      { id: "a", polygon: square(0, 0) },
      { id: "b", polygon: square(20, 0) },
    ],
    near: [{ id: "c", polygon: square(40, 0), mistake_class: "tapped_c" }],
    require_all: true,
  },
  fc
    .array(fc.record({ x: fc.integer({ min: 0, max: 60 }), y: fc.integer({ min: 0, max: 12 }) }), {
      minLength: 1,
      maxLength: 3,
    })
    .map((points) => ({ points })),
);
const gridValue = fc.record({
  rows: fc.integer({ min: 1, max: 6 }),
  cols: fc.integer({ min: 1, max: 6 }),
});
place(
  { surface: "grid" },
  { surface: "grid", rows: 3, cols: 4, either_order: true, off_by_one: true },
  gridValue,
);
place(
  { surface: "grid", split: "one" },
  { surface: "grid", rows: 3, cols: 4, either_order: false, split: {} },
  fc.record({
    rows: fc.integer({ min: 2, max: 4 }),
    cols: fc.integer({ min: 3, max: 5 }),
    split: fc.option(
      fc.record({ at: fc.integer({ min: 0, max: 5 }), axis: fc.constantFrom("rows", "cols") }),
      { nil: undefined },
    ),
  }),
);
place(
  { surface: "bars", step: 1 },
  { surface: "bars", heights: { a: 3, b: 5 } },
  fc
    .record({ a: fc.integer({ min: 0, max: 8 }), b: fc.integer({ min: 0, max: 8 }) })
    .map((heights) => ({ heights })),
);
const clockValue = fc.record({
  hour_at: fc.integer({ min: 0, max: 59 }),
  m: fc.integer({ min: 0, max: 59 }),
});
place(
  { surface: "clock", minute_step: 5, hands: "free" },
  { surface: "clock", h: 3, m: 30 },
  clockValue,
);
place(
  { surface: "clock", minute_step: 15, hands: "geared" },
  { surface: "clock", h: 9, m: 15 },
  clockValue,
);
place(
  { surface: "coins", bank: ["gr2", "gr5", "gr50", "zl1", "zl2", "zl5"] },
  { surface: "coins", amount_gr: 700, fewest: true },
  fc
    .oneof(
      fc.constant(["gr5", "gr2"]),
      fc.array(fc.constantFrom("gr2", "gr5", "gr50", "zl1", "zl2", "zl5"), {
        minLength: 1,
        maxLength: 6,
      }),
    )
    .map((items) => ({ items })),
);
place(
  { surface: "fraction", parts: 6, contiguous: true },
  { surface: "fraction", count: 2 },
  fc.uniqueArray(fc.integer({ min: 0, max: 5 })).map((shaded) => ({ shaded })),
);

describe("mistakeClassesOf on our own questions", () => {
  it.each(OWN.map((o, i) => [i, o.q.family, o] as const))(
    "%i %s: every class a judge gives a value is listed",
    (_, __, { q, value }) => {
      const listed = mistakeClassesOf(q);
      fc.assert(
        fc.property(value, (v) => {
          const verdict = judge(q, v);
          for (const cls of [verdict.mistake_class, ...verdict.parts.map((p) => p.mistake_class)])
            if (cls !== null) expect(listed).toContain(cls);
        }),
        { numRuns: 400 },
      );
    },
  );
});
