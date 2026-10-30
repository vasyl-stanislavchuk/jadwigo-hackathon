/**
 * The heatmap on Table: a row per attempt, a column per planned question, and a footer row with the
 * first-try count per column. A row's name and each of its cells link to that attempt's own page
 * once it is finished (an unfinished one has no review yet); a column's number opens its sheet.
 * The table scrolls inside its own container, so a phone's page does not (checked in
 * e2e/parent-overview.spec.ts: happy-dom does no layout).
 */

import { copy, type Language } from "@jadwigo/copy";
import {
  Link,
  OutcomeTile,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@jadwigo/ui";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { attemptPath } from "../route.ts";
import type { Cell, Column, Grid, Row } from "./grid.ts";
import { OUTCOME_TONE, OutcomeIcon, rowName, TwinMark, tileLabel } from "./outcome.tsx";

/** The attempt page of a row, or null while the attempt is unfinished. */
export const reviewOf = (row: Row): string | null =>
  row.attempt.status === "finished"
    ? attemptPath({ attempt: row.attempt.id, learner: row.attempt.learner_id, lang: pageLang() })
    : null;

/** The first column stays put while the grid scrolls sideways, on the page's own paper. */
const STICKY = "sticky left-0 z-10 bg-jw-ground";

/** A count out of a total, "n/m": counts, never a percentage. */
const ratio = (language: Language, n: number, m: number): string =>
  copy(language, "parent_overview_ratio", { n, m }, CATEGORY);

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
    <div className="w-full min-w-0 max-w-full" data-overview-grid>
      <Table className="w-max border-separate border-spacing-1 text-jw-body text-jw-ink">
        <TableHeader>
          <TableRow>
            <TableHead className={STICKY} />
            <TableHead className="px-2 text-jw-small font-normal">{firstTry}</TableHead>
            {grid.columns.map((column, index) => (
              <TableHead key={column.key} className="p-0" data-column={column.number}>
                <button
                  type="button"
                  className="size-10 rounded-jw-small font-bold text-jw-ink underline decoration-2 underline-offset-4"
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
            <TableHead scope="row" className={`${STICKY} pr-2 text-left text-jw-small font-normal`}>
              {firstTry}
            </TableHead>
            <TableCell />
            {grid.columns.map((column) => {
              const count = ratio(language, column.firstTry, column.reached);
              return (
                <TableCell
                  key={column.key}
                  className="text-center text-jw-small"
                  data-column-count={count}
                >
                  {count}
                </TableCell>
              );
            })}
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
  const count = ratio(language, row.firstTry, row.asked);
  return (
    <TableRow data-row={row.attempt.id}>
      <TableHead scope="row" className={`${STICKY} max-w-40 truncate pr-2 text-left font-bold`}>
        {href === null ? (
          name
        ) : (
          <Link asChild>
            <NavLink href={href} data-row-link>
              {name}
            </NavLink>
          </Link>
        )}
      </TableHead>
      <TableCell className="px-2 text-center text-jw-small" data-row-count={count}>
        {count}
      </TableCell>
      {row.cells.map((cell, index) => {
        const column = columns[index];
        if (column === undefined) return null;
        return (
          <TableCell key={column.key} className="p-0">
            <CellBox cell={cell} label={tileLabel(language, column.number, cell)} href={href} />
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
  const twin = cell.twin && (
    <span className="absolute top-0.5 right-0.5">
      <TwinMark />
    </span>
  );
  const tile = {
    tone: OUTCOME_TONE[cell.outcome],
    outcome: cell.outcome,
    icon: <OutcomeIcon outcome={cell.outcome} />,
    label,
  };
  // A cell the attempt never asked has nothing to show on its page.
  return href === null || cell.outcome === "not_asked" ? (
    <OutcomeTile {...tile} data-cell={cell.outcome}>
      {twin}
    </OutcomeTile>
  ) : (
    <OutcomeTile {...tile} asChild>
      <NavLink href={href} data-cell={cell.outcome} data-cell-link>
        {twin}
      </NavLink>
    </OutcomeTile>
  );
}
