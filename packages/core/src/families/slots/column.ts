import type { ColumnSum, GapKey } from "@jadwigo/contracts";

/**
 * Written column arithmetic (działania pisemne, dl-w3.32, built in dl-w3.61.4): a sum, a difference
 * or a product worked digit by digit, as on squared paper in a Polish klasa 3 or 4 exercise book.
 *
 * The step names the sum (`column`), and its gaps are explicit cells: `r0`, `r1`, … are the
 * result's digits, units first, and `c1`, `c2`, … the small cells above (or below) a column. In an
 * addition or a product a small cell holds the carry into that column. In a subtraction it holds
 * the column's digit after it lent a ten to the column on its right (52 − 27: the 5 becomes 4), as
 * a child writes it over the crossed-out digit. A small cell left empty means nothing was written
 * there: no carry, or a digit that did not change. Small cells sit only over columns with a digit
 * of the operands in them; a last carry goes straight into the result, as a child writes it.
 *
 * `columnKey` derives the gaps, the key and the near misses from the sum, so the author writes the
 * sum and the validator checks the rest (`column_mismatch`). The near misses per cell:
 * - a result digit worked without the carry (or without the lent ten) is `forgot_carry`
 *   (`forgot_borrow` in a subtraction);
 * - a subtraction digit taken as the bigger digit minus the smaller is `borrow_error`;
 * - a small cell left empty, or 0, where a carry belongs is `carry_not_added`; in a subtraction,
 *   the digit left as it was is `borrow_not_marked`;
 * - any other digit is `fact_error` (the judge's fallback for a column, families/slots/judge.ts).
 *
 * `given_steps = k` fills the rightmost k columns in for the child, carries included: backward
 * fading of a worked example (Renkl and Atkinson 2003, "Structuring the transition from example
 * study to problem solving"). A plan lowers k from item to item until the child works it all.
 *
 * Ported from david-learns `frontend/src/families/slots/column.ts`, the judge's half: the drawn
 * grid stays with the page.
 */

type EnterGapKey = Extract<GapKey, { kind: "enter" }>;

const digitsOf = (n: number): number[] =>
  String(Math.abs(Math.trunc(n)))
    .split("")
    .reverse()
    .map(Number);

/** What the sum works out to, column by column (index 0 is the units). */
interface ColumnWork {
  top: number[];
  bottom: number[];
  result: number[];
  /** The small cell over each column, by index (1 up): the carry in, or the digit after lending. Absent where no small cell sits. */
  small: Map<number, number>;
  /** What an empty small cell stands for: 0 for a carry, the digit as written for a lent ten. */
  blank: Map<number, number>;
  /** Per result digit, the digit worked without its carry or lent ten, when that differs. */
  forgot: Map<number, number>;
  /** Per result digit of a subtraction, the bigger digit minus the smaller, when that differs. */
  flipped: Map<number, number>;
}

function columnValue(sum: Pick<ColumnSum, "op" | "operands">): number {
  const [a, b] = sum.operands;
  return sum.op === "add" ? a + b : sum.op === "sub" ? a - b : a * b;
}

/** The sum worked through. A subtraction whose answer is below zero has no column form: the
 * validator refuses it, and this returns the digits of its size. */
function columnWork(sum: Pick<ColumnSum, "op" | "operands">): ColumnWork {
  const top = digitsOf(sum.operands[0]);
  const bottom = digitsOf(sum.operands[1]);
  const result = digitsOf(columnValue(sum));
  const small = new Map<number, number>();
  const blank = new Map<number, number>();
  const forgot = new Map<number, number>();
  const flipped = new Map<number, number>();
  const width = sum.op === "mul" ? top.length : Math.max(top.length, bottom.length);
  if (sum.op === "sub") {
    // lent: whether this column lends a ten to the column on its right.
    let lent = 0;
    for (let i = 0; i < top.length; i++) {
      const a = top[i] ?? 0;
      const b = bottom[i] ?? 0;
      if (i >= 1) {
        // The digit a child writes over this column after lending: one less, and 9 for a 0
        // that first borrowed itself (503 − 128: the 0 becomes 9).
        small.set(i, lent === 1 ? (a + 9) % 10 : a);
        blank.set(i, a);
      }
      if (lent === 1 && (a - b + 10) % 10 !== result[i]) forgot.set(i, (a - b + 10) % 10);
      if (a < b && b - a !== result[i]) flipped.set(i, b - a);
      lent = a - lent < b ? 1 : 0;
    }
  } else {
    let carry = 0;
    for (let i = 0; i < width; i++) {
      if (i >= 1) {
        small.set(i, carry);
        blank.set(i, 0);
      }
      const raw =
        sum.op === "add" ? (top[i] ?? 0) + (bottom[i] ?? 0) : (top[i] ?? 0) * (bottom[0] ?? 0);
      if (carry > 0 && raw % 10 !== result[i]) forgot.set(i, raw % 10);
      carry = Math.floor((raw + carry) / 10);
    }
  }
  return { top, bottom, result, small, blank, forgot, flipped };
}

const resultId = (i: number): string => `r${i}`;
const smallId = (i: number): string => `c${i}`;

/** The column a cell id names, and whether it is a small cell; null for an id of another shape. */
function cellOf(id: string): { small: boolean; col: number } | null {
  const m = /^([rc])(\d+)$/.exec(id);
  return m ? { small: m[1] === "c", col: Number(m[2]) } : null;
}

/** Every cell in the order a child works it: the units digit, then for each column to the left
 * its small cell first, then its digit. The step's gaps, its Tab order and its voice read this. */
function columnCells(sum: ColumnSum, work: ColumnWork = columnWork(sum)): string[] {
  const out: string[] = [];
  for (let i = 0; i < work.result.length; i++) {
    if (sum.carry_row && work.small.has(i)) out.push(smallId(i));
    out.push(resultId(i));
  }
  return out;
}

/** The order the child fills the cells in (paper-behaviour README §3.4): right to left, units
 * first, each column's small cell before its digit, as on paper; the given columns are not gaps. */
export function columnFillOrder(sum: ColumnSum): string[] {
  return columnKey(sum).gaps.map((g) => g.id);
}

/** The cells filled in for the child: the rightmost `given_steps` columns, carries included (a
 * column's carry is the small cell over the column on its left). */
function givenCells(sum: ColumnSum, work: ColumnWork): Set<string> {
  const k = Math.max(0, Math.min(sum.given_steps, work.result.length));
  const out = new Set<string>();
  for (let i = 0; i < k; i++) {
    out.add(resultId(i));
    if (sum.carry_row && work.small.has(i + 1)) out.add(smallId(i + 1));
  }
  return out;
}

/** The digits the page shows already filled in (given steps), by cell id. Drawn from the sum,
 * which is on the page; never a cell the child is asked for. */
export function columnGiven(sum: ColumnSum): Record<string, string> {
  const work = columnWork(sum);
  const out: Record<string, string> = {};
  for (const id of givenCells(sum, work)) out[id] = String(digitAt(work, id));
  return out;
}

/** The digit a cell holds when worked right. Every id here comes from columnCells. */
function digitAt(work: ColumnWork, id: string): number {
  const cell = cellOf(id);
  if (cell === null) return 0;
  return cell.small ? (work.small.get(cell.col) ?? 0) : (work.result[cell.col] ?? 0);
}

interface ColumnGap {
  id: string;
  kind: "enter";
  input: "number";
  max_length: 1;
}

/** The gaps a sum asks for, in working order, and the key with its near misses. */
export function columnKey(sum: ColumnSum): {
  gaps: ColumnGap[];
  key: { gaps: Record<string, EnterGapKey> };
} {
  const work = columnWork(sum);
  const given = givenCells(sum, work);
  const ids = columnCells(sum, work).filter((id) => !given.has(id));
  const keys: Record<string, EnterGapKey> = {};
  for (const id of ids) {
    const cell = cellOf(id);
    if (cell === null) continue;
    const right = digitAt(work, id);
    const near: Record<string, string> = {};
    const add = (digit: number | undefined, cls: string) => {
      if (digit !== undefined && digit !== right && near[String(digit)] === undefined)
        near[String(digit)] = cls;
    };
    if (cell.small) {
      if (sum.op === "sub") add(work.blank.get(cell.col), "borrow_not_marked");
      else if (right > 0) add(0, "carry_not_added");
    } else {
      add(work.flipped.get(cell.col), "borrow_error");
      add(work.forgot.get(cell.col), sum.op === "sub" ? "forgot_borrow" : "forgot_carry");
    }
    keys[id] = {
      kind: "enter",
      accept: [String(right)],
      ...(Object.keys(near).length > 0 ? { near } : {}),
    };
  }
  return {
    gaps: ids.map((id) => ({ id, kind: "enter", input: "number", max_length: 1 })),
    key: { gaps: keys },
  };
}

/** What an empty small cell stands for when it is judged: no carry (0), or the digit as written.
 * A result cell has no such reading: empty is missing. */
export function columnBlank(sum: Pick<ColumnSum, "op" | "operands">, id: string): string | null {
  const cell = cellOf(id);
  if (cell === null || !cell.small) return null;
  const blank = columnWork(sum).blank.get(cell.col);
  return blank === undefined ? null : String(blank);
}
