/**
 * A table with no header is a layout, not a data table (dl-w3.81). Khan writes one as an empty `||`
 * header and an alignment row, only to line things up, most often an equation chain:
 *
 *     8·9 = (5·□) + (3·9)
 *         = 45 + 27
 *         = □
 *
 * The bank keeps the empty header, so `isLayout` reads it. Khan's markdown puts a chain's later
 * steps in column 1 (`|= 45 + 27|`), and `chainRows` moves each one under the first `=`. A cell
 * moves only inside its own row, so the gaps keep their reading order (model.ts `pieces`).
 */

import type { SlotsTable } from "./model.ts";

/** Whether the table is a layout: every header cell is blank. */
export function isLayout(table: SlotsTable): boolean {
  return table.header.every((c) => c.trim() === "");
}

/** Whether a cell's text opens with `=`, ahead of any TeX dollars and spaces. */
function opensWithEquals(text: string): boolean {
  return /^[\s$]*=/.test(text);
}

/**
 * A layout table's rows, with a chain's later steps moved under its first `=`: in a 2-column table
 * whose first row's second cell opens with `=`, a row `["= …", ""]` becomes `["", "= …"]`. A row
 * already in place stays. When any later row has another shape, the rows stay as written: the
 * table is not a chain, and nothing is guessed.
 */
export function chainRows(table: SlotsTable): readonly (readonly string[])[] {
  const { rows } = table;
  const [first, ...rest] = rows;
  const columns = Math.max(table.header.length, ...rows.map((r) => r.length));
  if (!isLayout(table) || columns !== 2 || first === undefined || rest.length === 0) return rows;
  if (!opensWithEquals(first[1] ?? "")) return rows;
  const out: string[][] = [[...first]];
  for (const row of rest) {
    const left = row[0] ?? "";
    const right = row[1] ?? "";
    if (left.trim() === "" && opensWithEquals(right)) out.push([left, right]);
    else if (right.trim() === "" && opensWithEquals(left)) out.push(["", left]);
    else return rows;
  }
  return out;
}
