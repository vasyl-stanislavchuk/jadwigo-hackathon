/**
 * What every Slots part knows about one gap (split out of SlotsView.tsx, dl-uukj.29.120): its kind
 * (a decimal, a fraction, a one-character slot), its limits, its name for a screen reader, and how
 * its value reads. No drawing here: the parts in SlotGap.tsx, GapMenu.tsx, SlotsBody.tsx and
 * SlotsStill.tsx draw.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { decimalShown, parseDecimal, parseFraction, sameExact } from "../../parts/exact.ts";
import type { FractionBox } from "../../parts/fractionEntry.ts";
import {
  DEFAULT_DIGITS,
  DEFAULT_LETTERS,
  FIELD_BOX,
  type FieldLength,
  fieldWidth,
} from "../../parts/InlineField.tsx";
import { texRanges } from "../../parts/richTextParse.ts";
import type { Language } from "../../stage/types.ts";
import { Family } from "../names.ts";
import { columnCellLabel } from "./columnLabel.ts";
import { type Gap, MARKER, type SlotsData } from "./model.ts";

export const MAX_NUMBER = 4;
/** A decimal gap takes more (dl-w3.70.7): `12,375`. */
export const MAX_DECIMAL = 8;
export const MAX_TEXT = 24;

export const isDecimal = (gap: Gap): boolean =>
  gap.kind === Family.Enter && gap.input === "number" && gap.decimal === true;
/** A fraction gap (dl-w3.70.16): stacked boxes in the line, typed on the one keypad. */
export const isFraction = (gap: Gap | undefined): boolean =>
  gap?.kind === Family.Enter && gap.input === "fraction";
/** Whether a fraction gap draws the whole number's box: the step asks for one, or the text holds one. */
export const wholeOf = (gap: Gap, text: string): boolean =>
  (gap.kind === Family.Enter && gap.whole === true) || text.includes(" ");
export const boxLabels = (language: Language): Record<FractionBox, string> => ({
  whole: copy(language, "fraction_whole"),
  num: copy(language, "fraction_numerator"),
  den: copy(language, "fraction_denominator"),
});
/** A gap that takes one character is a slot (paper-behaviour README §3.4): it jumps on once filled,
 * and a new key replaces its character. */
export const isSlot = (gap: Gap): boolean => gap.kind === Family.Enter && gap.max_length === 1;
/** A gap the one keypad types into: a number, or a fraction in stacked boxes. */
export const onKeypad = (gap: Gap): boolean =>
  gap.kind === Family.Enter && (gap.input === "number" || gap.input === "fraction");

/** The box every gap that is not a field draws in (the still views, a given gap). */
export const BOX =
  "inline-flex min-h-[var(--kid-tap-min)] min-w-[3ch] items-center justify-center rounded-lg border-2 px-2 align-middle";
export const LINE = "text-[length:var(--kid-answer-size)] font-semibold leading-[2.75]";
/** A maths line (Slots addendum 4.1): the maths size, 36 / 30 bold, its gaps in it at that size. */
export const MATHS_LINE =
  "text-[length:var(--kid-math-size)] font-bold leading-[2.25] tabular-nums lining-nums";

/**
 * Whether the template is a maths line (Slots addendum 3.1, 4.1): numbers, signs and TeX around its
 * gaps, and not one word. Its text and its typed gaps then stand at the maths size (36 / 30); a
 * sentence keeps the answer size (26 / 24). A command is never one.
 */
export function mathsLine(data: Pick<SlotsData, "template" | "code">): boolean {
  if (data.code) return false;
  const tex = texRanges(data.template);
  const prose = data.template
    .split("")
    .filter((_, i) => !tex.some(([start, end]) => i >= start && i < end))
    .join("");
  return data.template.trim() !== "" && !/\p{L}/u.test(prose.replace(MARKER, ""));
}

/** How long a typed gap is drawn (Slots addendum 3.1): its length setting (`max_length`), else 4
 * digits for a number and 9 letters for a word; one character is a square. Never what is typed. */
function lengthOf(gap: Gap): FieldLength {
  if (gap.kind !== Family.Enter || gap.max_length === 1) return "char";
  return gap.input === "text"
    ? { letters: gap.max_length ?? DEFAULT_LETTERS }
    : { digits: gap.max_length ?? DEFAULT_DIGITS };
}

/** A typed gap's field box and width (InlineField.tsx): one character centred in its square, else
 * at the left. The same in play, in review and beside the solution, so a gap never moves. */
export function fieldOf(gap: Gap): {
  className: string;
  style: { width: string; minWidth?: string };
} {
  const length = lengthOf(gap);
  return {
    className: cn(FIELD_BOX, length === "char" && "justify-center px-0"),
    style: fieldWidth(length),
  };
}

/** A gap's name for a screen reader: its number in reading order, or a column cell's place. */
export const gapName = (data: SlotsData, language: Language, gap: Gap, n: number): string =>
  data.column ? columnCellLabel(language, gap.id, n) : copy(language, "gap_label", { n });

export const labelOf = (gap: Gap, value: string): string =>
  gap.kind === Family.Choose ? (gap.options.find((o) => o.id === value)?.label ?? "") : value;

/** A key's answer as the learner reads it: a decimal in the language's own way (0,29 in Polish). */
export const keyLabel = (gap: Gap, value: string, language: Language): string =>
  isDecimal(gap) ? decimalShown(value, language) : labelOf(gap, value);

/** Whether a typed gap holds the right answer shown beside it: a decimal by its value, a fraction
 * by its value and form. */
export function sameTyped(gap: Gap, mine: string, good: string): boolean {
  if (isFraction(gap)) {
    const a = parseFraction(mine);
    const b = parseFraction(good);
    return a !== null && b !== null && sameExact(a.value, b.value) && a.form === b.form;
  }
  if (!isDecimal(gap)) return mine.trim() === good;
  const a = parseDecimal(mine);
  const b = parseDecimal(good);
  return a !== null && b !== null && sameExact(a, b);
}
