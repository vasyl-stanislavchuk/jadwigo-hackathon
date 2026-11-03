import type { BasedOn, Credit, FamilyQuestion, Help, QuestionType } from "@jadwigo/contracts";

/**
 * A 20-question mixed lesson for the print sheet (dl-1eieq.8.1): the page-by-page sketch in the
 * plan on dl-1eieq.8, one question per paper form, written here by hand (no bank text in git). Every
 * key, hint, worked step and Choose `boost` holds a SEKRET marker, so a test can prove none of them
 * reaches the sheet or the PDF.
 */

export const PRINT_SECRET = "SEKRET";

export type MixedPrintQuestion = FamilyQuestion & {
  readonly question_type: QuestionType;
  readonly say: string;
  readonly help: Help;
  readonly credit: Credit | null;
  readonly based_on: BasedOn | null;
};

const help = (n: number): Help => ({
  hints: [{ text: `${PRINT_SECRET}-hint-${n}` }],
  boost: { text: `${PRINT_SECRET}-boost-${n}` },
  worked: [`${PRINT_SECRET}-worked-${n}`],
});

const khan: Credit = {
  source: "khan",
  ref: "x-add-within-20",
  url: "https://www.khanacademy.org/math/cc-1st-grade-math",
  licence: "cc-by-nc-sa-4.0",
  original_lang: "en",
  checked: "2026-11-01",
};

const q = (
  n: number,
  question_type: QuestionType,
  say: string,
  body: FamilyQuestion,
  credit: Credit | null = null,
): MixedPrintQuestion => ({
  question_type,
  say,
  help: help(n),
  credit,
  based_on: credit === null ? null : { question: `khan:${credit.ref}`, changes: [] },
  ...body,
});

export const MIXED_PRINT_LESSON: {
  readonly title: string;
  readonly language: "pl";
  readonly questions: readonly MixedPrintQuestion[];
} = {
  title: "Dodawanie i czas",
  language: "pl",
  questions: [
    q(1, "true_false", "Czy to prawda?", {
      family: "choose",
      data: {
        stem: { text: "$7 + 5 = 12$" },
        options: [
          { id: "t", content: { kind: "bool", bool: true } },
          { id: "f", content: { kind: "bool", bool: false } },
        ],
        select: "one",
        layout: "binary",
        boost: `${PRINT_SECRET}-data-boost-1`,
      },
      key: { correct: ["t"], worked_solution: [`${PRINT_SECRET}-key-1`] },
    }),
    q(2, "true_false", "Dotknij: prawda czy fałsz?", {
      family: "choose",
      data: {
        stem: { text: "$9 + 9 = 17$" },
        options: [
          { id: "t", content: { kind: "bool", bool: true } },
          { id: "f", content: { kind: "bool", bool: false } },
        ],
        select: "one",
        layout: "binary",
      },
      key: { correct: ["f"], why: `${PRINT_SECRET}-why-2` },
    }),
    q(
      3,
      "lettered_choice",
      "Która suma jest równa 15?",
      {
        family: "choose",
        data: {
          options: [
            { id: "a", letter: "A", content: { kind: "text", text: "$7 + 7$" } },
            { id: "b", letter: "B", content: { kind: "text", text: "$8 + 7$" } },
            { id: "c", letter: "C", content: { kind: "text", text: "$9 + 5$" } },
            { id: "d", letter: "D", content: { kind: "text", text: "$6 + 8$" } },
          ],
          select: "one",
          layout: "lettered",
        },
        key: { correct: ["b"], near: { a: `${PRINT_SECRET}-near-3` } },
      },
      khan,
    ),
    q(4, "recognition", "Na którym obrazku jest 12 kropek?", {
      family: "choose",
      data: {
        options: [
          { id: "a", content: { kind: "array", rows: 3, cols: 4 } },
          { id: "b", content: { kind: "array", rows: 2, cols: 5 } },
          { id: "c", content: { kind: "array", rows: 3, cols: 5 } },
        ],
        select: "one",
        layout: "grid",
      },
      key: { correct: ["a"] },
    }),
    q(5, "production", "Ile to jest?", {
      family: "enter",
      data: { stem: { text: "$6 + 7 =$" }, input: "number", entry: "keypad" },
      key: { accept: ["13"] },
    }),
    q(6, "production", "Ile to jest?", {
      family: "enter",
      data: { stem: { text: "$15 - 8 =$" }, input: "number", entry: "keypad" },
      key: { accept: ["7"] },
    }),
    q(7, "column", "Dodaj w słupku.", {
      family: "slots",
      data: {
        template: "",
        gaps: [
          { id: "g1", kind: "enter", input: "number", max_length: 1 },
          { id: "g2", kind: "enter", input: "number", max_length: 1 },
        ],
        column: { op: "add", operands: [27, 35], given_steps: 0, carry_row: true },
      },
      key: {
        gaps: { g1: { kind: "enter", accept: ["6"] }, g2: { kind: "enter", accept: ["2"] } },
      },
    }),
    q(8, "money_count", "Ile to razem?", {
      family: "slots",
      data: {
        template: "{g1} zł {g2} gr",
        figure: { kind: "coins", items: ["zl2", "zl1", "gr50"], alt: "2 zł, 1 zł i 50 gr" },
        gaps: [
          { id: "g1", kind: "enter", input: "number" },
          { id: "g2", kind: "enter", input: "number" },
        ],
      },
      key: {
        gaps: { g1: { kind: "enter", accept: ["3"] }, g2: { kind: "enter", accept: ["50"] } },
      },
    }),
    q(9, "clock_read", "Która godzina?", {
      family: "slots",
      data: {
        template: "{g1} : {g2}",
        figure: { kind: "clock", h: 4, m: 0, alt: "zegar" },
        gaps: [
          { id: "g1", kind: "enter", input: "number", range: [1, 12] },
          { id: "g2", kind: "enter", input: "number", range: [0, 59] },
        ],
      },
      key: {
        gaps: { g1: { kind: "enter", accept: ["4"] }, g2: { kind: "enter", accept: ["00"] } },
      },
    }),
    q(10, "clock_set", "Przesuń wskazówki na wpół do czwartej.", {
      family: "place",
      data: { surface: "clock", target_label: "3:30", minute_step: 30, hands: "geared" },
      key: { surface: "clock", h: 3, m: 30 },
    }),
    q(11, "fill_table", "Uzupełnij tabelę dodawania.", {
      family: "slots",
      data: {
        template: "",
        table: {
          header: ["+", "3", "5", "8"],
          rows: [
            ["4", "{g1}", "9", "{g2}"],
            ["6", "9", "{g3}", "14"],
          ],
        },
        gaps: [
          { id: "g1", kind: "enter", input: "number" },
          { id: "g2", kind: "enter", input: "number" },
          { id: "g3", kind: "enter", input: "number" },
        ],
      },
      key: {
        gaps: {
          g1: { kind: "enter", accept: ["7"] },
          g2: { kind: "enter", accept: ["12"] },
          g3: { kind: "enter", accept: ["11"] },
        },
      },
    }),
    q(12, "pyramid", "Każda cegła to suma dwóch cegieł pod nią.", {
      family: "slots",
      data: {
        template: "",
        pyramid: [["{g1}"], [7, "{g2}"], [3, 4, 5]],
        gaps: [
          { id: "g1", kind: "enter", input: "number" },
          { id: "g2", kind: "enter", input: "number" },
        ],
      },
      key: {
        gaps: { g1: { kind: "enter", accept: ["16"] }, g2: { kind: "enter", accept: ["9"] } },
      },
    }),
    q(13, "fraction_shade", "Pokoloruj trzy czwarte kwadratu.", {
      family: "place",
      data: { surface: "fraction", shape: "rect", parts: 4, label: "$\\frac{3}{4}$" },
      key: { surface: "fraction", count: 3 },
    }),
    q(14, "number_line_place", "Zaznacz liczbę 35 na osi.", {
      family: "place",
      data: {
        surface: "number_line",
        min: 0,
        max: 50,
        step: 5,
        labelled: [0, 10, 20, 30, 40, 50],
        target_label: 35,
      },
      key: { surface: "number_line", value: 35, tolerance: 1 },
    }),
    q(15, "order", "Przeciągnij liczby od najmniejszej do największej.", {
      family: "sequence",
      data: {
        items: [
          { id: "a", text: "48" },
          { id: "b", text: "12" },
          { id: "c", text: "30" },
          { id: "d", text: "7" },
        ],
        first_label: "najmniejsza",
        last_label: "największa",
      },
      key: { orders: [["d", "b", "c", "a"]] },
    }),
    q(
      16,
      "match",
      "Połącz działanie z wynikiem.",
      {
        family: "group",
        data: {
          groups: [
            { id: "r15", label: "15" },
            { id: "r14", label: "14" },
            { id: "r16", label: "16" },
          ],
          items: [
            { id: "a", label: "$8 + 6$" },
            { id: "b", label: "$9 + 6$" },
            { id: "c", label: "$7 + 9$" },
          ],
          each_item: "one",
          layout: "columns",
        },
        key: { items: { a: ["r14"], b: ["r15"], c: ["r16"] } },
      },
      khan,
    ),
    q(17, "bucket", "Parzyste czy nieparzyste?", {
      family: "group",
      data: {
        groups: [
          { id: "even", label: "parzyste" },
          { id: "odd", label: "nieparzyste" },
        ],
        items: [
          { id: "n4", label: "4" },
          { id: "n7", label: "7" },
          { id: "n10", label: "10" },
          { id: "n13", label: "13" },
        ],
        each_item: "one",
        layout: "zones",
      },
      key: { items: { n4: ["even"], n7: ["odd"], n10: ["even"], n13: ["odd"] } },
    }),
    q(18, "hotspot", "Dotknij zegara, który pokazuje siódmą.", {
      family: "place",
      data: {
        surface: "image",
        image: "media/print/three-clocks.svg",
        image_alt: "trzy zegary",
        taps: 1,
      },
      key: {
        surface: "image",
        targets: [
          {
            id: "seven",
            polygon: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
            ],
          },
        ],
        require_all: true,
      },
    }),
    q(19, "money_pay", "Wybierz monety, które dają razem 3 zł 50 gr.", {
      family: "place",
      data: {
        surface: "coins",
        bank: ["zl2", "zl1", "gr50"],
        amount_label: "3 zł 50 gr",
        slots: 6,
      },
      key: { surface: "coins", amount_gr: 350 },
    }),
    q(20, "draw_graph", "Narysuj słupki: ile jest owoców?", {
      family: "place",
      data: {
        surface: "bars",
        kind: "bar",
        categories: [
          { id: "apple", label: "jabłka" },
          { id: "pear", label: "gruszki" },
          { id: "plum", label: "śliwki" },
          { id: "cherry", label: "wiśnie" },
        ],
        max: 10,
        step: 1,
        stem: { text: "Jabłek jest 6, gruszek 3, śliwek 8, a wiśni 5." },
      },
      key: { surface: "bars", heights: { apple: 6, pear: 3, plum: 8, cherry: 5 } },
    }),
  ],
};
