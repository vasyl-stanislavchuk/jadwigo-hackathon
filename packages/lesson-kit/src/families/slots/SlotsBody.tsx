/**
 * Part: a Slots step's body (split out of SlotsView.tsx, dl-uukj.29.120): the picture with its
 * markers (SlotsLabelled.tsx), then the template line, then the table (SlotsTable.tsx), each gap
 * drawn by the caller's `draw` and numbered in reading order across all three. A written column or
 * a number pyramid (dl-w3.61.4) draws as its own grid, its gaps in their cells. `filled` says
 * whether a gap holds something, so a lent ten's digit can be crossed out.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import type { ReactNode } from "react";
import { ColumnGrid } from "../../parts/ColumnGrid.tsx";
import { PyramidGrid } from "../../parts/PyramidGrid.tsx";
import { RichText } from "../../parts/RichText.tsx";
import type { Language } from "../../stage/types.ts";
import { columnGrid, SIGN } from "./column.ts";
import { LINE, MATHS_LINE, mathsLine } from "./gaps.ts";
import { type Gap, markerIds, pieces, placedGaps, type SlotsData } from "./model.ts";
import { pyramidCellText, pyramidGapOf } from "./pyramid.ts";
import { SlotsLabelled } from "./SlotsLabelled.tsx";
import { SlotsTable } from "./SlotsTable.tsx";

/** Draws the gap with this id where the body holds it. */
export type Slot = (id: string) => ReactNode;

/**
 * The template with each gap drawn by `slot`. The template is rich text and the gaps are its slots
 * (dl-w3.51.10), so a gap inside bold, in a bullet list or in a table cell draws there, and the
 * DOM order, which Tab follows, is the reading order. A command (`code`) is drawn as written,
 * monospace, spaces kept.
 */
function Line({
  data,
  slot,
  ids,
}: {
  data: SlotsData;
  slot: Slot;
  ids: ReadonlySet<string>;
}): JSX.Element {
  if (data.code) {
    return (
      // Inline flow, not flex: the command's own spaces sit where it wrote them.
      <p className={cn(LINE, "font-mono whitespace-pre-wrap")}>
        {pieces(data.template).map((p, i) => (
          <span key={i}>{"text" in p ? p.text : slot(p.gap)}</span>
        ))}
      </p>
    );
  }
  // A maths line stands at the maths size, its gaps with it (Slots addendum 4.1).
  return (
    <RichText
      text={data.template}
      slots={slot}
      slotIds={ids}
      className={mathsLine(data) ? MATHS_LINE : LINE}
    />
  );
}

export function SlotsBody({
  data,
  draw,
  language,
  filled,
}: {
  data: SlotsData;
  draw(gap: Gap, n: number): JSX.Element;
  language: Language;
  filled?(id: string): boolean;
}): JSX.Element {
  const byId = new Map(data.gaps.map((g) => [g.id, g]));
  const ids = new Set(byId.keys());
  const order = markerIds(data);
  const slot: Slot = (id) => {
    const gap = byId.get(id);
    return gap ? draw(gap, order.indexOf(id) + 1) : `{${id}}`;
  };
  return (
    <div className="flex flex-col gap-4">
      {data.picture && <SlotsLabelled picture={data.picture} gaps={placedGaps(data)} slot={slot} />}
      {data.template.trim() !== "" && <Line data={data} slot={slot} ids={ids} />}
      {data.table && <SlotsTable table={data.table} slot={slot} ids={ids} gaps={data.gaps} />}
      {data.column && (
        <ColumnGrid
          {...columnGrid(data.column)}
          slot={slot}
          filled={filled}
          label={`${data.column.operands[0]} ${SIGN[data.column.op]} ${data.column.operands[1]}`}
        />
      )}
      {data.pyramid && (
        <PyramidGrid
          rows={data.pyramid.map((row) =>
            row.map((cell) =>
              pyramidGapOf(cell) !== null
                ? { slot: pyramidGapOf(cell) as string }
                : { text: pyramidCellText(cell) },
            ),
          )}
          slot={slot}
          label={copy(language, "pyramid_label")}
        />
      )}
    </div>
  );
}
