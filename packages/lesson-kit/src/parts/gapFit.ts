/**
 * Part: a cell that sets the size of the gap drawn in it (Slots addendum 3.2, 4.2, 4.4, 4.5;
 * dl-uukj.29.124). A table cell, a square of the written sum, a pyramid brick and a gap inside a
 * word each fix their gap's box, whatever is typed: the field fills the cell.
 *
 * The cell sets custom properties and the field reads them (InlineField.tsx `FIELD_BOX` and
 * `fieldWidth`), falling back to its own length rule outside a cell:
 * - `--gap-w`, `--gap-h`: the field's width and height;
 * - `--gap-font`: its type size;
 * - `--gap-min-w`, `--gap-px`, `--gap-mx`: no least width, no side padding and no word margin, so
 *   the cell's size holds;
 * - `--gap-justify`, `--gap-align`: what it holds is centred;
 * - `--gap-r`: its corners (r10 for a square or a table cell, else the field's r16).
 */

import { type CSSProperties, useContext } from "react";
import { Tray } from "./Tools.tsx";

/** The size a cell gives its gap. `font` defaults to the cell's own type size, `radius` to the
 * field's own corners. */
export function gapFit(
  width: string,
  height: string,
  font = "1em",
  radius?: string,
): CSSProperties {
  return {
    "--gap-w": width,
    "--gap-h": height,
    "--gap-font": font,
    "--gap-min-w": "0",
    "--gap-px": "0",
    "--gap-mx": "0",
    "--gap-justify": "center",
    "--gap-align": "center",
    ...(radius !== undefined ? { "--gap-r": radius } : {}),
  } as CSSProperties;
}

/** A square field's corners, r10, for a column's square and a table's cell (addendum 4.2, 4.4). */
export const SQUARE_RADIUS = "0.625rem";

/** A size the addendum gives in CSS pixels, as rem (16 to the rem), so it scales with the page's
 * type as every token does. */
export const rem = (px: number): string => `${px / 16}rem`;

/** Whether the step is drawn in the phone frame, where the cells take their phone sizes (56 → 48,
 * 104 → 88). Outside a step frame (a still view, a test) the laptop's. */
export function usePhoneCells(): boolean {
  return useContext(Tray)?.frame === "phone";
}
