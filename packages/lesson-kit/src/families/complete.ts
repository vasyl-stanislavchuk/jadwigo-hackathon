/**
 * What is still missing from an answer (docs/17 §2f rule 8, docs/18 §0a, dl-w3.41): the reason the
 * status area gives when Check is pressed too soon, and the parts it marks. Nothing here is a
 * verdict: an incomplete answer is never graded and never written. A Sequence of cards is never
 * incomplete, because its cards always stand in some order; one of tiles is, while a place is empty.
 * Choose has no reason: with nothing picked, Sprawdź and Enter take the focus to the first option
 * and say nothing (paper-behaviour README §3.3).
 */

import type { CopyKey } from "@jadwigo/copy";
import { unfinishedDecimal } from "../parts/exact.ts";
import { halfFraction } from "../parts/fractionEntry.ts";
import { unfinished } from "./enter/expression.ts";
import type { GroupData, GroupValue } from "./group/model.ts";
import { Family } from "./names.ts";
import { type SequenceData, slotCount, slotId } from "./sequence/model.ts";
import { optionalGap } from "./slots/column.ts";
import type { SlotsData, SlotsValue } from "./slots/model.ts";

export interface Missing {
  reason: CopyKey;
  /** The parts to mark; empty when the whole answer is missing. */
  parts: string[];
}

export function missingGaps(data: SlotsData, value: SlotsValue): Missing | null {
  // A column's small cells may stay empty: no carry, or a digit left as written (dl-w3.61.4).
  const parts = data.gaps
    .filter((g) => !optionalGap(data, g.id) && (value.gaps[g.id] ?? "").trim() === "")
    .map((g) => g.id);
  if (parts.length > 0) return { reason: "incomplete_gaps", parts };
  // A decimal gap still ending in its comma (dl-w3.70.7).
  const unfinished = data.gaps
    .filter(
      (g) => g.kind === Family.Enter && g.decimal && unfinishedDecimal(value.gaps[g.id] ?? ""),
    )
    .map((g) => g.id);
  if (unfinished.length > 0) return { reason: "incomplete_decimal", parts: unfinished };
  // A fraction gap with one of its two numbers still to write (dl-w3.70.16).
  const half = data.gaps
    .filter(
      (g) =>
        g.kind === Family.Enter &&
        g.input === "fraction" &&
        missingFraction(value.gaps[g.id] ?? "")?.reason === "incomplete_fraction_boxes",
    )
    .map((g) => g.id);
  if (half.length > 0) return { reason: "incomplete_fraction_boxes", parts: half };
  // A fraction to write more simply is no gap in the answer: the judge goes first, then the ask
  // (the nudge is `packages/core`'s, Enter addendum 3.4).
  return null;
}

export function missingGroup(data: GroupData, value: GroupValue): Missing | null {
  const parts = data.items.filter((i) => (value.items[i.id] ?? []).length === 0).map((i) => i.id);
  return parts.length === 0 ? null : { reason: "incomplete_group", parts };
}

/** A Sequence of tiles is missing until every place holds a tile; the empty places are marked. */
export function missingSequence(
  data: SequenceData,
  placed: readonly (string | null)[],
): Missing | null {
  const parts = Array.from({ length: slotCount(data) }, (_, i) => i)
    .filter((i) => !placed[i])
    .map((i) => slotId(i + 1));
  return parts.length === 0 ? null : { reason: "incomplete_sequence", parts };
}

/** A Place answer is missing until a place is chosen. */
export function missingPlace(value: unknown | null): Missing | null {
  return value === null ? { reason: "incomplete_place", parts: [] } : null;
}

/** A graph (Place on bars) is missing until a bar has been drawn; a bar at 0 is then the learner's own. */
export function missingBars(value: unknown | null): Missing | null {
  return value === null ? { reason: "incomplete_graph", parts: [] } : null;
}

/** Enter and Explain: an answer that is empty, or only spaces. */
export function missingText(text: string): Missing | null {
  return text.trim() === "" ? { reason: "incomplete_text", parts: [] } : null;
}

/** Enter with an expression (dl-w3.51.1): empty, or still being written (`2×`, an open bracket).
 * A finished expression that does not parse is a miss, not a gap. */
export function missingExpression(text: string): Missing | null {
  const empty = missingText(text);
  if (empty !== null) return empty;
  return unfinished(text) ? { reason: "incomplete_expression", parts: [] } : null;
}

/** Enter with a decimal (dl-w3.70.7): empty, or a comma with no digit after it yet (`5,`). */
export function missingDecimal(text: string): Missing | null {
  const empty = missingText(text);
  if (empty !== null) return empty;
  return unfinishedDecimal(text) ? { reason: "incomplete_decimal", parts: [] } : null;
}

/**
 * Enter with a fraction in stacked boxes (dl-w3.70.16): empty, or one of the numerator and the
 * denominator written and the other not. Lowest terms are no longer asked for here: the judge goes
 * first, and only a fraction it counts right is nudged to be written more simply (nudgeOf in
 * `packages/core`, Enter addendum 3.4), so the named miss 4/6 for 2/6 is reached. The nudge is
 * still no miss: the step stays open and nothing is recorded (owner, 2026-10-25).
 */
export function missingFraction(text: string): Missing | null {
  const empty = missingText(text);
  if (empty !== null) return empty;
  return halfFraction(text) ? { reason: "incomplete_fraction_boxes", parts: [] } : null;
}
