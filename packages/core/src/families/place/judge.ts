import type {
  PartMark,
  PartVerdict,
  PlaceData,
  PlaceKey,
  PlaceValue,
  Point,
  Verdict,
} from "@jadwigo/contracts";
import { applyRule, isInt, isNum, withinTolerance } from "../rules.ts";
import { judgeAreaModel, solutionSplit } from "./areaModel.ts";
import { clockSolution, judgeClock } from "./clock.ts";
import { coinsSolution, judgeCoins } from "./coins.ts";
import { fractionSolution, judgeFraction } from "./fraction.ts";

/**
 * The Place judge, by surface.
 * - Number line: right within the tolerance; a miss takes the key's number rule (off_by_tick,
 *   scale_misread, wrong_direction), else `other_wrong`. `at` may be a fraction (dl-w3.55): the
 *   marker snaps to the line's finest position, which need not be whole.
 * - Picture: every tap is a part (`t1`, `t2` in tap order). A tap inside a target is right, inside a
 *   `near` region takes its class, elsewhere is `missed_region`. With `require_all`, a target nobody
 *   tapped makes the step incorrect as `target_missed`. ClassTime's hotspot, with a verdict per point.
 * - Grid: right when rows and cols match, either way round when the key allows it. With the key's
 *   `off_by_one`, one row or one column off is `grid_off_by_one`; else a miss is `other_wrong`, as
 *   the Python grader says for the built spatial block (familyGolden.test.ts). With a split
 *   (area_model, dl-w3.61.7, areaModel.ts) the size and the split are two parts, each marked.
 * - Bars (dl-w3.51.3): every category is a part. A bar within the tolerance is right; one step off
 *   either way is `bar_off_by_step` (a miscount by one, the common miss on a graph drawn from a
 *   tally); anything else is `bar_wrong`. A category left out of the value is `bar_wrong`.
 *   Perseus scores the plotter all or nothing (perseus-score/src/widgets/plotter/score-plotter.ts,
 *   approximateDeepEqual on the heights); a verdict per bar is ours, so the marks can say which.
 *
 * - Clock (dl-w3.61.5, clock.ts): each hand is a part.
 * - Coins (dl-w3.61.6): the tray as a whole, in place/coins.ts.
 * - Fraction (dl-w3.61.7, fraction.ts): any `count` parts shaded are right.
 *
 * Marks: per tap on a picture (a tap is the learner's own, and marking it shows nothing new), per
 * bar on a graph (a marked bar still has to be counted again), and size and split on an area model;
 * the whole step on a line, a plain grid or a fraction.
 */

const OTHER: Verdict = { correct: false, mistake_class: "other_wrong", parts: [] };
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const isPoint = (p: unknown): p is Point =>
  isObject(p) && typeof p["x"] === "number" && typeof p["y"] === "number";

/** Ray casting: whether a point is inside a closed polygon. */
function inside(p: Point, polygon: readonly Point[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a === undefined || b === undefined) continue;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      hit = !hit;
  }
  return hit;
}

const EPS = 1e-9;

/** `data` is the step's data, read for a graph's step; the other surfaces judge from the key alone. */
export function judgePlace(key: PlaceKey, value: unknown, data?: PlaceData): Verdict {
  if (!isObject(value)) return OTHER;
  switch (key.surface) {
    case "bars": {
      const heights = value["heights"];
      if (!isObject(heights)) return OTHER;
      const step = data?.surface === "bars" ? data.step : 1;
      const tolerance = key.tolerance ?? 0;
      const parts = Object.entries(key.heights).map(([id, want]): PartVerdict => {
        const h = heights[id];
        if (!isNum(h)) return { id, correct: false, mistake_class: "bar_wrong" };
        const off = Math.abs(h - want);
        if (off <= tolerance + EPS) return { id, correct: true, mistake_class: null };
        return {
          id,
          correct: false,
          mistake_class: off <= tolerance + step + EPS ? "bar_off_by_step" : "bar_wrong",
        };
      });
      const firstWrong = parts.find((p) => !p.correct);
      return firstWrong
        ? { correct: false, mistake_class: firstWrong.mistake_class, parts }
        : { correct: true, mistake_class: null, parts };
    }
    case "number_line": {
      const at = value["at"];
      if (!isNum(at)) return OTHER;
      if (withinTolerance(at, key.value, key.tolerance))
        return { correct: true, mistake_class: null, parts: [] };
      return {
        correct: false,
        mistake_class: key.rule ? applyRule(key.rule, at, key.value, key.tolerance) : "other_wrong",
        parts: [],
      };
    }
    case "grid": {
      const rows = value["rows"];
      const cols = value["cols"];
      if (!isInt(rows) || !isInt(cols)) return OTHER;
      const right =
        (rows === key.rows && cols === key.cols) ||
        (key.either_order && rows === key.cols && cols === key.rows);
      if (key.split !== undefined) return judgeAreaModel(key, rows, cols, right, value["split"]);
      if (right) return { correct: true, mistake_class: null, parts: [] };
      // One row or one column too many or too few: a miscount, the near miss on a grid.
      const off = (r: number, c: number) => Math.abs(rows - r) + Math.abs(cols - c) === 1;
      return key.off_by_one === true &&
        (off(key.rows, key.cols) || (key.either_order && off(key.cols, key.rows)))
        ? { correct: false, mistake_class: "grid_off_by_one", parts: [] }
        : OTHER;
    }
    case "image": {
      const raw = value["points"];
      if (!Array.isArray(raw) || raw.length === 0 || !raw.every(isPoint)) return OTHER;
      const points: Point[] = raw;
      const parts = points.map((p, i): PartVerdict => {
        const id = `t${i + 1}`;
        if (key.targets.some((r) => inside(p, r.polygon)))
          return { id, correct: true, mistake_class: null };
        const near = key.near?.find((r) => inside(p, r.polygon));
        return { id, correct: false, mistake_class: near?.mistake_class ?? "missed_region" };
      });
      const firstWrong = parts.find((p) => !p.correct);
      if (firstWrong) return { correct: false, mistake_class: firstWrong.mistake_class, parts };
      const allHit = key.targets.every((r) => points.some((p) => inside(p, r.polygon)));
      if (key.require_all && !allHit)
        return { correct: false, mistake_class: "target_missed", parts };
      return { correct: true, mistake_class: null, parts };
    }
    // lane D (dl-w3.61.5): the clock judge, in place/clock.ts, a verdict per hand (h, m).
    case "clock":
      return judgeClock(key, value, data);
    // lane E (dl-w3.61.6): the coins judge, in place/coins.ts.
    case "coins":
      return judgeCoins(key, value, data?.surface === "coins" ? data : undefined);
    // lane F (dl-w3.61.7): the fraction judge, in place/fraction.ts.
    case "fraction":
      return judgeFraction(key, value, data);
  }
}

export function placeMarks(data: PlaceData, verdict: Verdict): PartMark[] | null {
  // lane D (dl-w3.61.5): a clock is marked per hand.
  if (!verdict.correct && data.surface === "clock" && verdict.parts.length > 0)
    return verdict.parts.map(({ id, correct }) => ({ id, correct }));
  // end lane D
  if (
    verdict.correct ||
    (data.surface !== "image" && data.surface !== "bars" && data.surface !== "grid") ||
    verdict.parts.length === 0
  )
    return null;
  return verdict.parts.map(({ id, correct }) => ({ id, correct }));
}

/** A point inside the region: the mean of its corners when that falls inside (any convex region),
 * else the first inside point on a 20 by 20 scan of its bounds. */
function pointIn(polygon: readonly Point[]): Point {
  const mean = {
    x: polygon.reduce((a, p) => a + p.x, 0) / polygon.length,
    y: polygon.reduce((a, p) => a + p.y, 0) / polygon.length,
  };
  if (inside(mean, polygon)) return mean;
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 1; i < 20; i++)
    for (let j = 1; j < 20; j++) {
      const p = { x: x0 + ((x1 - x0) * i) / 20, y: y0 + ((y1 - y0) * j) / 20 };
      if (inside(p, polygon)) return p;
    }
  return mean;
}

/** The solution as a value, where one value shows it. A picture's solution is a tap inside each
 * target region (dl-w3.70.28), so the judge marks it correct; the solution view draws the regions
 * from the key itself. */
export function placeSolution(key: PlaceKey, data?: PlaceData): PlaceValue | null {
  if (key.surface === "image") return { points: key.targets.map((r) => pointIn(r.polygon)) };
  if (key.surface === "number_line") return { at: key.value };
  if (key.surface === "grid") {
    const split = solutionSplit(key);
    return split === undefined
      ? { rows: key.rows, cols: key.cols }
      : { rows: key.rows, cols: key.cols, split };
  }
  if (key.surface === "fraction") return fractionSolution(key);
  if (key.surface === "bars") return { heights: { ...key.heights } };
  // lane E (dl-w3.61.6): the fewest coins from the bank.
  if (key.surface === "coins")
    return coinsSolution(key, data?.surface === "coins" ? data : undefined);
  // lane D (dl-w3.61.5)
  if (key.surface === "clock") return clockSolution(key);
  // end lane D
  return null;
}
