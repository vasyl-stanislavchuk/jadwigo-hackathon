/**
 * The checks a written column sum passes (dl-w3.61.4, docs/18 §7d): a sum the column form can
 * draw, a product by one digit, given steps that leave the child something to do, and gaps and a
 * key exactly as `columnKey` derives them from the sum (`column_mismatch`), so the cells, their
 * accepted digits and their near misses can never drift from the arithmetic.
 */

import { type ColumnSum, columnKey, columnWork } from "./column.ts";
import type { SlotsData, SlotsKey } from "./model.ts";

type Report = (path: string, rule: string, message: string) => void;

export function columnProblems(data: SlotsData, key: SlotsKey, err: Report, warn: Report): void {
  const sum: ColumnSum | undefined = data.column;
  if (sum === undefined) return;
  const [a, b] = sum.operands;
  if (![a, b].every((n) => Number.isInteger(n) && n >= 0)) {
    err(
      "data.column.operands",
      "bad_operand",
      "A column sum takes two whole numbers, zero or more.",
    );
    return;
  }
  if (sum.op === "sub" && a < b) {
    err(
      "data.column.operands",
      "negative_difference",
      "The top number must be at least the bottom one: the column form has no answer below zero.",
    );
    return;
  }
  if (sum.op === "mul" && b > 9)
    err(
      "data.column.operands",
      "multiplier_digits",
      "A written product here multiplies by one digit: the second factor is 0 to 9.",
    );
  if (data.template.trim() !== "" || data.table || data.picture)
    warn(
      "data.column",
      "column_with_text",
      "A column step draws only its sum: the template, table and picture are not shown with it.",
    );
  const work = columnWork(sum);
  if (!Number.isInteger(sum.given_steps) || sum.given_steps < 0)
    err(
      "data.column.given_steps",
      "bad_given_steps",
      "given_steps is a whole number, zero or more.",
    );
  else if (sum.given_steps >= work.result.length)
    err(
      "data.column.given_steps",
      "all_given",
      "Every column is given, so the child has nothing to work.",
    );
  const derived = columnKey(sum);
  const same =
    JSON.stringify(sortKeys(data.gaps)) === JSON.stringify(sortKeys(derived.gaps)) &&
    JSON.stringify(sortKeys(key.gaps)) === JSON.stringify(sortKeys(derived.key.gaps));
  if (!same)
    err(
      "data.column",
      "column_mismatch",
      `The gaps or the key are not what the sum derives (columnKey): expected the cells ${derived.gaps.map((g) => g.id).join(", ")}.`,
    );
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .sort(([x], [y]) => (x < y ? -1 : 1))
        .map(([k, w]) => [k, sortKeys(w)]),
    );
  return v;
}
