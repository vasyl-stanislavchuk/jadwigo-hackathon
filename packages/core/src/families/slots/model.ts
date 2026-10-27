import type { Gap, SlotsData, SlotsTable } from "@jadwigo/contracts";
import { columnFillOrder, columnKey } from "./column.ts";
import { pyramidCellText, pyramidFillOrder } from "./pyramid.ts";

/**
 * Gaps: the learner fills gaps in a text, an equation or a command. Each gap is either typed (an
 * Enter gap) or chosen from a short list (a Choose gap), and a text may mix the two (ClassTime's GAP).
 * Question types: fill_gaps (one gap or several in a line, typed or chosen: fill_blank and cloze
 * merged into it, Slots addendum section 1), fill_table (the gaps sit in a table's cells, dl-w3.51.5), label_picture (gaps placed
 * on a picture, dl-w3.51.2), column (written arithmetic, cell by cell, families/slots/column.ts) and
 * pyramid (a number pyramid of bricks, families/slots/pyramid.ts), both dl-w3.61.4.
 *
 * The template marks each gap with its id in braces, `{g1}`, and every marker has exactly one gap.
 * Braces inside a `$…$` TeX span are TeX, not markers (dl-r772.6): `\text{fives}` is no gap. A step
 * may also carry a `table` whose cells hold text or markers, and a `picture` on which a gap with
 * `at` sits as a marker. The reading order is the picture's markers, then the template, then the
 * table row by row, and `markerIds` and `pieces` read all three.
 *
 * Ported from david-learns `frontend/src/families/slots/model.ts`, the reading order the judge and
 * the help release need; the types are in `@jadwigo/contracts`. `texRanges` is ported privately
 * from `frontend/src/components/parts/richTextParse.ts`.
 */

/** What the markers are read from: a template string, or a step's picture, template and table. */
type SlotsText =
  | string
  | (Pick<SlotsData, "template"> &
      Partial<Pick<SlotsData, "table" | "picture" | "gaps" | "column" | "pyramid">>);

/** The gaps placed on the picture, in the order they are listed. None without a picture. */
function placedGaps(data: Partial<Pick<SlotsData, "picture" | "gaps">>): Gap[] {
  return data.picture ? (data.gaps ?? []).filter((g) => g.at !== undefined) : [];
}

type Piece = { text: string } | { gap: string };

const MARKER = /\{([a-z][a-z0-9_]*)\}/g;

/** Where the TeX span opening at `i` ends (the index after its closing dollars), or -1 when it never
 * closes. `\$` inside a span is a dollar, not a closing one. */
function texEnd(text: string, i: number, display: boolean): number {
  const close = display ? "$$" : "$";
  let at = i + close.length;
  while (at < text.length) {
    if (text[at] === "\\") {
      at += 2;
      continue;
    }
    if (text.startsWith(close, at)) return at + close.length;
    at++;
  }
  return -1;
}

/** The span opening at `i`: display when `$$` opens and closes it, else inline; -1 when neither closes. */
function spanEnd(text: string, i: number): number {
  if (text.startsWith("$$", i)) {
    const end = texEnd(text, i, true);
    if (end !== -1) return end;
  }
  return texEnd(text, i, false);
}

/** The [start, end) ranges of every TeX span in a text, in order. A span that never closes is text. */
function texRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") {
      i += 2;
    } else if (c === "`") {
      const end = text.indexOf("`", i + 1);
      i = end === -1 ? i + 1 : end + 1;
    } else if (c === "$") {
      const end = spanEnd(text, i);
      if (end === -1) i++;
      else {
        out.push([i, end]);
        i = end;
      }
    } else i++;
  }
  return out;
}

/** The marker matches outside TeX, in reading order. */
function markers(template: string): RegExpExecArray[] {
  const tex = texRanges(template);
  return [...template.matchAll(MARKER)].filter(
    (m) => !tex.some(([start, end]) => m.index >= start && m.index < end),
  );
}

/** One text cut at its markers: text runs and gap ids, in reading order. */
function cut(template: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of markers(template)) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ gap: m[1] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

/** A table's rows in reading order: the header first when it says anything, then each row. */
function tableRows(table: SlotsTable): string[][] {
  return table.header.some((c) => c.trim() !== "") ? [table.header, ...table.rows] : table.rows;
}

/**
 * The text cut at its markers, in reading order: the picture's markers, then the template's runs,
 * then, for a step with a table, each cell row by row. Markers and cells are set apart by a comma
 * and rows by a full stop, so the voice reads them as a list and the markers keep their order.
 */
export function pieces(source: SlotsText): Piece[] {
  if (typeof source === "string") return cut(source);
  const out: Piece[] = [];
  placedGaps(source).forEach((g, i) => {
    if (i > 0) out.push({ text: ", " });
    out.push({ gap: g.id });
  });
  const line = cut(source.template);
  if (out.length > 0 && line.length > 0) out.push({ text: ". " });
  out.push(...line);
  // A column's cells in working order, and a pyramid's bricks row by row (dl-w3.61.4).
  if (source.column) {
    // The given cells (given_steps) are drawn digits, not gaps.
    columnKey(source.column).gaps.forEach(({ id }, i) => {
      if (out.length > 0 || i > 0) out.push({ text: ", " });
      out.push({ gap: id });
    });
  }
  if (source.pyramid) {
    for (const row of source.pyramid) {
      row.forEach((cell, j) => {
        if (out.length > 0) out.push({ text: j === 0 ? ". " : ", " });
        out.push(...cut(pyramidCellText(cell)));
      });
    }
  }
  if (source.table) {
    for (const row of tableRows(source.table)) {
      row.forEach((cell, j) => {
        if (out.length > 0) out.push({ text: j === 0 ? ". " : ", " });
        out.push(...cut(cell));
      });
    }
  }
  return out;
}

/** The gap ids in the order the step reads them: the picture's markers, the template, then the
 * table row by row. */
export function markerIds(source: SlotsText): string[] {
  return pieces(source).flatMap((p) => ("gap" in p ? [p.gap] : []));
}

/** The gap ids in the order the child fills them (§3.4): the step's own `fill_order`, a column's
 * working order, units first, a pyramid's from the bottom row up (Slots addendum 4.5), or else the
 * reading order. */
export function fillOrder(data: SlotsData): string[] {
  if (data.fill_order) return data.fill_order;
  if (data.column) return columnFillOrder(data.column);
  if (data.pyramid) return pyramidFillOrder(data.pyramid);
  return markerIds(data);
}
