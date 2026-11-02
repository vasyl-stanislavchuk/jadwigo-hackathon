/**
 * One made-up bank body per question type the bank holds (grades 1 to 4, 2026-11-02), shaped like
 * a bank body's language variant: `{family, data, key, help?, say?, question_type}`, the part the
 * engine copies into a lesson step (packages/jadwigo-ai/src/verbs/bank-api.ts questionOf). Every
 * number, word and picture here is invented: no bank, Khan or Alfik content is in git (fence 8).
 * Each carries a right answer and a wrong one, as the family values a child commits.
 *
 * The bank holds no true_false, clock_read or money_count yet (dl-n9fr.72), so none is here.
 */

import type { QuestionType } from "@jadwigo/contracts";

export interface BankBody {
  question_type: QuestionType;
  family: string;
  say: string;
  data: unknown;
  key: unknown;
  /** A value the key marks right, and one it marks wrong. */
  right: unknown;
  wrong: unknown;
  /** Set where the view in play takes no seeded answer (match's two columns, `dl-w3.85`): the right
   * answer is made by hand on the screen, and the wrong one is the step at rest. */
  byHand?: true;
}

/** A plain picture, drawn inline: a grey box, so no file is fetched. */
const BOX =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23ddd%22%2F%3E%3C%2Fsvg%3E";

const n = (id: string, number: number) => ({ id, content: { kind: "number", number } });
const t = (id: string, text: string) => ({ id, content: { kind: "text", text } });
const square = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

export const BANK_BODIES: readonly BankBody[] = [
  {
    question_type: "recognition",
    family: "choose",
    say: "Ile to jest trzy razy trzy?",
    data: {
      stem: { text: "$3 \\times 3 = ?$" },
      options: [n("o1", 6), n("o2", 9), n("o3", 12), n("o4", 33)],
      select: "one",
      layout: "grid",
    },
    key: { correct: ["o2"], near: { o1: "add_for_multiply" } },
    right: { chosen: ["o2"] },
    wrong: { chosen: ["o1"] },
  },
  {
    question_type: "lettered_choice",
    family: "choose",
    say: "Ile kółek jest na rysunku?",
    data: {
      stem: { text: "Ile kółek jest na rysunku?", image: BOX, image_alt: "Kółka w rzędzie" },
      options: ["A", "B", "C", "D", "E"].map((letter, i) => ({
        id: letter,
        letter,
        content: { kind: "text", text: String(i + 3) },
      })),
      select: "one",
      layout: "lettered",
    },
    key: { correct: ["C"] },
    right: { chosen: ["C"] },
    wrong: { chosen: ["E"] },
  },
  {
    question_type: "multi_select",
    family: "choose",
    say: "Zaznacz oba działania, które dają osiem.",
    data: {
      stem: { text: "Które dają $8$?" },
      options: [
        t("o1", "$2 \\cdot 4$"),
        t("o2", "$4 + 4$"),
        t("o3", "$2 + 4$"),
        t("o4", "$4 + 2$"),
      ],
      select: "many",
      layout: "list",
    },
    key: { correct: ["o1", "o2"] },
    right: { chosen: ["o1", "o2"] },
    wrong: { chosen: ["o1"] },
  },
  {
    question_type: "fraction_compare",
    family: "choose",
    say: "Wybierz znak.",
    data: {
      stem: {
        figure: {
          kind: "fraction_bars",
          items: [
            { n: 1, d: 2 },
            { n: 1, d: 4 },
          ],
          shape: "bar",
          alt: "Dwa paski: połowa i ćwierć",
        },
      },
      line: "$\\frac{1}{2}$ {pick} $\\frac{1}{4}$",
      options: [t("c1", "<"), t("c2", "="), t("c3", ">")],
      select: "one",
      layout: "grid",
    },
    key: { correct: ["c3"] },
    right: { chosen: ["c3"] },
    wrong: { chosen: ["c1"] },
  },
  {
    question_type: "production",
    family: "enter",
    say: "Ile to jest cztery razy dwa?",
    data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "4 × 2 = ?" } },
    key: { accept: ["8"], near: { "6": "add_for_multiply" } },
    right: { entered: "8" },
    wrong: { entered: "6" },
  },
  {
    question_type: "expression",
    family: "enter",
    say: "Zapisz mnożenie.",
    data: {
      input: "expression",
      entry: "keypad",
      figure: { kind: "groups", groups: 2, each: 3, icon: "apple", alt: "Dwie grupy po trzy" },
    },
    key: { accept: ["2×3", "3×2"], form: "product", near: { "2+3": "added_not_multiplied" } },
    right: { entered: "2×3" },
    wrong: { entered: "2+3" },
  },
  {
    question_type: "fill_gaps",
    family: "slots",
    say: "Uzupełnij.",
    data: {
      template: "{g1} + 5 = 7",
      gaps: [{ id: "g1", kind: "enter", input: "number" }],
    },
    key: { gaps: { g1: { kind: "enter", accept: ["2"] } } },
    right: { gaps: { g1: "2" } },
    wrong: { gaps: { g1: "12" } },
  },
  {
    question_type: "fill_table",
    family: "slots",
    say: "Uzupełnij tabelę.",
    data: {
      template: "",
      table: {
        header: ["a", "a + 1"],
        rows: [
          ["1", "{g1}"],
          ["5", "{g2}"],
        ],
      },
      gaps: [
        { id: "g1", kind: "enter", input: "number" },
        { id: "g2", kind: "enter", input: "number" },
      ],
    },
    key: {
      gaps: { g1: { kind: "enter", accept: ["2"] }, g2: { kind: "enter", accept: ["6"] } },
    },
    right: { gaps: { g1: "2", g2: "6" } },
    wrong: { gaps: { g1: "2", g2: "5" } },
  },
  {
    question_type: "label_picture",
    family: "slots",
    say: "Podpisz oś.",
    data: {
      picture: { src: BOX, alt: "Oś z dwoma pustymi miejscami", width: 400, height: 80 },
      template: "2 × 5 = {g2}",
      gaps: [
        {
          id: "g1",
          kind: "choose",
          at: { x: 50, y: 85 },
          options: [
            { id: "c1", label: "5" },
            { id: "c2", label: "10" },
          ],
        },
        { id: "g2", kind: "enter", input: "number" },
      ],
    },
    key: {
      gaps: {
        g1: { kind: "choose", correct: ["c1"] },
        g2: { kind: "enter", accept: ["10"] },
      },
    },
    right: { gaps: { g1: "c1", g2: "10" } },
    wrong: { gaps: { g1: "c2", g2: "10" } },
  },
  {
    question_type: "order",
    family: "sequence",
    say: "Ułóż od najmniejszej.",
    data: {
      items: [
        { id: "i1", text: "7" },
        { id: "i2", text: "2" },
        { id: "i3", text: "5" },
      ],
      first_label: "najmniejsza",
      last_label: "największa",
    },
    key: { orders: [["i2", "i3", "i1"]] },
    right: ["i2", "i3", "i1"],
    wrong: ["i1", "i3", "i2"],
  },
  {
    question_type: "bucket",
    family: "group",
    say: "Rozdziel liczby.",
    data: {
      groups: [
        { id: "even", label: "parzyste" },
        { id: "odd", label: "nieparzyste" },
      ],
      items: [
        { id: "a", label: "2" },
        { id: "b", label: "3" },
        { id: "c", label: "4" },
      ],
      each_item: "one",
    },
    key: { items: { a: ["even"], b: ["odd"], c: ["even"] } },
    right: { items: { a: ["even"], b: ["odd"], c: ["even"] } },
    wrong: { items: { a: ["even"], b: ["even"], c: ["even"] } },
  },
  {
    question_type: "match",
    family: "group",
    say: "Połącz w pary.",
    data: {
      // Listed shuffled, as the bank lists them: the right column starts in this order, so a step
      // at rest is not already solved.
      groups: [
        { id: "g6", label: "6", capacity: 1 },
        { id: "g4", label: "4", capacity: 1 },
      ],
      layout: "columns",
      items: [
        { id: "p22", label: "2 + 2" },
        { id: "p33", label: "3 + 3" },
      ],
      each_item: "one",
    },
    key: { items: { p22: ["g4"], p33: ["g6"] } },
    right: { items: { p22: ["g4"], p33: ["g6"] } },
    wrong: { items: { p22: ["g6"], p33: ["g4"] } },
    byHand: true,
  },
  {
    question_type: "number_line_place",
    family: "place",
    say: "Zaznacz sześć.",
    data: { surface: "number_line", min: 0, max: 10, step: 1, labelled: [0, 10], target_label: 6 },
    key: { surface: "number_line", value: 6, tolerance: 0 },
    right: { at: 6 },
    wrong: { at: 4 },
  },
  {
    question_type: "hotspot",
    family: "place",
    say: "Dotknij lewej połowy.",
    data: { surface: "image", image: BOX, image_alt: "Szary kwadrat", taps: 1 },
    key: {
      surface: "image",
      targets: [{ id: "left", polygon: square(0, 0, 0.5, 1) }],
      require_all: true,
    },
    right: { points: [{ x: 0.25, y: 0.5 }] },
    wrong: { points: [{ x: 0.75, y: 0.5 }] },
  },
  {
    question_type: "spatial_build",
    family: "place",
    say: "Zbuduj prostokąt.",
    data: { surface: "grid", size: 10, label: "2 × 3" },
    key: { surface: "grid", rows: 2, cols: 3, either_order: true },
    right: { rows: 2, cols: 3 },
    wrong: { rows: 2, cols: 4 },
  },
  {
    question_type: "draw_graph",
    family: "place",
    say: "Narysuj słupki.",
    data: {
      surface: "bars",
      kind: "bar",
      categories: [
        { id: "a", label: "a" },
        { id: "b", label: "b" },
      ],
      max: 5,
      step: 1,
      tick: 1,
      unit_label: "sztuki",
      stem: { text: "a: 3, b: 1" },
    },
    key: { surface: "bars", heights: { a: 3, b: 1 } },
    right: { heights: { a: 3, b: 1 } },
    wrong: { heights: { a: 1, b: 3 } },
  },
];
