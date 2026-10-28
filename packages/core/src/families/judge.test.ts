// The dispatcher's cases, family by family. Explain's criteria judging stays
// in the playground: v0 keeps Explain without a verdict, so the last block checks only that.
import { describe, expect, it } from "vitest";
import { judge, pageMarks, solutionOf } from "./judge.ts";
import type { Question } from "./question.ts";

type Of<F extends Question["family"]> = Extract<Question, { family: F }>;

const choose = (
  select: "one" | "many",
  correct: string[],
  question_type: Of<"choose">["question_type"] = select === "one" ? "recognition" : "multi_select",
): Of<"choose"> => ({
  question_type,
  family: "choose",
  data: {
    options: ["o1", "o2", "o3", "o4"].map((id, i) => ({
      id,
      content: { kind: "number", number: 40 + i },
    })),
    select,
    layout: select === "one" ? "grid" : "list",
  },
  key: { correct, near: { o2: "neighbour_row" } },
});

describe("Choose", () => {
  it("one: right, a near class, other_wrong, and a broken value", () => {
    const q = choose("one", ["o1"]);
    expect(judge(q, { chosen: ["o1"] })).toEqual({ correct: true, mistake_class: null, parts: [] });
    expect(judge(q, { chosen: ["o2"] }).mistake_class).toBe("neighbour_row");
    expect(judge(q, { chosen: ["o3"] }).mistake_class).toBe("other_wrong");
    expect(judge(q, { chosen: ["zz"] }).mistake_class).toBe("other_wrong");
    expect(judge(q, 41).correct).toBe(false);
  });

  it("one: marks the option tried, which the verdict already called wrong", () => {
    const q = choose("one", ["o1"]);
    const v = judge(q, { chosen: ["o3"] });
    expect(pageMarks(q, { chosen: ["o3"] }, v)).toEqual([{ id: "o3", correct: false }]);
  });

  it("many: a part per option, wrong picks and missed options", () => {
    const q = choose("many", ["o1", "o3"]);
    const v = judge(q, { chosen: ["o1", "o2"] });
    expect(v.correct).toBe(false);
    expect(v.parts).toEqual([
      { id: "o1", correct: true, mistake_class: null },
      { id: "o2", correct: false, mistake_class: "neighbour_row" },
      { id: "o3", correct: false, mistake_class: "missed_option" },
      { id: "o4", correct: true, mistake_class: null },
    ]);
    expect(judge(q, { chosen: ["o3", "o1"] }).correct).toBe(true);
  });

  it("many: marks only the wrong picks, and the whole question when only an option was missed", () => {
    const q = choose("many", ["o1", "o3"]);
    const wrongPick = { chosen: ["o1", "o2"] };
    expect(pageMarks(q, wrongPick, judge(q, wrongPick))).toEqual([{ id: "o2", correct: false }]);
    const missedOnly = { chosen: ["o1"] };
    expect(pageMarks(q, missedOnly, judge(q, missedOnly))).toBeNull();
  });

  it("the solution is the right options", () => {
    expect(solutionOf(choose("many", ["o1", "o3"]))).toEqual({ chosen: ["o1", "o3"] });
  });
});

describe("Enter", () => {
  const production: Of<"enter"> = {
    question_type: "production",
    family: "enter",
    data: { input: "number", entry: "keypad" },
    key: { accept: ["56"], rule: { rule: "times_table", a: 7, b: 8, recent: [] } },
  };
  const text: Of<"enter"> = {
    question_type: "short_text",
    family: "enter",
    data: { input: "text", entry: "keyboard", code: true },
    key: { accept: ["bd ready"], near: { "bd list": "shows_everything" } },
  };

  it("numbers: digits as typed, leading zeros, the times-table rule for a miss", () => {
    expect(judge(production, { entered: "56" }).correct).toBe(true);
    expect(judge(production, { entered: "056" }).correct).toBe(true);
    expect(judge(production, { entered: "49" }).mistake_class).toBe("neighbour_row");
    expect(judge(production, { entered: "15" }).mistake_class).toBe("add_for_multiply");
    expect(judge(production, { entered: "abc" }).mistake_class).toBe("other_wrong");
    expect(judge(production, { entered: "" }).correct).toBe(false);
  });

  it("text: spaces at the ends do not count, case does, near classes apply", () => {
    expect(judge(text, { entered: "  bd ready " }).correct).toBe(true);
    expect(judge(text, { entered: "BD ready" }).correct).toBe(false);
    expect(
      judge({ ...text, key: { ...text.key, case: "ignore" } }, { entered: "BD ready" }).correct,
    ).toBe(true);
    expect(judge(text, { entered: "bd list" }).mistake_class).toBe("shows_everything");
  });

  it("a tolerance widens a number", () => {
    const q: Of<"enter"> = { ...production, key: { accept: ["50"], tolerance: 2 } };
    expect(judge(q, { entered: "52" }).correct).toBe(true);
    expect(judge(q, { entered: "53" }).correct).toBe(false);
  });

  it("marks the whole question, and the solution is the first accepted form", () => {
    expect(
      pageMarks(production, { entered: "49" }, judge(production, { entered: "49" })),
    ).toBeNull();
    expect(solutionOf(production)).toEqual({ entered: "56" });
  });
});

describe("Gaps", () => {
  const q: Of<"slots"> = {
    question_type: "fill_gaps",
    family: "slots",
    data: {
      template: "{g1} × {g2} = 42, so {g3}",
      gaps: [
        { id: "g1", kind: "enter", input: "number" },
        { id: "g2", kind: "enter", input: "number" },
        {
          id: "g3",
          kind: "choose",
          options: [
            { id: "c1", label: "even" },
            { id: "c2", label: "odd" },
          ],
        },
      ],
    },
    key: {
      gaps: {
        g1: { kind: "enter", accept: ["6"] },
        g2: { kind: "enter", accept: ["7"], near: { "8": "off_by_one" } },
        g3: { kind: "choose", correct: ["c1"] },
      },
    },
  };

  it("judges every gap and names the first miss", () => {
    const v = judge(q, { gaps: { g1: "6", g2: "8", g3: "c1" } });
    expect(v.correct).toBe(false);
    expect(v.mistake_class).toBe("off_by_one");
    expect(v.parts.map((p) => p.correct)).toEqual([true, false, true]);
    expect(judge(q, { gaps: { g1: "6", g2: "7", g3: "c1" } }).correct).toBe(true);
  });

  it("an answer that belongs in another gap is gap_swap", () => {
    expect(
      judge(q, { gaps: { g1: "7", g2: "6", g3: "c1" } }).parts.map((p) => p.mistake_class),
    ).toEqual(["gap_swap", "gap_swap", null]);
  });

  it("a one-gap fill_gaps (the old fill_blank) keeps the fill_blank rule", () => {
    const blank: Of<"slots"> = {
      question_type: "fill_gaps",
      family: "slots",
      data: { template: "{g1} × 7 = 42", gaps: [{ id: "g1", kind: "enter", input: "number" }] },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["6"],
            rule: {
              rule: "fill_blank",
              template: "□ × 7 = 42",
              operands: [7, 42],
              op: "mul",
              recent: [],
            },
          },
        },
      },
    };
    expect(judge(blank, { gaps: { g1: "294" } }).mistake_class).toBe("inverse_confusion");
  });

  it("marks every gap, right and wrong; the solution fills every gap", () => {
    const value = { gaps: { g1: "6", g2: "8", g3: "c2" } };
    expect(pageMarks(q, value, judge(q, value))).toEqual([
      { id: "g1", correct: true },
      { id: "g2", correct: false },
      { id: "g3", correct: false },
    ]);
    expect(solutionOf(q)).toEqual({ gaps: { g1: "6", g2: "7", g3: "c1" } });
  });
});

describe("Sequence", () => {
  const q: Of<"sequence"> = {
    question_type: "order",
    family: "sequence",
    data: {
      items: ["a", "b", "c", "d"].map((id) => ({ id, text: id.toUpperCase() })),
      first_label: "smallest",
      last_label: "largest",
    },
    key: { orders: [["a", "b", "c", "d"]] },
  };

  it("one class for the whole order, the most specific first", () => {
    expect(judge(q, ["a", "b", "c", "d"]).correct).toBe(true);
    expect(judge(q, ["d", "c", "b", "a"]).mistake_class).toBe("reversed");
    expect(judge(q, ["a", "c", "b", "d"]).mistake_class).toBe("swapped_neighbours");
    expect(judge(q, ["b", "c", "a", "d"]).mistake_class).toBe("one_misplaced");
    expect(judge(q, ["c", "d", "a", "b"]).mistake_class).toBe("other_order");
    expect(judge(q, ["a", "b"]).mistake_class).toBe("other_wrong");
  });

  it("accepts any listed order and classifies against the nearest", () => {
    const two: Of<"sequence"> = {
      ...q,
      key: {
        orders: [
          ["a", "b", "c", "d"],
          ["b", "a", "c", "d"],
        ],
      },
    };
    expect(judge(two, ["b", "a", "c", "d"]).correct).toBe(true);
    expect(judge(two, ["b", "a", "d", "c"]).mistake_class).toBe("swapped_neighbours");
  });

  it("never marks a position", () => {
    expect(pageMarks(q, ["a", "c", "b", "d"], judge(q, ["a", "c", "b", "d"]))).toBeNull();
  });
});

describe("Group", () => {
  const groups = (n: number): Of<"group"> => ({
    question_type: "bucket",
    family: "group",
    data: {
      groups: ["even", "odd", "prime"].slice(0, n).map((id) => ({ id, label: id })),
      items: [
        { id: "i4", label: "4" },
        { id: "i9", label: "9" },
      ],
      each_item: "one",
    },
    key: { items: { i4: ["even"], i9: ["odd"] }, near: { i9: { even: "last_digit_ignored" } } },
  });

  it("a part per item: right, a near class, not placed", () => {
    const v = judge(groups(2), { items: { i4: ["even"], i9: ["even"] } });
    expect(v.parts).toEqual([
      { id: "i4", correct: true, mistake_class: null },
      { id: "i9", correct: false, mistake_class: "last_digit_ignored" },
    ]);
    expect(judge(groups(2), { items: { i4: ["even"] } }).mistake_class).toBe("not_placed");
  });

  it("two groups mark the whole question; three or more mark the items", () => {
    const value = { items: { i4: ["even"], i9: ["even"] } };
    expect(pageMarks(groups(2), value, judge(groups(2), value))).toBeNull();
    expect(pageMarks(groups(3), value, judge(groups(3), value))).toEqual([
      { id: "i4", correct: true },
      { id: "i9", correct: false },
    ]);
  });
});

describe("Place", () => {
  const square = [
    { x: 0.1, y: 0.1 },
    { x: 0.4, y: 0.1 },
    { x: 0.4, y: 0.4 },
    { x: 0.1, y: 0.4 },
  ];
  const hotspot: Of<"place"> = {
    question_type: "hotspot",
    family: "place",
    data: { surface: "image", image: "shapes.svg", image_alt: "Four shapes", taps: 1 },
    key: {
      surface: "image",
      targets: [{ id: "r1", polygon: square }],
      near: [
        {
          id: "r2",
          polygon: square.map((p) => ({ x: p.x + 0.5, y: p.y })),
          mistake_class: "rectangle_for_square",
        },
      ],
      require_all: true,
    },
  };

  it("a picture: a part per tap, near regions and missed taps", () => {
    expect(judge(hotspot, { points: [{ x: 0.2, y: 0.2 }] }).correct).toBe(true);
    expect(judge(hotspot, { points: [{ x: 0.7, y: 0.2 }] }).mistake_class).toBe(
      "rectangle_for_square",
    );
    expect(judge(hotspot, { points: [{ x: 0.95, y: 0.95 }] }).mistake_class).toBe("missed_region");
  });

  it("a picture's solution taps inside every target, even a region whose middle is outside it", () => {
    // An L whose corners' mean (0.3, 0.3) lies in the cut-out corner.
    const ell = [
      { x: 0, y: 0 },
      { x: 0.6, y: 0 },
      { x: 0.6, y: 0.2 },
      { x: 0.2, y: 0.2 },
      { x: 0.2, y: 0.6 },
      { x: 0, y: 0.6 },
    ];
    const two: Of<"place"> = {
      ...hotspot,
      data: { surface: "image", image: "shapes.svg", image_alt: "Four shapes", taps: 2 },
      key: {
        surface: "image",
        targets: [
          { id: "r1", polygon: square },
          { id: "r2", polygon: ell },
        ],
        require_all: true,
      },
    };
    expect(judge(two, solutionOf(two)).correct).toBe(true);
    expect(judge(hotspot, solutionOf(hotspot)).correct).toBe(true);
  });

  it("a number line uses its rule; a grid takes either order", () => {
    const line: Of<"place"> = {
      question_type: "number_line_place",
      family: "place",
      data: { surface: "number_line", min: 0, max: 100, step: 10, labelled: [0, 100] },
      key: {
        surface: "number_line",
        value: 40,
        tolerance: 2,
        rule: { rule: "number_line", mode: "place", min: 0, max: 100, step: 10 },
      },
    };
    expect(judge(line, { at: 41 }).correct).toBe(true);
    expect(judge(line, { at: 50 }).mistake_class).toBe("off_by_tick");
    // A fraction on the line (dl-w3.55): the marker's snap position need not be whole.
    const quarters: Of<"place"> = {
      ...line,
      data: {
        surface: "number_line",
        min: 0,
        max: 1,
        step: 0.25,
        labelled: [0, 1],
        tick_label: "fraction",
      },
      key: {
        surface: "number_line",
        value: 0.75,
        tolerance: 0,
        rule: { rule: "number_line", mode: "place", min: 0, max: 1, step: 0.25 },
      },
    };
    expect(judge(quarters, { at: 0.75 }).correct).toBe(true);
    expect(judge(quarters, { at: 0.25 + 0.25 + 0.25 }).correct).toBe(true);
    expect(judge(quarters, { at: 0.5 }).mistake_class).toBe("off_by_tick");
    expect(judge(quarters, { at: 0.25 }).mistake_class).toBe("wrong_direction");
    expect(judge(quarters, { at: "half" }).mistake_class).toBe("other_wrong");
    expect(solutionOf(quarters)).toEqual({ at: 0.75 });
    // A Khan line of sixths (dl-w3.70.2): the key sits on a tick, judged exactly; binary noise
    // between 0.6666666666666666 and the marker's tidied 0.6666666667 never decides it.
    const sixths: Of<"place"> = {
      ...line,
      data: {
        surface: "number_line",
        min: 0,
        max: 2,
        step: 1 / 6,
        labelled: [0, 2],
        tick_label: "non-reduced",
      },
      key: {
        surface: "number_line",
        value: 2 / 3,
        tolerance: 0,
        rule: { rule: "number_line", mode: "place", min: 0, max: 2, step: 1 / 6 },
      },
    };
    expect(judge(sixths, { at: 0.6666666667 }).correct).toBe(true);
    expect(judge(sixths, { at: 0.7 }).correct).toBe(false);
    expect(judge(sixths, { at: 0.5 }).mistake_class).toBe("off_by_tick");
    const grid: Of<"place"> = {
      question_type: "spatial_build",
      family: "place",
      data: { surface: "grid", size: 10, label: "3 × 4" },
      key: { surface: "grid", rows: 3, cols: 4, either_order: true },
    };
    expect(judge(grid, { rows: 4, cols: 3 }).correct).toBe(true);
    expect(solutionOf(grid)).toEqual({ rows: 3, cols: 4 });
  });
});

describe("Place on bars (dl-w3.51.3)", () => {
  const graph: Of<"place"> = {
    question_type: "draw_graph",
    family: "place",
    data: {
      surface: "bars",
      kind: "bar",
      categories: [
        { id: "a", label: "apples" },
        { id: "b", label: "pears" },
        { id: "c", label: "plums" },
      ],
      max: 12,
      step: 2,
      tick: 2,
    },
    key: { surface: "bars", heights: { a: 6, b: 4, c: 8 } },
  };

  it("a part per bar: right, one step off, or wrong; the first missed bar names the class", () => {
    expect(judge(graph, { heights: { a: 6, b: 4, c: 8 } })).toEqual({
      correct: true,
      mistake_class: null,
      parts: [
        { id: "a", correct: true, mistake_class: null },
        { id: "b", correct: true, mistake_class: null },
        { id: "c", correct: true, mistake_class: null },
      ],
    });
    const off = judge(graph, { heights: { a: 6, b: 6, c: 8 } });
    expect(off.correct).toBe(false);
    expect(off.mistake_class).toBe("bar_off_by_step");
    expect(off.parts.map((p) => p.correct)).toEqual([true, false, true]);
    expect(judge(graph, { heights: { a: 6, b: 10, c: 8 } }).mistake_class).toBe("bar_wrong");
    expect(judge(graph, { heights: { a: 10, b: 6, c: 8 } }).mistake_class).toBe("bar_wrong");
    // A bar left out is a missed bar, never a crash; a value of the wrong shape is other_wrong.
    expect(judge(graph, { heights: { a: 6, b: 4 } }).parts[2]).toEqual({
      id: "c",
      correct: false,
      mistake_class: "bar_wrong",
    });
    expect(judge(graph, { at: 3 }).mistake_class).toBe("other_wrong");
  });

  it("a tolerance widens what counts; the marks name each bar; the solution is the key", () => {
    const loose: Of<"place"> = {
      ...graph,
      key: { surface: "bars", heights: { a: 6, b: 4, c: 8 }, tolerance: 2 },
    };
    expect(judge(loose, { heights: { a: 8, b: 4, c: 6 } }).correct).toBe(true);
    expect(judge(loose, { heights: { a: 10, b: 4, c: 8 } }).mistake_class).toBe("bar_off_by_step");
    const miss = judge(graph, { heights: { a: 6, b: 6, c: 0 } });
    expect(pageMarks(graph, { heights: { a: 6, b: 6, c: 0 } }, miss)).toEqual([
      { id: "a", correct: true },
      { id: "b", correct: false },
      { id: "c", correct: false },
    ]);
    expect(solutionOf(graph)).toEqual({ heights: { a: 6, b: 4, c: 8 } });
  });
});

describe("Explain", () => {
  const explain: Of<"explain"> = {
    question_type: "explain",
    family: "explain",
    data: { input: "text" },
    key: {
      criteria: [{ id: "k1", text: "Names the rule", cite: "invented" }],
      criteria_version: "v1",
    },
  };

  it("has no code judge in v0, and no solution", () => {
    expect(() => judge(explain, { text: "Because 3 × 4 is 4 × 3." })).toThrow();
    expect(solutionOf(explain)).toBeNull();
  });
});
