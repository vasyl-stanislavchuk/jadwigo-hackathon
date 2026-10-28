/**
 * area_model (dl-w3.61.7): a rectangle built on the grid, then split once into two easier ones, the
 * distributive law drawn (6 × 7 = 6 × 5 + 6 × 2). The area model is how CCSS 3.MD.C.7c and the
 * Polish klasa 3 "mnożenie w zakresie 100" strategy of breaking a factor ("rozkład na składniki")
 * make a hard fact from two easy ones; Van de Walle, "Elementary and Middle School Mathematics",
 * ch. 9, on the area model for multiplication.
 *
 * Its two parts, `SIZE_PART` and `SPLIT_PART`, and the solution's split live in families/answer.ts;
 * the judge is `packages/core`'s. This file keeps the author's checks.
 */

import type { Surface } from "../names.ts";
import type { PlaceData, PlaceKey } from "./model.ts";

type GridData = Extract<PlaceData, { surface: typeof Surface.Grid }>;
type GridKey = Extract<PlaceKey, { surface: typeof Surface.Grid }>;

type Report = (path: string, rule: string, message: string) => void;

/** The checks (docs/18 §7d): a split needs a side to cut, and each accepted place sits inside it. */
export function areaModelProblems(data: GridData, key: GridKey, err: Report): void {
  const asks = data.split === "one";
  if (asks !== (key.split !== undefined))
    err("key.split", "split_mismatch", "A grid asks for a split exactly when its key has one.");
  if (key.split === undefined) return;
  if (key.cols < 2) err("key.cols", "nothing_to_split", "A side of one cannot be split.");
  key.split.accept_at?.forEach((at, i) => {
    if (!Number.isInteger(at) || at <= 0 || at >= key.cols)
      err(
        `key.split.accept_at[${i}]`,
        "split_outside",
        `A split after ${at} does not fall inside a side of ${key.cols}.`,
      );
  });
}
