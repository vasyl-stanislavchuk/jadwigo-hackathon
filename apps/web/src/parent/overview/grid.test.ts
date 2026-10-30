import type { AttemptResult } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { played, questionId, result, twin } from "./fixtures.ts";
import { buildGrid, cellsOf, type Outcome } from "./grid.ts";

/** One attempt's rows, the cell of question 1 they make. */
const firstCell = (rows: AttemptResult[]) => buildGrid([played(1, rows)]).rows[0]?.cells[0];

describe("buildGrid: one cell's outcome", () => {
  const cases: { name: string; rows: AttemptResult[]; outcome: Outcome; twin: boolean }[] = [
    {
      name: "right on the first try, no help",
      rows: [result(1, 1, 1)],
      outcome: "first_try",
      twin: false,
    },
    {
      name: "right after a second try",
      rows: [result(1, 1, 1, { tries: 2, first_try_correct: false })],
      outcome: "got_there",
      twin: false,
    },
    {
      name: "right on the first try with help",
      rows: [result(1, 1, 1, { help_used: 1 })],
      outcome: "got_there",
      twin: false,
    },
    {
      name: "missed",
      rows: [result(1, 1, 1, { ended: "missed", correct: false, first_try_correct: false })],
      outcome: "not_yet",
      twin: false,
    },
    {
      name: "not sure with no try, no twin",
      rows: [
        result(1, 1, 1, {
          ended: "skipped",
          correct: false,
          first_try_correct: false,
          tries: 0,
          skip_reason: "dont_know",
        }),
      ],
      outcome: "skipped",
      twin: false,
    },
    {
      name: "a wrong try, then not sure",
      rows: [
        result(1, 1, 1, {
          ended: "skipped",
          correct: false,
          first_try_correct: false,
          tries: 1,
          skip_reason: "dont_know",
        }),
      ],
      outcome: "not_yet",
      twin: false,
    },
    {
      name: "a wrong try, then asked to skip",
      rows: [
        result(1, 1, 1, {
          ended: "skipped",
          correct: false,
          first_try_correct: false,
          tries: 1,
          skip_reason: "asked_to_skip",
        }),
      ],
      outcome: "not_yet",
      twin: false,
    },
    {
      name: "still open",
      rows: [result(1, 1, 1, { ended: null, correct: false, first_try_correct: false, tries: 0 })],
      outcome: "open",
      twin: false,
    },
    {
      name: "skipped, its twin right",
      rows: [
        result(1, 1, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 2, 7, 1),
      ],
      outcome: "got_there",
      twin: true,
    },
    {
      name: "skipped, its twin skipped too",
      rows: [
        result(1, 1, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 2, 7, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
      ],
      outcome: "not_yet",
      twin: true,
    },
    {
      name: "skipped, a twin of its twin right",
      rows: [
        result(1, 1, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 2, 7, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 3, 8, 2),
      ],
      outcome: "got_there",
      twin: true,
    },
    {
      name: "skipped, a review_round twin right after other questions",
      rows: [
        result(1, 1, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        result(1, 2, 2),
        twin(1, 3, 7, 1, { placed: "review_round" }),
      ],
      outcome: "got_there",
      twin: true,
    },
  ];

  it.each(cases)("$name: $outcome", ({ rows, outcome, twin: folded }) => {
    expect(firstCell(rows)).toMatchObject({ outcome, twin: folded });
  });

  it("is not_asked where the attempt never asked the column's question", () => {
    const grid = buildGrid([
      played(1, [result(1, 1, 1), result(1, 2, 2)]),
      played(2, [result(2, 1, 1)]),
    ]);
    expect(grid.rows[1]?.cells.map((c) => c.outcome)).toEqual(["first_try", "not_asked"]);
  });

  it("never makes a twin a column, and nests every folded twin in its cell", () => {
    const grid = buildGrid([
      played(1, [
        result(1, 1, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 2, 7, 1, { ended: "skipped", correct: false, first_try_correct: false, tries: 0 }),
        twin(1, 3, 8, 2),
        result(1, 4, 2),
      ]),
    ]);
    expect(grid.columns.map((c) => c.key)).toEqual([questionId(1), questionId(2)]);
    expect(grid.rows[0]?.cells[0]?.twins.map((t) => t.seq)).toEqual([2, 3]);
  });
});

describe("cellsOf: one attempt's tile row", () => {
  it("is the heatmap's row: a cell per planned question in seq order, twins folded in", () => {
    const rows = [
      result(1, 2, 2, { ended: "missed", correct: false, first_try_correct: false }),
      result(1, 1, 1, {
        ended: "skipped",
        correct: false,
        first_try_correct: false,
        tries: 0,
      }),
      twin(1, 3, 7, 1),
      result(1, 4, 3),
    ];
    const cells = cellsOf(rows);
    expect(cells.map((c) => [c.planned.seq, c.outcome, c.twin])).toEqual([
      [1, "got_there", true],
      [2, "not_yet", false],
      [4, "first_try", false],
    ]);
    expect(cells.map((c) => c.outcome)).toEqual(
      buildGrid([played(1, rows)]).rows[0]?.cells.map((c) => c.outcome),
    );
  });
});

describe("buildGrid: columns", () => {
  it("unions two lesson versions' planned questions, ordered by first seq", () => {
    // Version 1 asks 1, 2, 3; version 2 drops 2 and asks 4 second.
    const grid = buildGrid([
      played(1, [result(1, 1, 1), result(1, 2, 2), result(1, 3, 3)], { version: 1 }),
      played(2, [result(2, 1, 1), result(2, 2, 4), result(2, 3, 3)], { version: 2 }),
    ]);
    expect(grid.columns.map((c) => c.key)).toEqual([
      questionId(1),
      questionId(2),
      questionId(4),
      questionId(3),
    ]);
    expect(grid.columns.map((c) => c.number)).toEqual([1, 2, 3, 4]);
    expect(grid.rows[0]?.cells.map((c) => c.outcome)).toEqual([
      "first_try",
      "first_try",
      "not_asked",
      "first_try",
    ]);
    expect(grid.rows[1]?.cells.map((c) => c.outcome)).toEqual([
      "first_try",
      "not_asked",
      "first_try",
      "first_try",
    ]);
  });

  it("takes a column's say from its first asking", () => {
    const grid = buildGrid([played(1, [result(1, 1, 1, { say: "Ile to 2 × 5?" })])]);
    expect(grid.columns[0]?.say).toBe("Ile to 2 × 5?");
  });
});

describe("buildGrid: counts, never a percentage", () => {
  const grid = buildGrid([
    played(
      1,
      [result(1, 1, 1), result(1, 2, 2, { tries: 2, first_try_correct: false }), result(1, 3, 3)],
      { name: "Ola" },
    ),
    played(
      2,
      [result(2, 1, 1), result(2, 2, 2, { ended: null, correct: false, first_try_correct: false })],
      {
        finished: false,
      },
    ),
  ]);

  it("counts a row's first tries of the questions it asked", () => {
    expect(grid.rows.map((r) => [r.firstTry, r.asked])).toEqual([
      [2, 3],
      [1, 2],
    ]);
  });

  it("counts a column's first tries of the rows that reached it", () => {
    expect(grid.columns.map((c) => [c.firstTry, c.reached])).toEqual([
      [2, 2],
      [0, 2],
      [1, 1],
    ]);
  });

  it("names a row, or numbers it from 1", () => {
    expect(grid.rows.map((r) => [r.name, r.number])).toEqual([
      ["Ola", 1],
      [null, 2],
    ]);
  });
});
