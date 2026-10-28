import type { GridSplit, PartVerdict, PlaceKey, Verdict } from "@jadwigo/contracts";

/**
 * area_model (dl-w3.61.7): a rectangle built on the grid, then split once into two easier ones, the
 * distributive law drawn (6 × 7 = 6 × 5 + 6 × 2). The area model is how CCSS 3.MD.C.7c and the
 * Polish klasa 3 "mnożenie w zakresie 100" strategy of breaking a factor ("rozkład na składniki")
 * make a hard fact from two easy ones; Van de Walle, "Elementary and Middle School Mathematics",
 * ch. 9, on the area model for multiplication.
 *
 * Two parts, judged and marked apart:
 * - `size`: the rectangle, either way round when the key allows it; else `wrong_size`.
 * - `split`: none is `no_split`. A split counts on the side as long as the key's `cols` (the factor
 *   to break); `accept_at` lists where it may fall, counted from either end, and any split there is
 *   right when the key lists none. A split on the other side, or elsewhere, is `split_not_helpful`.
 *
 * Only the judge's half is here; the checks stay with validation.
 */

type GridKey = Extract<PlaceKey, { surface: "grid" }>;

const SIZE_PART = "size";
const SPLIT_PART = "split";

function isSplit(v: unknown): v is GridSplit {
  if (v === null || typeof v !== "object") return false;
  const { axis, at } = v as Record<string, unknown>;
  return (axis === "rows" || axis === "cols") && Number.isInteger(at);
}

/** Whether a split cuts the factor the key breaks, at a place the key accepts. */
function splitRight(key: GridKey, rows: number, cols: number, split: GridSplit): boolean {
  const length = split.axis === "cols" ? cols : rows;
  if (length !== key.cols || split.at <= 0 || split.at >= length) return false;
  const at = key.split?.accept_at;
  return (
    at === undefined || at.length === 0 || at.includes(split.at) || at.includes(length - split.at)
  );
}

/** The grid judge once the key asks for a split; `sizeRight` is the plain grid's verdict. */
export function judgeAreaModel(
  key: GridKey,
  rows: number,
  cols: number,
  sizeRight: boolean,
  split: unknown,
): Verdict {
  const size: PartVerdict = sizeRight
    ? { id: SIZE_PART, correct: true, mistake_class: null }
    : { id: SIZE_PART, correct: false, mistake_class: "wrong_size" };
  const cut: PartVerdict = !isSplit(split)
    ? { id: SPLIT_PART, correct: false, mistake_class: "no_split" }
    : splitRight(key, rows, cols, split)
      ? { id: SPLIT_PART, correct: true, mistake_class: null }
      : { id: SPLIT_PART, correct: false, mistake_class: "split_not_helpful" };
  const parts = [size, cut];
  const firstWrong = parts.find((p) => !p.correct);
  return firstWrong
    ? { correct: false, mistake_class: firstWrong.mistake_class, parts }
    : { correct: true, mistake_class: null, parts };
}

/** The split the solution draws: the first place the key accepts, else the middle. */
export function solutionSplit(key: GridKey): GridSplit | undefined {
  if (key.split === undefined) return undefined;
  return { axis: "cols", at: key.split.accept_at?.[0] ?? Math.floor(key.cols / 2) };
}
