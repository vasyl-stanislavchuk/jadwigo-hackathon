/**
 * How the overview draws an outcome: its line, its icon and its colours. Every cell carries an icon
 * as well as a colour, so the grid reads without colour too (wave 2 plan of dl-uukj.30). The
 * colours are the attempt page's tiles (AttemptReview.tsx): the player's own right and the miss
 * colour of decision 2026-10-24, plain for the rest. A plain minus for not yet: the parent's, never
 * a cross (src/review/ended.ts keeps the child's icons).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Check, Contrast, Copy, Dot, Ellipsis, type LucideIcon, Minus, Redo2 } from "lucide-react";
import type { ReactElement } from "react";
import type { Outcome, Row } from "./grid.ts";

/** The overview is for the adult: the copy reads the adult's lines. */
export const CATEGORY = "adult";

export const OUTCOME_WORD: Record<Outcome, CopyKey> = {
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

export const OUTCOME_TILE: Record<Outcome, string> = {
  first_try: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
  got_there: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
  not_yet: "border-kid-try-again bg-kid-try-again-soft text-kid-try-again-ink",
  skipped: "border-border bg-background",
  open: "border-border bg-background",
  not_asked: "border-border bg-background",
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

/** The page's ?lang, carried onto every link. */
export const pageLang = (): string | null =>
  new URLSearchParams(window.location.search).get("lang");
