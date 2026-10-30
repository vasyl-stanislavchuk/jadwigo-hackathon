/**
 * How every parent page draws an outcome: its line, its icon and its tone. Every tile carries an
 * icon as well as a colour, so it reads without colour too (wave 2 plan of dl-uukj.30). The heatmap,
 * the legend, the question sheet, the parent home and the attempt page all draw this one icon set;
 * the child's own list and review keep the child's (src/review/outcome.ts). A plain minus for not
 * yet, never a cross. The tones are drawn by the kit's OutcomeTile: the player's own right for a
 * first try, right-soft for one that took tries or help, the miss colour of decision 2026-10-24,
 * plain, and empty for a question never asked (decision
 * 2026-10-30-the-parent-s-outcomes-a-soft-green-for-got-there-a-dashed-tile-f).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { OutcomeTile } from "@jadwigo/ui";
import { Check, Contrast, Copy, Dot, Ellipsis, type LucideIcon, Minus, Redo2 } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";
import type { Tone } from "../../review/outcome.ts";
import { CATEGORY } from "../adult.ts";
import type { Cell, Outcome, Row } from "./grid.ts";

const OUTCOME_WORD: Record<Outcome, CopyKey> = {
  first_try: "parent_outcome_first_try",
  got_there: "parent_outcome_got_there",
  not_yet: "parent_outcome_not_yet",
  skipped: "parent_outcome_skipped",
  open: "parent_outcome_open",
  not_asked: "parent_outcome_not_asked",
};

const OUTCOME_ICON: Record<Outcome, LucideIcon> = {
  first_try: Check,
  got_there: Contrast,
  not_yet: Minus,
  skipped: Redo2,
  open: Ellipsis,
  not_asked: Dot,
};

/** The tone each outcome wears, one of the tones every screen shares (src/review/outcome.ts). */
export const OUTCOME_TONE: Record<Outcome, Tone> = {
  first_try: "right",
  got_there: "right-soft",
  not_yet: "miss",
  skipped: "plain",
  open: "plain",
  not_asked: "empty",
};

/** An outcome's icon: 20 px, or 16 px in an xs tile. */
export function OutcomeIcon({
  outcome,
  small = false,
}: {
  outcome: Outcome;
  small?: boolean;
}): ReactElement {
  const Icon = OUTCOME_ICON[outcome];
  return (
    <Icon
      aria-hidden="true"
      className={small ? "size-4 shrink-0" : "size-5 shrink-0"}
      data-icon={outcome}
    />
  );
}

/** The mark of a cell a similar question was folded into. */
export function TwinMark(): ReactElement {
  return <Copy aria-hidden="true" className="size-3 shrink-0" data-twin-mark />;
}

export const outcomeWord = (language: Language, outcome: Outcome): string =>
  copy(language, OUTCOME_WORD[outcome], {}, CATEGORY);

/** A tile's accessible name: the question's number, its outcome, and the twin when one was folded
 * in. */
export function tileLabel(
  language: Language,
  n: number,
  cell: Pick<Cell, "outcome" | "twin">,
): string {
  const question = copy(language, "parent_overview_question", { n }, CATEGORY);
  const twin = cell.twin ? `, ${copy(language, "parent_overview_twin", {}, CATEGORY)}` : "";
  return `${question}: ${outcomeWord(language, cell.outcome)}${twin}`;
}

/** An outcome's xs tile with its word beside it, in small bold: a sheet row's, the review step's. */
export function OutcomeWord({
  outcome,
  language,
  ...props
}: ComponentProps<"span"> & { outcome: Outcome; language: Language }): ReactElement {
  const word = outcomeWord(language, outcome);
  return (
    <span className="flex items-center gap-2 text-jw-small font-bold" {...props}>
      <OutcomeTile
        size="xs"
        tone={OUTCOME_TONE[outcome]}
        outcome={outcome}
        icon={<OutcomeIcon outcome={outcome} small />}
        label={word}
        aria-hidden="true"
      />
      {word}
    </span>
  );
}

/** A row's name: the API's, else "Uczestnik n". */
export const rowName = (language: Language, row: Row): string =>
  row.name ?? copy(language, "parent_overview_player", { n: row.number }, CATEGORY);
