/**
 * The heatmap on Table: a row per attempt, a column per planned question, and a footer row with the
 * first-try count per column. A row's name and each of its cells link to that attempt's own page
 * once it is finished (an unfinished one has no review yet); a column's number opens its sheet.
 * The table scrolls inside its wrapper, so a phone's page does not (checked in
 * e2e/parent-overview.spec.ts: happy-dom does no layout).
 */

import { copy, type Language } from "@jadwigo/copy";
import type { ReactElement, ReactNode } from "react";
import { NavLink } from "../../playground/shell/NavLink.tsx";
import { attemptPath } from "../route.ts";
import type { Cell, Column, Grid, Row } from "./grid.ts";
import {
  CATEGORY,
  OUTCOME_TILE,
  OutcomeIcon,
  outcomeWord,
  pageLang,
  rowName,
  TwinMark,
} from "./outcome.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui-stub.tsx";

/** The attempt page of a row, or null while the attempt is unfinished. */
export const reviewOf = (row: Row): string | null =>
  row.attempt.status === "finished"
    ? attemptPath({ attempt: row.attempt.id, learner: row.attempt.learner_id, lang: pageLang() })
    : null;

/** A cell's accessible name: the question, its outcome, and the twin when one was folded in. */
export function cellLabel(language: Language, column: Column, cell: Cell): string {
  const question = copy(language, "parent_overview_question", { n: column.number }, CATEGORY);
  const twin = cell.twin ? `, ${copy(language, "parent_overview_twin", {}, CATEGORY)}` : "";
  return `${question}: ${outcomeWord(language, cell.outcome)}${twin}`;
}

/** The first column stays put while the grid scrolls sideways. */
const STICKY = "sticky left-0 z-10 bg-background";

export function Heatmap({
  grid,
  language,
  onColumn,
}: {
  grid: Grid;
  language: Language;
  onColumn: (index: number) => void;
}): ReactElement {
  const firstTry = copy(language, "parent_outcome_first_try", {}, CATEGORY);
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto" data-overview-grid>
      <Table className="w-max border-separate border-spacing-1 text-base">
        <TableHeader>
          <TableRow>
            <TableHead className={STICKY} />
            <TableHead className="px-2 text-sm font-normal">{firstTry}</TableHead>
            {grid.columns.map((column, index) => (
              <TableHead key={column.key} className="p-0" data-column={column.number}>
                <button
                  type="button"
                  className="size-10 rounded-md font-semibold underline"
                  aria-label={copy(
                    language,
                    "parent_overview_question",
                    { n: column.number },
                    CATEGORY,
                  )}
                  onClick={() => onColumn(index)}
                >
                  {column.number}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grid.rows.map((row) => (
            <GridRow key={row.attempt.id} row={row} columns={grid.columns} language={language} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow data-footer>
            <TableHead scope="row" className={`${STICKY} pr-2 text-left text-sm font-normal`}>
              {firstTry}
            </TableHead>
            <TableCell />
            {grid.columns.map((column) => (
              <TableCell
                key={column.key}
                className="text-center text-sm"
                data-column-count={`${column.firstTry}/${column.reached}`}
              >
                {column.firstTry}/{column.reached}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function GridRow({
  row,
  columns,
  language,
}: {
  row: Row;
  columns: Column[];
  language: Language;
}): ReactElement {
  const href = reviewOf(row);
  const name = rowName(language, row);
  return (
    <TableRow data-row={row.attempt.id}>
      <TableHead scope="row" className={`${STICKY} max-w-40 truncate pr-2 text-left font-semibold`}>
        {href === null ? (
          name
        ) : (
          <NavLink href={href} className="underline" data-row-link>
            {name}
          </NavLink>
        )}
      </TableHead>
      <TableCell
        className="px-2 text-center text-sm"
        data-row-count={`${row.firstTry}/${row.asked}`}
      >
        {row.firstTry}/{row.asked}
      </TableCell>
      {row.cells.map((cell, index) => {
        const column = columns[index];
        if (column === undefined) return null;
        return (
          <TableCell key={column.key} className="p-0">
            <CellBox cell={cell} label={cellLabel(language, column, cell)} href={href} />
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function CellBox({
  cell,
  label,
  href,
}: {
  cell: Cell;
  label: string;
  href: string | null;
}): ReactElement {
  const className = `relative flex size-10 items-center justify-center rounded-md border-2 ${OUTCOME_TILE[cell.outcome]}`;
  const inside: ReactNode = (
    <>
      <OutcomeIcon outcome={cell.outcome} />
      {cell.twin && (
        <span className="absolute top-0.5 right-0.5">
          <TwinMark />
        </span>
      )}
    </>
  );
  // A cell the attempt never asked has nothing to show on its page.
  return href === null || cell.outcome === "not_asked" ? (
    <span role="img" aria-label={label} className={className} data-cell={cell.outcome}>
      {inside}
    </span>
  ) : (
    <NavLink
      href={href}
      aria-label={label}
      className={className}
      data-cell={cell.outcome}
      data-cell-link
    >
      {inside}
    </NavLink>
  );
}
