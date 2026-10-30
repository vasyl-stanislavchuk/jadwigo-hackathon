/**
 * The lesson overview's grid, pure (dl-uukj.30.4, wave 2 plan of dl-uukj.30): one assignment's
 * attempts against its questions.
 *
 *   columns  the planned rows across every attempt, keyed by lesson_question_id and ordered by
 *            first seq: an assignment may span lesson versions, and the parent's pod cannot read a
 *            version's list
 *   rows     one per attempt, in the order the API gives (newest first)
 *   cell     how the planned question went, with the twins added for it folded in: a twin follows
 *            added_for up to its planned root, a twin's twin and a review_round twin too
 *
 * Counts, never a percentage (decisions 2026-10-18 and 2026-10-03).
 */

import type { AssignmentAttempt, Attempt, AttemptResult } from "@jadwigo/contracts";

/** One cell's outcome: the outcome table of the wave 2 plan. */
export type Outcome = "first_try" | "got_there" | "not_yet" | "skipped" | "open" | "not_asked";

export const OUTCOMES: readonly Outcome[] = [
  "first_try",
  "got_there",
  "not_yet",
  "skipped",
  "open",
  "not_asked",
];

export type Cell = {
  outcome: Outcome;
  /** Whether a twin was folded into this cell. */
  twin: boolean;
  /** The planned row; null when this attempt never asked the column's question. */
  planned: AttemptResult | null;
  /** The twins folded in, in seq order. */
  twins: AttemptResult[];
};

export type Column = {
  key: AttemptResult["lesson_question_id"];
  /** The question's number on the screen, from 1. */
  number: number;
  /** What the question says, from its first asking. */
  say: string;
  /** Rows whose cell is first_try. */
  firstTry: number;
  /** Rows that asked it: every cell but not_asked. */
  reached: number;
};

export type Row = {
  attempt: Attempt;
  /** The name the API gives, or null: the page then numbers the row. */
  name: string | null;
  /** The row's number, from 1, for a row with no name. */
  number: number;
  /** One per column, in column order. */
  cells: Cell[];
  /** Cells that are first_try. */
  firstTry: number;
  /** Cells that were asked: every cell but not_asked. */
  asked: number;
};

export type Grid = { columns: Column[]; rows: Row[] };

/**
 * How one row went on its own, its twins aside. A skip after a wrong try is not yet, whichever
 * way it was skipped ("Jeszcze nie wiem" or "Dalej bez odpowiedzi"); only a skip with no try is
 * skipped. `tries` counts real tries, never the skip, and a right try ends the question, so a
 * skipped row with tries had a wrong one (decision
 * 2026-10-30-the-parent-s-outcomes-a-soft-green-for-got-there-a-dashed-tile-f).
 */
export function rowOutcome(row: AttemptResult): Exclude<Outcome, "not_asked"> {
  if (row.ended === null) return "open";
  if (row.ended === "correct")
    return row.first_try_correct && row.help_used === 0 ? "first_try" : "got_there";
  if (row.ended === "missed") return "not_yet";
  return row.tries > 0 ? "not_yet" : "skipped";
}

/** A planned row's cell, with the twins added for it. */
function cellOf(planned: AttemptResult, twins: AttemptResult[]): Cell {
  const own = rowOutcome(planned);
  const outcome: Outcome =
    own === "first_try" || own === "got_there" || own === "open"
      ? own
      : twins.some((t) => t.ended === "correct")
        ? "got_there"
        : own === "skipped" && twins.length > 0
          ? "not_yet"
          : own;
  return { outcome, twin: twins.length > 0, planned, twins };
}

const NOT_ASKED: Cell = { outcome: "not_asked", twin: false, planned: null, twins: [] };

/** The seq of the planned row a twin was added for, following added_for; null for a broken chain. */
function rootOf(row: AttemptResult, bySeq: Map<number, AttemptResult>): number | null {
  const seen = new Set<number>();
  let at: AttemptResult | undefined = row;
  while (at !== undefined && at.added === "twin") {
    if (at.added_for === null || seen.has(at.seq)) return null;
    seen.add(at.seq);
    at = bySeq.get(at.added_for);
  }
  return at === undefined ? null : at.seq;
}

/** One attempt's planned rows, by lesson question, each with its folded twins. */
function plannedOf(
  results: AttemptResult[],
): Map<AttemptResult["lesson_question_id"], { planned: AttemptResult; twins: AttemptResult[] }> {
  const bySeq = new Map(results.map((r) => [r.seq, r]));
  const twinsBySeq = new Map<number, AttemptResult[]>();
  for (const row of [...results].sort((a, b) => a.seq - b.seq)) {
    if (row.added !== "twin") continue;
    const root = rootOf(row, bySeq);
    if (root === null) continue;
    twinsBySeq.set(root, [...(twinsBySeq.get(root) ?? []), row]);
  }
  const byQuestion = new Map<
    AttemptResult["lesson_question_id"],
    { planned: AttemptResult; twins: AttemptResult[] }
  >();
  for (const row of results) {
    if (row.added !== "planned" || byQuestion.has(row.lesson_question_id)) continue;
    byQuestion.set(row.lesson_question_id, { planned: row, twins: twinsBySeq.get(row.seq) ?? [] });
  }
  return byQuestion;
}

/** One attempt's cells, a planned question each in seq order, its twins folded in as the grid
 * folds them: the parent home's tile row is the heatmap's row. */
export function cellsOf(results: AttemptResult[]): (Cell & { planned: AttemptResult })[] {
  return [...plannedOf(results).values()]
    .sort((a, b) => a.planned.seq - b.planned.seq)
    .map(({ planned, twins }) => ({ ...cellOf(planned, twins), planned }));
}

export function buildGrid(attempts: AssignmentAttempt[]): Grid {
  const planned = attempts.map((a) => plannedOf(a.results));

  // Every planned question once, at the first seq any attempt asked it.
  const first = new Map<AttemptResult["lesson_question_id"], { seq: number; say: string }>();
  for (const byQuestion of planned)
    for (const [key, { planned: row }] of byQuestion) {
      const seen = first.get(key);
      if (seen === undefined || row.seq < seen.seq) first.set(key, { seq: row.seq, say: row.say });
    }
  // A stable sort: a tie keeps the order the questions were first met in.
  const keys = [...first.entries()].sort(([, a], [, b]) => a.seq - b.seq);

  const rows: Row[] = attempts.map((a, index) => {
    const byQuestion = planned[index] ?? new Map();
    const cells = keys.map(([key]) => {
      const found = byQuestion.get(key);
      return found === undefined ? NOT_ASKED : cellOf(found.planned, found.twins);
    });
    return {
      attempt: a.attempt,
      name: a.name,
      number: index + 1,
      cells,
      firstTry: cells.filter((c) => c.outcome === "first_try").length,
      asked: cells.filter((c) => c.outcome !== "not_asked").length,
    };
  });

  const columns: Column[] = keys.map(([key, { say }], index) => {
    const cells = rows.flatMap((r) => r.cells[index] ?? []);
    return {
      key,
      number: index + 1,
      say,
      firstTry: cells.filter((c) => c.outcome === "first_try").length,
      reached: cells.filter((c) => c.outcome !== "not_asked").length,
    };
  });

  return { columns, rows };
}
