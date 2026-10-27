/**
 * The answer as the key holds it, in the shape of the value a family commits, for the solution
 * view the learner sees once a step ends without a right answer, for review and preview, and for
 * the words help must not print early. Nothing here compares an answer with the key: grading and
 * page marks belong to `packages/core` (`dl-e8ov.2.32.4`). The part ids and the tolerance below are
 * the names a view and the validator share with the judge there.
 *
 * Ported from the playground's `families/{judge,*\/judge,place/clock.judge,place/coins.judge}.ts`,
 * their solution functions and constants only.
 */

import type {
  ChooseKey,
  ChooseValue,
  EnterKey,
  EnterValue,
  GridSplit,
  GroupKey,
  GroupValue,
  PlaceData,
  PlaceKey,
  PlaceValue,
  Point,
  SequenceKey,
  SequenceValue,
  SlotsKey,
  SlotsValue,
} from "@jadwigo/contracts";
import { hourAtOf, mod } from "../parts/clock.ts";
import { fewestOf } from "./money.ts";
import { Family, Surface } from "./names.ts";
import type { BareSpec, FamilySpec } from "./types.ts";

type GridKey = Extract<PlaceKey, { surface: "grid" }>;
type ClockKey = Extract<PlaceKey, { surface: "clock" }>;
type CoinsKey = Extract<PlaceKey, { surface: "coins" }>;
type FractionKey = Extract<PlaceKey, { surface: "fraction" }>;

/** An area model's two parts (area_model, dl-w3.61.7): the rectangle built, and its split. */
export const SIZE_PART = "size";
export const SPLIT_PART = "split";

/** How far a clock's hour hand may sit from a real clock's and still be right, in minute marks:
 * half an hour's gap, since a child's hand half way between two numbers is never exactly on it. */
export const HOUR_TOLERANCE = 2.5;

export function chooseSolution(key: ChooseKey): ChooseValue {
  return { chosen: [...key.correct] };
}

export function enterSolution(key: EnterKey): EnterValue {
  return { entered: key.accept[0] ?? "" };
}

export function slotsSolution(key: SlotsKey): SlotsValue {
  return {
    gaps: Object.fromEntries(
      Object.entries(key.gaps).map(([id, k]) => [
        id,
        (k.kind === Family.Choose ? k.correct[0] : k.accept[0]) ?? "",
      ]),
    ),
  };
}

export function sequenceSolution(key: SequenceKey): SequenceValue {
  return [...(key.orders[0] ?? [])];
}

export function groupSolution(key: GroupKey): GroupValue {
  return {
    items: Object.fromEntries(Object.entries(key.items).map(([id, groups]) => [id, [...groups]])),
  };
}

/** Whether a point falls inside a polygon (even-odd rule). */
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

/** A point inside the region: the mean of its corners when that falls inside (any convex region),
 * else the first inside point on a 20 by 20 scan of its bounds. */
export function pointIn(polygon: readonly Point[]): Point {
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

/** The split an area model's solution draws: the first place the key accepts, else the middle. */
export function solutionSplit(key: GridKey): GridSplit | undefined {
  if (key.split === undefined) return undefined;
  return { axis: "cols", at: key.split.accept_at?.[0] ?? Math.floor(key.cols / 2) };
}

/** A shape's solution: the first `count` parts, side by side. */
export function fractionSolution(key: FractionKey): { shaded: number[] } {
  return { shaded: Array.from({ length: key.count }, (_, i) => i) };
}

/** The clock as the key sets it: the hour hand where a real clock puts it. */
export function clockSolution(key: ClockKey): { hour_at: number; m: number } {
  return { hour_at: hourAtOf(key.h, key.m), m: mod(key.m, 60) };
}

/** The fewest coins from the bank that make the amount, or null when the bank cannot make it. */
export function coinsSolution(
  key: CoinsKey,
  data?: Extract<PlaceData, { surface: "coins" }>,
): PlaceValue | null {
  const items = fewestOf(key.amount_gr, data?.bank ?? []);
  return items === null ? null : { items };
}

/** The solution as a value, where one value shows it. A picture's is a tap inside each target
 * region (dl-w3.70.28); the solution view draws the regions from the key itself. */
export function placeSolution(key: PlaceKey, data?: PlaceData): PlaceValue | null {
  switch (key.surface) {
    case Surface.Image:
      return { points: key.targets.map((r) => pointIn(r.polygon)) };
    case Surface.NumberLine:
      return { at: key.value };
    case Surface.Grid: {
      const split = solutionSplit(key);
      return split === undefined
        ? { rows: key.rows, cols: key.cols }
        : { rows: key.rows, cols: key.cols, split };
    }
    case Surface.Fraction:
      return fractionSolution(key);
    case Surface.Bars:
      return { heights: { ...key.heights } };
    case Surface.Coins:
      return coinsSolution(key, data?.surface === Surface.Coins ? data : undefined);
    case Surface.Clock:
      return clockSolution(key);
  }
}

/** The key as a value of the answer's shape. Explain has none: the tutor judges it. */
export function solutionOf(spec: BareSpec): unknown {
  switch (spec.family) {
    case Family.Choose:
      return chooseSolution(spec.key);
    case Family.Enter:
      return enterSolution(spec.key);
    case Family.Slots:
      return slotsSolution(spec.key);
    case Family.Sequence:
      return sequenceSolution(spec.key);
    case Family.Group:
      return groupSolution(spec.key);
    case Family.Place:
      return placeSolution(spec.key, spec.data);
    default:
      return null;
  }
}

/** The words a learner would read as the answer: the solution's text and numbers, and for a choice
 * the right options' own words. Ids such as `o2` are not words. Sequence, Group and Place answer
 * with ids and positions, never words a card could print. */
export function answerWords(spec: FamilySpec): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "number") out.push(String(v));
    else if (typeof v === "string" && !/^[a-z]+\d+$/.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v !== null && typeof v === "object") Object.values(v).forEach(walk);
  };
  if (spec.family === Family.Choose) {
    for (const o of spec.data.options) {
      if (!spec.key.correct.includes(o.id)) continue;
      if (o.content.kind === "text") out.push(o.content.text);
      if (o.content.kind === "number") out.push(String(o.content.number));
    }
  } else if (spec.family === Family.Slots) {
    for (const [id, answer] of Object.entries(spec.key.gaps)) {
      if (answer.kind === Family.Enter) out.push(...answer.accept);
      else {
        const gap = spec.data.gaps.find((g) => g.id === id);
        if (gap?.kind === Family.Choose)
          out.push(...gap.options.filter((o) => answer.correct.includes(o.id)).map((o) => o.label));
      }
    }
  } else if (spec.family === Family.Enter) {
    walk(enterSolution(spec.key));
  }
  // A decimal answer prints either way, `0.29` or `0,29` (dl-w3.70.7), and a fraction as Khan's
  // TeX prints it, `\dfrac{3}{4}` or `2\dfrac{1}{4}` (dl-w3.70.16).
  return out
    .filter((w) => w.trim() !== "")
    .flatMap((w) => {
      const t = w.trim();
      if (/^-?[0-9]*\.[0-9]+$/.test(t)) return [w, w.replace(".", ",")];
      const f = /^(?:([0-9]+) )?([0-9]+)\/([0-9]+)$/.exec(t);
      if (f === null) return [w];
      const [, whole = "", num, den] = f;
      return [w, ...["frac", "dfrac", "tfrac"].map((c) => `${whole}\\${c}{${num}}{${den}}`)];
    });
}

/** The answer word `text` prints whole, or null when it prints none. */
export function givesAway(text: string, answers: string[]): string | null {
  for (const a of answers) {
    const escaped = a.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      escaped !== "" &&
      new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text)
    )
      return a;
  }
  return null;
}
