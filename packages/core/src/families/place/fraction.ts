import type { PlaceData, PlaceKey, Verdict } from "@jadwigo/contracts";

/**
 * fraction_shade (dl-w3.61.7): the judge and the solution for a shape to shade.
 *
 * Any `count` parts are right: the fraction names how many equal parts, not which (CCSS 3.NF.A.1;
 * NCTM's "Developing Essential Understanding of Rational Numbers, Grades 3-5", ch. 1: a fraction of a
 * region is about equal parts, wherever they sit). With `contiguous` set (the playground switch
 * shade, an open question for the owner and the product designer), the shaded parts must also touch.
 *
 * A miss takes, in order:
 * - `shaded_the_rest`: d − n parts, the part not named (3/4 asked, 1/4 shaded).
 * - `shaded_whole`: every part.
 * - `off_by_one_part`: one part more or fewer (a miscount).
 * - `parts_apart`: the right number, apart, when they must touch.
 * - `wrong_count`: anything else.
 * The step is marked as a whole: amber falls on the shape, not on a part, since no single part is
 * the miss.
 *
 * Ported from david-learns `frontend/src/families/place/fraction.ts`, the judge's half (its
 * checks stay with validation).
 */

type FractionData = Extract<PlaceData, { surface: "fraction" }>;
type FractionKey = Extract<PlaceKey, { surface: "fraction" }>;

const OTHER: Verdict = { correct: false, mistake_class: "other_wrong", parts: [] };
const miss = (mistake_class: string): Verdict => ({ correct: false, mistake_class, parts: [] });

/** The columns of a bar (all parts) or a rectangle (parts / rows). */
function colsOf(data: Pick<FractionData, "shape" | "parts" | "rows">): number {
  return data.shape === "rect"
    ? Math.max(1, Math.round(data.parts / Math.max(1, data.rows ?? 1)))
    : data.parts;
}

/** Whether the parts are neighbours of each other: side by side on a bar, edge to edge on a
 * rectangle, slice beside slice round a circle. */
export function touching(
  data: Pick<FractionData, "shape" | "parts" | "rows">,
  shaded: readonly number[],
): boolean {
  const [start] = shaded;
  if (shaded.length <= 1 || start === undefined) return true;
  const set = new Set(shaded);
  const cols = colsOf(data);
  const next = (i: number): number[] => {
    if (data.shape === "circle") return [(i + 1) % data.parts, (i - 1 + data.parts) % data.parts];
    const out: number[] = [];
    if (i % cols > 0) out.push(i - 1);
    if (i % cols < cols - 1) out.push(i + 1);
    if (data.shape === "rect") out.push(i - cols, i + cols);
    return out.filter((j) => j >= 0 && j < data.parts);
  };
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
    for (const j of next(i)) {
      if (set.has(j) && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === set.size;
}

export function judgeFraction(
  key: FractionKey,
  value: Record<string, unknown>,
  data?: PlaceData,
): Verdict {
  const shaded = value["shaded"];
  if (!Array.isArray(shaded) || !shaded.every((i) => Number.isInteger(i))) return OTHER;
  const fraction = data?.surface === "fraction" ? data : null;
  const d = fraction?.parts ?? Number.POSITIVE_INFINITY;
  const parts = [...new Set(shaded as number[])].filter((i) => i >= 0 && i < d);
  const n = parts.length;
  const want = key.count;
  if (n === want) {
    if (fraction?.contiguous && !touching(fraction, parts)) return miss("parts_apart");
    return { correct: true, mistake_class: null, parts: [] };
  }
  if (fraction !== null && n === d - want) return miss("shaded_the_rest");
  if (fraction !== null && n === d) return miss("shaded_whole");
  if (Math.abs(n - want) === 1) return miss("off_by_one_part");
  return miss("wrong_count");
}

/** The solution drawn: the first `count` parts, side by side. */
export function fractionSolution(key: FractionKey): { shaded: number[] } {
  return { shaded: Array.from({ length: key.count }, (_, i) => i) };
}
