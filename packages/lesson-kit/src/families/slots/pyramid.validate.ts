/**
 * The checks a number pyramid passes (dl-w3.61.4, docs/18 §7d): row i has i + 1 cells, each a
 * number or one gap marker; every brick over two known bricks is their sum, and every gap's key is
 * the value the pyramid gives it (`pyramid_sum`); a gap the givens leave open is a warning
 * (`pyramid_ambiguous`), because then more than one answer fits.
 */

import { Family } from "../names.ts";
import type { SlotsData, SlotsKey } from "./model.ts";
import { pyramidBroken, pyramidGapOf, pyramidShaped, pyramidValues } from "./pyramid.ts";

type Report = (path: string, rule: string, message: string) => void;

export function pyramidProblems(data: SlotsData, key: SlotsKey, err: Report, warn: Report): void {
  const rows = data.pyramid;
  if (rows === undefined) return;
  if (!pyramidShaped(rows)) {
    err(
      "data.pyramid",
      "pyramid_shape",
      "A pyramid has at least two rows, and row i (from the top, 0 up) has i + 1 cells.",
    );
    return;
  }
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (typeof cell === "string" && pyramidGapOf(cell) === null)
        err(
          `data.pyramid[${i}][${j}]`,
          "pyramid_cell",
          `The cell “${cell}” is neither a number nor a gap marker.`,
        );
    });
  });
  for (const [i, j] of pyramidBroken(rows))
    err(
      `data.pyramid[${i}][${j}]`,
      "pyramid_sum",
      "This brick is not the sum of the two below it.",
    );
  const values = pyramidValues(rows);
  for (const g of data.gaps) {
    const v = values[g.id];
    if (v === undefined) {
      warn(
        `data.gaps.${g.id}`,
        "pyramid_ambiguous",
        `The bricks given do not settle ${g.id}: more than one answer fits.`,
      );
      continue;
    }
    const k = key.gaps[g.id];
    if (k?.kind === Family.Enter && !k.accept.includes(String(v)))
      err(
        `key.gaps.${g.id}`,
        "pyramid_sum",
        `The pyramid gives ${g.id} the value ${v}, but the key accepts ${k.accept.join(", ")}.`,
      );
  }
}
