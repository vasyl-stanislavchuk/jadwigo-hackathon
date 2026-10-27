/**
 * Place: the learner marks a position on a surface. Question types: number_line place (a value on a line,
 * within a tolerance), hotspot (taps on a picture, inside regions; ClassTime's HOTSPOT), spatial
 * build (a rows × cols rectangle on a grid of dots) and draw_graph (a height per bar on a bar
 * graph, a picture graph, a line plot, a dot plot, a line graph or a histogram; Khan's plotter,
 * dl-w3.51.3 and dl-w3.61.3).
 *
 * dl-w3.61 adds, as types first: clock_set on a clock (lane D), money_pay on coins (lane E),
 * fraction_shade on a fraction shape and area_model's split on the grid (lane F). Each lane fills
 * its surface's judge, view and checks; until then they take the "not built" path.
 *
 * Points on a picture are fractions of its width and height (0 to 1), so they hold at any size,
 * unlike ClassTime's pixels. The regions are the key and never reach the page (docs/17 Q3).
 */

import type { LineDivisions } from "@jadwigo/contracts";

export type {
  ClockValue,
  GridSplit,
  LineDivisions,
  PlaceData,
  PlaceKey,
  PlaceValue,
  Point,
} from "@jadwigo/contracts";

/** The line cut into `parts` equal parts: its step is the span over the parts. */
export function lineInParts<L extends { min: number; max: number; step: number }>(
  line: L,
  parts: number,
): L {
  return { ...line, step: Number(((line.max - line.min) / parts).toFixed(10)) };
}

/** The parts a line's step cuts it into. */
export const partsOf = (line: { min: number; max: number; step: number }): number =>
  Math.round((line.max - line.min) / line.step);

/** The fewest parts in `divisions` whose ticks hold `value`, or null when no count does. */
export function partsHolding(
  line: { min: number; max: number },
  divisions: LineDivisions,
  value: number,
): number | null {
  for (let n = divisions.min; n <= divisions.max; n++) {
    const k = ((value - line.min) * n) / (line.max - line.min);
    if (Math.abs(k - Math.round(k)) < 1e-6) return n;
  }
  return null;
}
