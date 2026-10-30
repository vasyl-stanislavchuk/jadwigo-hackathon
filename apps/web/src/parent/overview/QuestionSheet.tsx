/**
 * A column's sheet: what the question says, then one line per attempt with how it went, its tries,
 * the help it had and its time, and each twin folded into it nested under it. The try values and
 * the solution stay on the attempt's own page, which the line links to (wave 2 plan of dl-uukj.30).
 */

import type { AttemptResult } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import {
  Heading,
  Link,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@jadwigo/ui";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY } from "../adult.ts";
import type { Column, Row } from "./grid.ts";
import { rowOutcome } from "./grid.ts";
import { reviewOf } from "./Heatmap.tsx";
import { OutcomeWord, rowName, TwinMark } from "./outcome.tsx";

const seconds = (ms: number): number => Math.round(ms / 1000);

export function QuestionSheet({
  column,
  index,
  rows,
  language,
  onClose,
}: {
  /** Null while the sheet is shut. */
  column: Column | null;
  index: number;
  rows: Row[];
  language: Language;
  onClose: () => void;
}): ReactElement {
  return (
    <Sheet open={column !== null} onOpenChange={(open) => !open && onClose()}>
      {column !== null && (
        <SheetContent
          side="bottom"
          closeLabel={copy(language, "close", {}, CATEGORY)}
          className="p-4 text-jw-body text-jw-ink"
          data-question-sheet={column.number}
        >
          <SheetHeader className="p-0 pr-12">
            <SheetTitle asChild>
              <Heading level={2} className="text-jw-instruction font-bold text-jw-ink">
                {copy(language, "parent_overview_question", { n: column.number }, CATEGORY)}
              </Heading>
            </SheetTitle>
            <SheetDescription className="text-jw-body text-jw-ink">{column.say}</SheetDescription>
          </SheetHeader>
          <ol className="flex flex-col">
            {rows.map((row) => (
              <SheetLine key={row.attempt.id} row={row} index={index} language={language} />
            ))}
          </ol>
        </SheetContent>
      )}
    </Sheet>
  );
}

function SheetLine({
  row,
  index,
  language,
}: {
  row: Row;
  index: number;
  language: Language;
}): ReactElement | null {
  const cell = row.cells[index];
  if (cell === undefined) return null;
  const href = reviewOf(row);
  // A row as the owner drew it (decision
  // 2026-10-30-the-parent-s-outcomes-a-soft-green-for-got-there-a-dashed-tile-f): the name in a 72 px
  // column, then the tile with its word and the line; rows are split by a 2 px line on top.
  return (
    <li
      className="flex items-start gap-3 border-t-2 border-jw-line py-3"
      data-sheet-line={row.attempt.id}
    >
      <span className="w-18 shrink-0 font-bold break-words">{rowName(language, row)}</span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <OutcomeWord outcome={cell.outcome} language={language} data-sheet-outcome={cell.outcome} />
        {cell.planned !== null && <Numbers result={cell.planned} language={language} />}
        {cell.twins.length > 0 && (
          <ol className="mt-2 flex flex-col gap-2 border-l-2 border-jw-line pl-3" data-sheet-twins>
            {cell.twins.map((t) => (
              <li key={t.seq} className="flex flex-col items-start gap-1" data-sheet-twin={t.seq}>
                <span className="flex items-center gap-2 text-jw-small text-jw-ink-soft">
                  <TwinMark />
                  {copy(language, "parent_overview_twin", {}, CATEGORY)}
                </span>
                <span>{t.say}</span>
                <OutcomeWord
                  outcome={rowOutcome(t)}
                  language={language}
                  data-sheet-outcome={rowOutcome(t)}
                />
                <Numbers result={t} language={language} />
              </li>
            ))}
          </ol>
        )}
        {href !== null && cell.planned !== null && (
          <Link asChild className="mt-1">
            <NavLink href={href} data-sheet-link>
              {copy(language, "parent_overview_see_tries", {}, CATEGORY)}
            </NavLink>
          </Link>
        )}
      </div>
    </li>
  );
}

/** Tries, help and time: counts, never a percentage. */
function Numbers({
  result,
  language,
}: {
  result: AttemptResult;
  language: Language;
}): ReactElement {
  return (
    <p className="text-jw-small text-jw-ink-soft tabular-nums" data-sheet-numbers>
      {copy(
        language,
        "parent_overview_sheet_line",
        {
          tries: copy(language, "parent_overview_tries", { n: result.tries }, CATEGORY),
          help: copy(language, "parent_review_help", { n: result.help_used }, CATEGORY),
          time: copy(
            language,
            "parent_review_time",
            { seconds: seconds(result.time_ms) },
            CATEGORY,
          ),
        },
        CATEGORY,
      )}
    </p>
  );
}
