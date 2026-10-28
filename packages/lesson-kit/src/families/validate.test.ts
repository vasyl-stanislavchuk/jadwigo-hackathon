import { describe, expect, it } from "vitest";
import { must } from "../parts/must.ts";
import type { Figure } from "./enter/model.ts";
import { Family, QuestionType, Surface } from "./names.ts";
import type { PlaceData, PlaceKey } from "./place/model.ts";
import type { FamilySpec, SpecOf } from "./types.ts";
import { validate } from "./validate.ts";

const base = { id: "s1", say: "Which one is right?" };
const rules = (spec: FamilySpec) => validate(spec).map((p) => p.rule);

const choose: SpecOf<typeof Family.Choose> = {
  ...base,
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    options: [
      { id: "o1", content: { kind: "number", number: 56 } },
      { id: "o2", content: { kind: "number", number: 49 } },
    ],
    select: "one",
    layout: "grid",
  },
  key: { correct: ["o1"], near: { o2: "neighbour_row" } },
};

describe("validate", () => {
  it("a sound step has no problems", () => {
    expect(validate(choose)).toEqual([]);
  });

  it("Choose: too few options, an unknown key id, two right in a single choice", () => {
    expect(
      rules({ ...choose, data: { ...choose.data, options: choose.data.options.slice(0, 1) } }),
    ).toContain("too_few_options");
    expect(rules({ ...choose, key: { correct: ["zz"] } })).toContain("unknown_id");
    expect(rules({ ...choose, key: { correct: ["o1", "o2"] } })).toContain("one_right_option");
  });

  it("Choose: a distractor with no mistake behind it is a warning", () => {
    const problems = validate({ ...choose, key: { correct: ["o1"] } });
    expect(problems).toEqual([
      expect.objectContaining({ rule: "distractor_unexplained", level: "warning" }),
    ]);
  });

  it("say may not speak the answer", () => {
    expect(rules({ ...choose, say: "Is it 56?" })).toContain("key_in_say");
    expect(rules({ ...choose, say: "Is it 156?" })).not.toContain("key_in_say");
  });

  it("say never holds TeX: the voice reads it aloud", () => {
    expect(rules({ ...choose, say: "Ile to $7 \\times 8$?" })).toContain("tex_in_say");
    expect(rules({ ...choose, say: "Ile to \\blueD{7} razy 8?" })).toContain("tex_in_say");
    expect(rules({ ...choose, say: "Ile to 7 × 8?" })).not.toContain("tex_in_say");
    expect(
      validate({ ...choose, say: "Ile to $7$?" }).find((p) => p.rule === "tex_in_say"),
    ).toMatchObject({ path: "say", level: "error" });
  });

  it("labels: empty and placeholder text", () => {
    const text = (t: string): SpecOf<typeof Family.Choose> => ({
      ...choose,
      data: {
        ...choose.data,
        options: [{ id: "o1", content: { kind: "text", text: t } }, must(choose.data.options[1])],
      },
    });
    expect(rules(text(" "))).toContain("empty_label");
    expect(rules(text("Example item"))).toContain("placeholder");
  });

  it("Enter: an accepted form is required, digits for a number", () => {
    const enter: SpecOf<typeof Family.Enter> = {
      ...base,
      question_type: QuestionType.Production,
      family: Family.Enter,
      data: { input: "number", entry: "keypad" },
      key: { accept: ["56"] },
    };
    expect(validate(enter)).toEqual([]);
    expect(rules({ ...enter, key: { accept: [] } })).toContain("no_accepted_form");
    expect(rules({ ...enter, key: { accept: ["fifty"] } })).toContain("not_a_number");
  });

  it("Gaps: markers and gaps match one to one, every gap has a key of its kind", () => {
    const gaps: SpecOf<typeof Family.Slots> = {
      ...base,
      question_type: QuestionType.FillGaps,
      family: Family.Slots,
      data: {
        template: "{g1} and {g2}",
        gaps: [
          { id: "g1", kind: Family.Enter, input: "text" },
          { id: "g3", kind: Family.Choose, options: [{ id: "c1", label: "x" }] },
        ],
      },
      key: { gaps: { g1: { kind: Family.Choose, correct: ["c1"] } } },
    };
    expect(rules(gaps)).toEqual(
      expect.arrayContaining([
        "marker_without_gap",
        "gap_without_marker",
        "key_kind",
        "missing_key",
      ]),
    );
    // A table's rows are as wide as its header (dl-w3.51.5); a placed gap needs a picture and a place on it (dl-w3.51.2).
    const table: SpecOf<typeof Family.Slots> = {
      ...gaps,
      data: {
        template: "",
        table: { header: ["a", "b"], rows: [["1", "{g1}"], ["2"]] },
        gaps: [{ id: "g1", kind: Family.Enter, input: "number" }],
      },
      key: { gaps: { g1: { kind: Family.Enter, accept: ["3"] } } },
    };
    expect(rules(table)).toEqual(["ragged_table"]);
    const placed: SpecOf<typeof Family.Slots> = {
      ...gaps,
      data: {
        template: "",
        gaps: [
          {
            id: "g1",
            kind: Family.Choose,
            at: { x: 120, y: 10 },
            options: [
              { id: "c1", label: "a" },
              { id: "c2", label: "b" },
            ],
          },
        ],
      },
      key: { gaps: { g1: { kind: Family.Choose, correct: ["c1"] } } },
    };
    expect(rules(placed)).toContain("at_without_picture");
    expect(
      rules({
        ...placed,
        data: { ...placed.data, picture: { src: "x.svg", alt: "A line.", width: 10, height: 10 } },
      }),
    ).toEqual(["off_the_picture"]);
  });

  it("Sequence: three items, distinct text, every order a permutation", () => {
    const seq: SpecOf<typeof Family.Sequence> = {
      ...base,
      question_type: QuestionType.Order,
      family: Family.Sequence,
      data: {
        items: [
          { id: "a", text: "1" },
          { id: "b", text: "1" },
        ],
        first_label: "first",
        last_label: "last",
      },
      key: { orders: [["a"]] },
    };
    expect(rules(seq)).toEqual(
      expect.arrayContaining(["too_few_items", "duplicate_text", "not_an_order"]),
    );
  });

  it("Sequence: twin cards are judged only when every swap of them is accepted (dl-w3.70.12)", () => {
    const twins: SpecOf<typeof Family.Sequence> = {
      ...base,
      question_type: QuestionType.Order,
      family: Family.Sequence,
      data: {
        items: [
          { id: "c", text: "5" },
          { id: "b", text: "2" },
          { id: "a", text: "2" },
        ],
        first_label: "first",
        last_label: "last",
      },
      key: { orders: [["a", "b", "c"]] },
    };
    expect(rules(twins)).toContain("duplicate_text");
    expect(
      rules({
        ...twins,
        key: {
          orders: [
            ["a", "b", "c"],
            ["b", "a", "c"],
          ],
        },
      }),
    ).not.toContain("duplicate_text");
  });

  it("Group: two groups, every item mapped, one group each, capacity", () => {
    const group: SpecOf<typeof Family.Group> = {
      ...base,
      question_type: QuestionType.Match,
      family: Family.Group,
      data: {
        groups: [{ id: "x", label: "X", capacity: 1 }],
        items: [
          { id: "i1", label: "1" },
          { id: "i2", label: "2" },
          { id: "i3", label: "3" },
        ],
        each_item: "one",
      },
      key: { items: { i1: ["x"], i2: ["x", "y"] } },
    };
    expect(rules(group)).toEqual(
      expect.arrayContaining(["too_few_groups", "item_unmapped", "unknown_id"]),
    );
    expect(rules({ ...group, key: { items: { i1: ["x"], i2: ["x"], i3: ["x"] } } })).toContain(
      "over_capacity",
    );
  });

  it("a glossary term (dl-w3.56): never in say, and its meaning never holds the answer", () => {
    expect(rules({ ...choose, say: "Which is [odd](def: not even)?" })).toContain("term_in_say");
    const stem = (text: string): SpecOf<typeof Family.Choose> => ({
      ...choose,
      data: { ...choose.data, stem: { text } },
    });
    expect(validate(stem("Which is [even](def: it splits into two equal parts)?"))).toEqual([]);
    expect(rules(stem("Which is [even](def: a number like 56)?"))).toContain("key_in_term");
    expect(rules(stem("Which is [even](def: 7 × 8 = 56)?"))).toContain("key_in_term");
    const help = {
      ...choose,
      help: { look: { text: "Think of [pairs](def: 56 is twenty-eight pairs)" } },
    };
    expect(rules(help)).toContain("key_in_term");
    expect(
      validate({ ...choose, help: { look: { text: "Think of [pairs](def: two of a kind)" } } }),
    ).toEqual([]);
  });

  it("Place on a line: the step divides the line, the snap divides the step, the key sits on a snap", () => {
    const data: Extract<PlaceData, { surface: typeof Surface.NumberLine }> = {
      surface: Surface.NumberLine,
      min: 0,
      max: 1,
      step: 0.25,
      labelled: [0, 1],
      tick_label: "fraction",
    };
    const key: Extract<PlaceKey, { surface: typeof Surface.NumberLine }> = {
      surface: Surface.NumberLine,
      value: 0.75,
      tolerance: 0,
    };
    const line = (
      d: Partial<typeof data>,
      k: Partial<typeof key> = {},
    ): SpecOf<typeof Family.Place> => ({
      ...base,
      question_type: QuestionType.NumberLinePlace,
      family: Family.Place,
      data: { ...data, ...d },
      key: { ...key, ...k },
    });
    expect(validate(line({}))).toEqual([]);
    expect(validate(line({ snap: 0.125 }))).toEqual([]);
    expect(rules(line({}, { value: 0.7 }))).toContain("key_off_snap");
    expect(rules(line({ snap: 0.1 }))).toContain("snap_off_step");
    expect(rules(line({ snap: 0 }))).toContain("bad_snap");
    expect(validate(line({ step: 0.3 }, { value: 0.6 })).map((p) => [p.rule, p.level])).toEqual([
      ["step_off_line", "warning"],
    ]);
    expect(rules(line({ min: 1, max: 0 }))).toContain("bad_scale");
    expect(rules(line({}, { value: 2 }))).toContain("off_the_line");
  });

  it("Enter reading a line: the marker sits on a tick", () => {
    const figure: Extract<Figure, { kind: "number_line" }> = {
      kind: "number_line",
      min: 0,
      max: 1,
      step: 0.25,
      labelled: [0, 1],
      marker: 0.75,
      tick_label: "fraction",
    };
    const read = (f: Partial<typeof figure>): SpecOf<typeof Family.Enter> => ({
      ...base,
      question_type: QuestionType.Production,
      family: Family.Enter,
      data: { input: "fraction", entry: "keypad", figure: { ...figure, ...f } },
      key: { accept: ["3/4"] },
    });
    expect(validate(read({}))).toEqual([]);
    expect(rules(read({ marker: 0.7 }))).toContain("marker_off_tick");
  });

  it("Place: alt text and closed regions inside the picture", () => {
    const place: SpecOf<typeof Family.Place> = {
      ...base,
      question_type: QuestionType.Hotspot,
      family: Family.Place,
      data: { surface: Surface.Image, image: "p.svg", image_alt: "", taps: 1 },
      key: {
        surface: Surface.Image,
        targets: [
          {
            id: "r1",
            polygon: [
              { x: 0, y: 0 },
              { x: 1.2, y: 0 },
            ],
          },
        ],
        require_all: false,
      },
    };
    expect(rules(place)).toEqual(
      expect.arrayContaining(["missing_alt", "open_polygon", "outside_image"]),
    );
  });

  it("Explain: criteria, each cited, and a version", () => {
    const explain: SpecOf<typeof Family.Explain> = {
      ...base,
      question_type: QuestionType.Explain,
      family: Family.Explain,
      data: { input: "both" },
      key: { criteria: [{ id: "k1", text: "Names the rule", cite: "" }], criteria_version: "" },
    };
    expect(rules(explain)).toEqual(expect.arrayContaining(["uncited", "unversioned"]));
  });
});

describe("Place on bars (dl-w3.51.3)", () => {
  const data: Extract<PlaceData, { surface: typeof Surface.Bars }> = {
    surface: Surface.Bars,
    kind: "bar",
    categories: [
      { id: "a", label: "apples" },
      { id: "b", label: "pears" },
    ],
    max: 12,
    step: 1,
    tick: 2,
  };
  const key: Extract<PlaceKey, { surface: typeof Surface.Bars }> = {
    surface: Surface.Bars,
    heights: { a: 6, b: 4 },
  };
  const graph = (
    d: Partial<typeof data>,
    k: Partial<typeof key> = {},
  ): SpecOf<typeof Family.Place> => ({
    ...base,
    question_type: QuestionType.DrawGraph,
    family: Family.Place,
    data: { ...data, ...d },
    key: { ...key, ...k },
  });

  it("the scale: a step that divides max, a tick of whole steps that divides max, whole pictures", () => {
    expect(rules(graph({}))).toEqual([]);
    expect(rules(graph({ step: 5 }))).toContain("bad_scale");
    expect(rules(graph({ max: 0 }))).toContain("bad_scale");
    expect(rules(graph({ tick: 5 }))).toContain("tick_off_scale");
    expect(rules(graph({ step: 2, tick: 3, max: 12 }))).toContain("tick_off_scale");
    expect(rules(graph({ kind: "picture", step: 1, tick: 2 }))).toContain("picture_step");
    expect(rules(graph({ kind: "picture", step: 1, tick: 1 }))).toContain("no_picture");
    expect(
      rules(
        graph({
          kind: "picture",
          step: 1,
          tick: 1,
          categories: [
            { id: "a", label: "apples", picture: { icon: "apple" } },
            { id: "b", label: "pears", picture: { src: "/p.png", alt: "" } },
          ],
        }),
      ),
    ).toEqual(["missing_alt"]);
  });

  it("the categories: at least two, unique, named, not too many for a finger", () => {
    expect(
      rules(graph({ categories: [{ id: "a", label: "apples" }] }, { heights: { a: 6 } })),
    ).toContain("too_few_categories");
    expect(
      rules(
        graph({
          categories: [
            { id: "a", label: "apples" },
            { id: "a", label: "" },
          ],
        }),
      ),
    ).toEqual(expect.arrayContaining(["duplicate_id", "empty_label"]));
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, label: `c ${i}` }));
    expect(
      rules(
        graph({ categories: many }, { heights: Object.fromEntries(many.map((c) => [c.id, 1])) }),
      ),
    ).toContain("too_many_categories");
  });

  it("the key: a height per category, on the graph and on a step; starting heights too", () => {
    expect(rules(graph({}, { heights: { a: 6 } }))).toContain("missing_key");
    expect(rules(graph({}, { heights: { a: 6, b: 14 } }))).toContain("off_the_graph");
    expect(rules(graph({ step: 2 }, { heights: { a: 6, b: 5 } }))).toContain("key_off_snap");
    expect(rules(graph({}, { heights: { a: 6, b: 4, c: 1 } }))).toContain("unknown_id");
    expect(rules(graph({ starting: { a: 13 } }))).toContain("starting_off_snap");
    expect(rules(graph({ starting: { a: 2 } }))).toEqual([]);
  });

  it("help: rung 1 may point at a bar, rung 2 may draw one bar but never every bar", () => {
    const withHelp = (give: string[], focus: string[] = []): FamilySpec => ({
      ...graph({}),
      help: { look: { text: "Look at the first bar.", focus }, give, worked: ["a", "b"] },
    });
    expect(rules(withHelp(["a"], ["b"]))).toEqual([]);
    expect(rules(withHelp(["a", "b"]))).toContain("gives_the_answer");
    expect(rules(withHelp(["zz"]))).toContain("unknown_part");
  });
});
