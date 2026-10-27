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
 */

import type { Gap, SlotsData, SlotsTable } from "@jadwigo/contracts";
import { texRanges } from "../../parts/richTextParse.ts";
import { Family } from "../names.ts";
import { columnFillOrder, columnKey } from "./column.ts";
import { pyramidCellText, pyramidFillOrder } from "./pyramid.ts";

export type {
  Gap,
  GapKey,
  SlotsData,
  SlotsKey,
  SlotsTable,
  SlotsValue,
} from "@jadwigo/contracts";

/** Whether a typed number gap with a range takes `text` (what it would hold after the key): only
 * digits that make a number in the range. A gap with no range takes anything. */
export function takes(gap: Gap | undefined, text: string): boolean {
  if (gap?.kind !== Family.Enter || gap.range === undefined || text === "") return true;
  return /^\d+$/.test(text) && Number(text) >= gap.range[0] && Number(text) <= gap.range[1];
}

/** What the markers are read from: a template string, or a step's picture, template and table. */
export type SlotsText =
  | string
  | (Pick<SlotsData, "template"> &
      Partial<Pick<SlotsData, "table" | "picture" | "gaps" | "column" | "pyramid">>);

/** The gaps placed on the picture, in the order they are listed. None without a picture. */
export function placedGaps(data: Partial<Pick<SlotsData, "picture" | "gaps">>): Gap[] {
  return data.picture ? (data.gaps ?? []).filter((g) => g.at !== undefined) : [];
}

export type Piece = { text: string } | { gap: string };

export const MARKER = /\{([a-z][a-z0-9_]*)\}/g;

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
    source.pyramid.forEach((row) => {
      row.forEach((cell, j) => {
        if (out.length > 0) out.push({ text: j === 0 ? ". " : ", " });
        out.push(...cut(pyramidCellText(cell)));
      });
    });
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

/**
 * Whether a gap starts a sentence in the template (dl-w3.68.22): nothing before its marker, or a
 * sentence end (`.`, `!`, `?`, `…`) or a line break and then only spaces or emphasis marks. The
 * letter row starts in capitals there and lowercase anywhere else, so a gap inside a word (`mr{g1}z`)
 * or after another word never opens in capitals. A gap in a table or on a picture starts lowercase.
 */
export function startsSentence(template: string, id: string): boolean {
  const cut = pieces(template);
  const at = cut.findIndex((p) => "gap" in p && p.gap === id);
  if (at < 0) return false;
  if (at === 0) return true;
  const before = cut[at - 1];
  if (before === undefined || !("text" in before)) return false;
  // After a sentence end, or at the template's start behind only spaces or emphasis.
  return /[.!?…\n][\s*_]*$/.test(before.text) || (at === 1 && /^[\s*_]*$/.test(before.text));
}

/** The gap ids in the order the step reads them: the picture's markers, the template, then the
 * table row by row. */
export function markerIds(source: SlotsText): string[] {
  return pieces(source).flatMap((p) => ("gap" in p ? [p.gap] : []));
}

/**
 * The registry rule of the Slots session (addendum section 1, dl-4e0f), for every family: a step
 * with exactly one chosen gap and no typed gap is one tap on a tile, so it is written as Choose with
 * its line (choose/model.ts `line`), never as a Slots menu. validate.ts refuses such a Slots step.
 * A label placed on a picture stays a label: where it sits on the picture is the question.
 */
export function playsAsChoose(data: Pick<SlotsData, "gaps">): boolean {
  const [only, ...rest] = data.gaps;
  return only !== undefined && rest.length === 0 && only.kind === "choose" && only.at === undefined;
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
