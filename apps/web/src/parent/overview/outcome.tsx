/**
 * How the overview draws an outcome: its line, its icon and its tone. Every cell carries an icon
 * as well as a colour, so the grid reads without colour too (wave 2 plan of dl-uukj.30). The
 * tones are the ones every screen shares (src/review/outcome.ts), drawn by the kit's OutcomeTile
 * and Badge: the player's own right and the miss colour of decision 2026-10-24, plain for the
 * rest. A plain minus for not yet: the parent's, never a cross (src/review/outcome.ts keeps the
 * child's icons).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Check, Contrast, Copy, Dot, Ellipsis, type LucideIcon, Minus, Redo2 } from "lucide-react";
import type { ReactElement } from "react";
import type { Tone } from "../../review/outcome.ts";
import { CATEGORY } from "../adult.ts";
import type { Outcome, Row } from "./grid.ts";

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
  got_there: "right",
  not_yet: "miss",
  skipped: "plain",
  open: "plain",
  not_asked: "plain",
};

export function OutcomeIcon({ outcome }: { outcome: Outcome }): ReactElement {
  const Icon = OUTCOME_ICON[outcome];
  return <Icon aria-hidden="true" className="size-5 shrink-0" data-icon={outcome} />;
}

/** The mark of a cell a similar question was folded into. */
export function TwinMark(): ReactElement {
  return <Copy aria-hidden="true" className="size-3 shrink-0" data-twin-mark />;
}

export const outcomeWord = (language: Language, outcome: Outcome): string =>
  copy(language, OUTCOME_WORD[outcome], {}, CATEGORY);

/** A row's name: the API's, else "Uczestnik n". */
export const rowName = (language: Language, row: Row): string =>
  row.name ?? copy(language, "parent_overview_player", { n: row.number }, CATEGORY);
