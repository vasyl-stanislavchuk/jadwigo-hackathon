/**
 * A number pyramid (piramida liczbowa, dl-w3.61.4): bricks in rows, each brick the sum of the two
 * below it. A common klasa 2 to 4 exercise in Polish workbooks, because it practises addition and
 * subtraction with a check built in: a missing brick may sit above (add the two below) or below
 * (take the known brick from the one above).
 *
 * The rows are written top to bottom: row i has i + 1 cells, each a number or a `{gN}` marker. The
 * key accepts each gap's one value. `pyramidSolve` fills the pyramid from what is given, and
 * `pyramidNear` names the two classic slips for a gap: a missing brick under a known one found by
 * adding instead of subtracting (`added_for_missing`), and a brick over two known ones found by
 * subtracting instead of adding (`subtracted_for_sum`).
 */

import type { PyramidRows } from "@jadwigo/contracts";
import { Family } from "../names.ts";

export type { PyramidRows };
export type PyramidCell = PyramidRows[number][number];

const MARK = /^\{([a-z][a-z0-9_]*)\}$/;

/** A cell as the gaps model reads it: its number as text, or its marker. */
export function pyramidCellText(cell: PyramidCell): string {
  return typeof cell === "number" ? String(cell) : cell;
}

/** The gap id a cell holds, or null for a number. */
export function pyramidGapOf(cell: PyramidCell): string | null {
  if (typeof cell === "number") return null;
  return MARK.exec(cell.trim())?.[1] ?? null;
}

/** The order the child fills the gaps in (Slots addendum 4.5, 9b): the bottom row first, left to
 * right, then up, as a pyramid is built, so the step opens on the lowest gap. The rows are written
 * top to bottom, so this reads them backwards. */
export function pyramidFillOrder(rows: PyramidRows): string[] {
  return [...rows].reverse().flatMap((row) => row.flatMap((cell) => pyramidGapOf(cell) ?? []));
}

/** Whether the rows have the pyramid's shape: row i has i + 1 cells. */
export function pyramidShaped(rows: PyramidRows): boolean {
  return rows.length >= 2 && rows.every((row, i) => row.length === i + 1);
}

/**
 * Every brick's value, worked from the given ones: a brick over two known bricks is their sum, and
 * a brick under a known brick beside a known sibling is the difference. Bricks the givens do not
 * settle stay null (the gaps then have more than one answer).
 */
function pyramidSolve(rows: PyramidRows): (number | null)[][] {
  const v = rows.map((row) => row.map((c) => (typeof c === "number" ? c : null)));
  let moved = true;
  while (moved) {
    moved = false;
    for (let i = 0; i + 1 < v.length; i++) {
      const row = v[i] ?? [];
      const below = v[i + 1] ?? [];
      for (let j = 0; j < row.length; j++) {
        const up = row[j] ?? null;
        const l = below[j] ?? null;
        const r = below[j + 1] ?? null;
        if (up === null && l !== null && r !== null) row[j] = l + r;
        else if (up !== null && l === null && r !== null) below[j] = up - r;
        else if (up !== null && l !== null && r === null) below[j + 1] = up - l;
        else continue;
        moved = true;
      }
    }
  }
  return v;
}

/** The bricks that break the rule: a brick over two bricks that is not their sum, as [row, cell]. */
export function pyramidBroken(rows: PyramidRows): [number, number][] {
  const v = pyramidSolve(rows);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < v.length; i++) {
    for (let j = 0; j < (v[i]?.length ?? 0); j++) {
      const [up, l, r] = [v[i]?.[j] ?? null, v[i + 1]?.[j] ?? null, v[i + 1]?.[j + 1] ?? null];
      if (up !== null && l !== null && r !== null && up !== l + r) out.push([i, j]);
    }
  }
  return out;
}

/** The values the gaps take, by gap id; a gap the givens do not settle is absent. */
export function pyramidValues(rows: PyramidRows): Record<string, number> {
  const v = pyramidSolve(rows);
  const out: Record<string, number> = {};
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      const id = pyramidGapOf(cell);
      const value = v[i]?.[j] ?? null;
      if (id !== null && value !== null) out[id] = value;
    });
  });
  return out;
}

/** The near misses for each gap, by gap id: the entry each classic slip gives, and its class. */
function pyramidNear(rows: PyramidRows): Record<string, Record<string, string>> {
  const v = pyramidSolve(rows);
  const out: Record<string, Record<string, string>> = {};
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      const id = pyramidGapOf(cell);
      const right = v[i]?.[j] ?? null;
      if (id === null || right === null) return;
      const near: Record<string, string> = {};
      const add = (n: number | null, cls: string) => {
        if (n !== null && n !== right && n >= 0 && near[String(n)] === undefined)
          near[String(n)] = cls;
      };
      // A brick under a known one: added the brick above and its neighbour.
      for (const [pi, pj, si, sj] of [
        [i - 1, j - 1, i, j - 1],
        [i - 1, j, i, j + 1],
      ] as const) {
        const up = v[pi]?.[pj];
        const sib = v[si]?.[sj];
        if (up !== undefined && up !== null && sib !== undefined && sib !== null)
          add(up + sib, "added_for_missing");
      }
      // A brick over two: took one from the other.
      const l = v[i + 1]?.[j];
      const r = v[i + 1]?.[j + 1];
      if (l !== undefined && l !== null && r !== undefined && r !== null)
        add(Math.abs(l - r), "subtracted_for_sum");
      if (Object.keys(near).length > 0) out[id] = near;
    });
  });
  return out;
}

/** The key a pyramid's gaps take: each gap's one value, with its near misses. */
export function pyramidKey(
  rows: PyramidRows,
): Record<string, { kind: typeof Family.Enter; accept: string[]; near?: Record<string, string> }> {
  const values = pyramidValues(rows);
  const near = pyramidNear(rows);
  return Object.fromEntries(
    Object.entries(values).map(([id, n]) => [
      id,
      { kind: Family.Enter, accept: [String(n)], ...(near[id] ? { near: near[id] } : {}) },
    ]),
  );
}
