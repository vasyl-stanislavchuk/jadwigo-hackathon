/**
 * A column cell's name, for its aria-label and for the voice (dl-w3.61.4): the place it sits in,
 * "the answer's tens" or "the small box in the tens column", never its digit.
 */

import { type CopyKey, copy } from "@jadwigo/copy";
import type { Language } from "../../stage/types.ts";
import { cellOf } from "./column.ts";

const RESULT: readonly CopyKey[] = ["column_r0", "column_r1", "column_r2", "column_r3"];
const SMALL: readonly CopyKey[] = ["column_c1", "column_c1", "column_c2", "column_c3"];

/** The cell's name; a cell past the thousands is named by its number in the working order. */
export function columnCellLabel(language: Language, id: string, n = 0): string {
  const cell = cellOf(id);
  const key = cell === null ? undefined : (cell.small ? SMALL : RESULT)[cell.col];
  return key === undefined ? copy(language, "gap_label", { n }) : copy(language, key);
}
