/**
 * Part: the table to fill (dl-w3.51.5, split out of SlotsView.tsx, dl-uukj.29.120; Slots addendum
 * 4.2, dl-uukj.29.124): the header when it says anything, then each row, every gap drawn by the
 * caller's `slot`, so the DOM order, row by row, is the reading order.
 *
 * The look: cells at least 88 wide on a laptop and 80 on a phone (a column grows to its widest
 * cell, and a header wraps past 240, dl-uukj.29.130), at least 72 tall, padded 6 10, 2 px
 * `--line` between them and around the table, r10. The header on `--page`, 20 / 18 bold; the body
 * 30 / 26 bold. A cell that holds only a typed gap gives the field its own size, less 10
 * (gapFit.ts). On a phone a one-row table of more than four columns is drawn turned: the header
 * becomes the left column (80) and the row the right one (120). The author writes one table and
 * this part turns it. A wider table breaks out to 1120 on a laptop (styles/stage.css `data-wide`),
 * and a table still wider than its room (a phone's column, or a stage too narrow to break out, as
 * the playground's 518 column) scrolls sideways, with a 40 px fade at its right edge.
 *
 * A table with no header is a layout, not a data table (dl-w3.81, the owner's choice): Khan writes
 * one only to line things up, most often an equation chain. It draws with no lines and no card,
 * the columns as wide as their content and 8 apart, each cell padded 4, column 1 to the right and the rest to the left,
 * and a chain's later steps sit under its first `=` (tableLayout.ts).
 */

import { cn } from "@jadwigo/ui";
import { useLayoutEffect, useRef, useState } from "react";
import { gapFit, rem, SQUARE_RADIUS, usePhoneCells } from "../../parts/gapFit.ts";
import { RichText } from "../../parts/RichText.tsx";
import { Family } from "../names.ts";
import { type Gap, MARKER, type SlotsTable as TableData } from "./model.ts";
import type { Slot } from "./slot.ts";
import { chainRows, isLayout } from "./tableLayout.ts";

/** A cell's width, laptop then phone; a turned table's two columns; the cell's least height. */
const WIDTH = { laptop: 88, phone: 80 } as const;
const TURNED = { head: 80, body: 120 } as const;
const MIN_HEIGHT = 72;
/**
 * The widest a header cell grows before its words wrap (dl-uukj.29.130). A cell's width is the
 * least a column takes: a column grows to its widest cell (a long header, a chosen gap's menu,
 * which its widest option sizes), so nothing is cut at the cell's edge. Every cell's content is
 * the same in every state, so a column never changes width between them.
 */
const HEAD_MAX = 240;
/** A typed gap in a cell is 64 tall, as every field (addendum 3.1). */
const FIELD_HEIGHT = 64;

/** The id of the one typed gap a cell holds and nothing else, or null. */
function onlyTyped(text: string, gaps: ReadonlyMap<string, Gap>): string | null {
  const m = new RegExp(`^\\s*${MARKER.source}\\s*$`).exec(text);
  const gap = m?.[1] === undefined ? undefined : gaps.get(m[1]);
  return gap !== undefined && gap.kind === Family.Enter ? gap.id : null;
}

interface Cell {
  text: string;
  head: boolean;
  /** The cell's place in the grid, 1 up, and whether it is the last of its row or column. */
  row: number;
  col: number;
  lastRow: boolean;
  lastCol: boolean;
}

export function SlotsTable({
  table,
  slot,
  ids,
  gaps,
}: {
  table: TableData;
  slot: Slot;
  ids: ReadonlySet<string>;
  gaps: readonly Gap[];
}): JSX.Element {
  const phone = usePhoneCells();
  const byId = new Map(gaps.map((g) => [g.id, g]));
  const layout = isLayout(table);
  const headed = !layout;
  const n = Math.max(table.header.length, ...table.rows.map((r) => r.length));
  const turned = phone && table.rows.length === 1 && n > 4;
  const width = WIDTH[phone ? "phone" : "laptop"];

  // The cells in reading order, placed on the grid: as written, or turned with the header as the
  // left column.
  const cells: Cell[] = [];
  if (turned) {
    const row = table.rows[0] ?? [];
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      if (headed)
        cells.push({
          text: table.header[i] ?? "",
          head: true,
          row: i + 1,
          col: 1,
          lastRow: last,
          lastCol: false,
        });
      cells.push({
        text: row[i] ?? "",
        head: false,
        row: i + 1,
        col: headed ? 2 : 1,
        lastRow: last,
        lastCol: true,
      });
    }
  } else {
    const rows = headed ? [table.header, ...table.rows] : chainRows(table);
    rows.forEach((r, i) => {
      for (let j = 0; j < n; j++)
        cells.push({
          text: r[j] ?? "",
          head: headed && i === 0,
          row: i + 1,
          col: j + 1,
          lastRow: i === rows.length - 1,
          lastCol: j === n - 1,
        });
    });
  }
  const track = (least: number) => `minmax(${rem(least)}, max-content)`;
  const columns = turned
    ? headed
      ? `${track(TURNED.head)} ${track(TURNED.body)}`
      : track(TURNED.body)
    : layout
      ? `repeat(${n}, max-content)`
      : `repeat(${n}, ${track(width)})`;
  // Whether the table is wider than the room it has (the column on a phone, the 1120 breakout or
  // a narrower stage on a laptop), so it scrolls sideways under a fade.
  const scroller = useRef<HTMLDivElement>(null);
  const [wider, setWider] = useState(false);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el === null || turned) return setWider(false);
    const read = () => setWider(el.scrollWidth > el.clientWidth + 1);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, [phone, turned, n]);

  return (
    // A wide answer: on a laptop a table gets 1120 to sit in, centred (styles/stage.css); on a
    // phone it scrolls sideways under a fade.
    <div data-wide className="relative flex">
      <div
        ref={scroller}
        data-table-scroll
        className={cn("max-w-full", !turned && "overflow-x-auto")}
      >
        <div
          role="table"
          data-table
          data-turned={turned || undefined}
          data-layout={layout || undefined}
          className={cn(
            "grid w-max leading-tight font-bold tabular-nums",
            layout ? "gap-x-2" : "overflow-hidden rounded-jw-small border-2 border-border bg-card",
          )}
          style={{ gridTemplateColumns: columns }}
        >
          {cells.map((c) => {
            const gap = onlyTyped(c.text, byId);
            const cellWidth = turned ? (c.head ? TURNED.head : TURNED.body) : width;
            return (
              <div
                key={`${c.row}-${c.col}`}
                role={c.head ? (turned ? "rowheader" : "columnheader") : "cell"}
                data-cell={gap ?? undefined}
                className={cn(
                  "flex items-center",
                  layout ? (c.col === 1 ? "justify-end" : "justify-start") : "justify-center",
                  c.head ? "text-center text-balance" : "whitespace-nowrap",
                  !layout && !c.lastCol && "border-r-2 border-border",
                  !layout && !c.lastRow && "border-b-2 border-border",
                  !layout && (c.head ? "bg-background" : "bg-card"),
                  gap !== null || layout ? "px-1 py-1" : "px-2.5 py-1.5",
                )}
                style={{
                  gridRow: c.row,
                  gridColumn: c.col,
                  minHeight: rem(MIN_HEIGHT),
                  fontSize: rem(c.head ? (phone ? 18 : 20) : phone ? 26 : 30),
                  ...(gap !== null
                    ? gapFit(
                        rem(cellWidth - 10),
                        rem(FIELD_HEIGHT),
                        rem(phone ? 26 : 30),
                        SQUARE_RADIUS,
                      )
                    : {}),
                }}
              >
                {/* One inline box, so the spaces between TeX and a gap stay ("2 czwórki"): a flex
                                    cell drops the spaces between its children. A header wraps past HEAD_MAX. */}
                <span
                  className={c.head ? "inline-block" : undefined}
                  style={c.head ? { maxWidth: rem(HEAD_MAX) } : undefined}
                >
                  <RichText inline text={c.text} slots={slot} slotIds={ids} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* The fade at the right edge of a table that scrolls sideways. */}
      {wider && (
        <div
          aria-hidden
          data-table-fade
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-jw-prompt-card"
        />
      )}
    </div>
  );
}
