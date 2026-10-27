/**
 * Choose: the learner picks one option, or several. Question types: true_false (two options, `binary`),
 * recognition (a grid of numbers, dot arrays, or the one word for a line's gap), lettered_choice (A to
 * E), multi_select (several), mark_numbers and fraction_compare (<, = or > between two fractions drawn
 * as bars). A step with one chosen gap and nothing typed is written here with its `line` (Slots
 * addendum section 1). ClassTime's BOOLEAN, SINGLE_CHOICE and MULTIPLE_CHOICE. A tap picks and
 * Sprawdź checks, always (lesson frame rule 2).
 *
 * Options carry ids, so the page may show them in any order and a stored answer keeps its meaning
 * (ClassTime answers by index, which breaks when options are reordered: classtime-data-model.md §9).
 */

import type { ChooseData, ChooseOption, ChooseValue } from "@jadwigo/contracts";

export type { ChooseData, ChooseOption, ChooseValue };

/** The "none of these" option, if the step has one (validate.ts keeps it last and alone). */
export const isNoneOption = (o: ChooseOption): boolean => o.content.kind === "none";

/** The options in the order the page shows them: as listed, with "none of these" pinned last, so
 * an order that shuffles the rest never moves it (dl-w3.70.4). */
export function pinNoneLast(options: ChooseOption[]): ChooseOption[] {
  return [...options.filter((o) => !isNoneOption(o)), ...options.filter(isNoneOption)];
}

/** A pick with several options: "none of these" stands alone, so picking it clears the others and
 * picking another clears it (dl-w3.70.4). `id` is the option tapped; a tap on a picked one unpicks it. */
export function toggleMany(options: ChooseOption[], chosen: string[], id: string): string[] {
  if (chosen.includes(id)) return chosen.filter((x) => x !== id);
  const none = new Set(options.filter(isNoneOption).map((o) => o.id));
  return none.has(id) ? [id] : [...chosen.filter((x) => !none.has(x)), id];
}

/** The marker in `ChooseData.line` where the picked option shows. */
export const PICK = "pick";
