/**
 * The checks a line graph and a histogram add to a drawn graph's (dl-w3.61.3); validate.ts calls
 * this with one line from its Place case. A histogram needs its bin edges, one more than its
 * categories and increasing. Bins of unequal width draw as equal columns, which misleads a reader,
 * so they are a warning. Edges on a graph that is not a histogram are never drawn.
 */

import type { Surface } from "../names.ts";
import type { PlaceData } from "./model.ts";

type Report = (path: string, rule: string, message: string) => void;
type Bars = Extract<PlaceData, { surface: typeof Surface.Bars }>;

export function graphKindProblems(data: Bars, err: Report, warn: Report): void {
  const n = data.categories.length;
  if (data.kind !== "histogram") {
    if (data.bins !== undefined)
      warn("data.bins", "bins_unused", "Only a histogram draws bin edges.");
    return;
  }
  const bins = data.bins;
  if (bins === undefined || bins.length !== n + 1) {
    err("data.bins", "bins_mismatch", `A histogram of ${n} bars needs ${n + 1} bin edges.`);
    return;
  }
  if (bins.some((b, i) => i > 0 && !(b > (bins[i - 1] ?? b)))) {
    err("data.bins", "bins_not_increasing", "The bin edges must increase from left to right.");
    return;
  }
  const widths = bins.slice(1).map((b, i) => b - (bins[i] ?? b));
  if (widths.some((w) => Math.abs(w - (widths[0] ?? w)) > 1e-9))
    warn(
      "data.bins",
      "unequal_bins",
      "The bins are not all the same width, but each is drawn the same width.",
    );
}
