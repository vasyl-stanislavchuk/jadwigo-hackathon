/**
 * A column's sheet: what the question says, then one line per attempt with how it went, its tries,
 * the help it had and its time, and each twin folded into it nested under it. The try values and
 * the solution stay on the attempt's own page, which the line links to (wave 2 plan of dl-uukj.30).
 */

import type { AttemptResult } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { NavLink } from "../../playground/shell/NavLink.tsx";
import type { Column, Outcome, Row } from "./grid.ts";
import { rowOutcome } from "./grid.ts";
import { reviewOf } from "./Heatmap.tsx";
import { CATEGORY, OUTCOME_TILE, OutcomeIcon, outcomeWord, rowName, TwinMark } from "./outcome.tsx";

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
          closeLabel={copy(language, "credit_close", {}, CATEGORY)}
          className="p-4"
          data-question-sheet={column.number}
        >
          <SheetHeader className="p-0 pr-12">
            <SheetTitle className="text-2xl font-semibold">
              {copy(language, "parent_overview_question", { n: column.number }, CATEGORY)}
            </SheetTitle>
            <SheetDescription className="text-lg">{column.say}</SheetDescription>
          </SheetHeader>
          <ol className="flex flex-col gap-3">
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
  return (
    <li className="flex flex-col gap-2 rounded-xl border p-3" data-sheet-line={row.attempt.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{rowName(language, row)}</span>
        <OutcomeBadge outcome={cell.outcome} language={language} />
      </div>
      {cell.planned !== null && <Numbers result={cell.planned} language={language} />}
      {cell.twins.length > 0 && (
        <ol className="flex flex-col gap-2 border-l-2 pl-3" data-sheet-twins>
          {cell.twins.map((t) => (
            <li key={t.seq} className="flex flex-col gap-1" data-sheet-twin={t.seq}>
              <span className="flex items-center gap-2 text-sm">
                <TwinMark />
                {copy(language, "parent_overview_twin", {}, CATEGORY)}
              </span>
              <span>{t.say}</span>
              <OutcomeBadge outcome={rowOutcome(t)} language={language} />
              <Numbers result={t} language={language} />
            </li>
          ))}
        </ol>
      )}
      {href !== null && cell.planned !== null && (
        <NavLink href={href} className="underline" data-sheet-link>
          {copy(language, "parent_overview_see_tries", {}, CATEGORY)}
        </NavLink>
      )}
    </li>
  );
}

function OutcomeBadge({
  outcome,
  language,
}: {
  outcome: Outcome;
  language: Language;
}): ReactElement {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-md border-2 px-2 py-0.5 text-sm ${OUTCOME_TILE[outcome]}`}
      data-sheet-outcome={outcome}
    >
      <OutcomeIcon outcome={outcome} />
      {outcomeWord(language, outcome)}
    </span>
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
    <p className="text-sm" data-sheet-numbers>
      {copy(language, "parent_overview_tries", { n: result.tries }, CATEGORY)}
      {" · "}
      {copy(language, "parent_review_help", { n: result.help_used }, CATEGORY)}
      {" · "}
      {copy(language, "parent_review_time", { seconds: seconds(result.time_ms) }, CATEGORY)}
    </p>
  );
}
