/**
 * Part: a field in the maths line (Enter addendum 2.4, decision dl-y3th 2b, dl-uukj.29.106). When
 * the question is a maths line that ends in "= ?" or "=", the child's field takes the ?'s place in
 * the line, inside the question card, so the question reads as one sentence the child finishes:
 * "7 × 8 = [  ]".
 *
 * - The line and the field share the line's type size, Zeszyt's maths size (36 px on a laptop, 30
 *   on a phone, addendum 2.6), and its baseline; the field stands 12 px after the "=".
 * - The field's width comes from its length setting (Slots addendum 3.1, owner 2026-10-27: Enter
 *   follows the same rule as a Slots gap), `fieldWidth` below: 4 digits are 120 on a laptop and
 *   106 on a phone. Its width never follows the answer's length, so the line never moves while
 *   the child types.
 * - The card that holds the line is the step's scroll target (`data-scroll-target`, scroll.ts), so
 *   the question shows whole when the field comes into view.
 *
 * It knows no family: the Enter view hands it the field. The Slots family draws every typed gap as
 * this field (`FIELD_BOX` and `fieldWidth`, Slots addendum 3.1). `inlineLine` says whether a line takes a field, and what is
 * left of it once the ? goes.
 */

import { cn } from "@jadwigo/ui";
import type { ReactNode } from "react";
import { RichText } from "./RichText.tsx";
import { isPlainText } from "./richTextParse.ts";

/** "= ?" or "=" at the end of a line, the ? and any space around it included. */
const ENDS_IN_EQUALS = /=\s*\??\s*$/;

/**
 * The maths line with its ? taken off, when the field can stand in it: a line in plain words or
 * one TeX formula (`$12 + 8 =$`) that ends in "= ?" or "=". Null for any other figure text, which
 * keeps its field under the card.
 */
export function inlineLine(text: string): string | null {
  const trimmed = text.trim();
  if (isPlainText(trimmed))
    return ENDS_IN_EQUALS.test(trimmed) ? trimmed.replace(/\s*\?\s*$/, "") : null;
  const formula = trimmed.match(/^\$([^$]+)\$$/);
  const inner = formula?.[1];
  if (inner === undefined || !ENDS_IN_EQUALS.test(inner)) return null;
  return `$${inner.replace(/\s*\?\s*$/, "").trim()}$`;
}

/** How long a field is drawn (Slots addendum 3.1): for so many digits, so many letters, or one
 * character. The length is the gap's setting, never what is typed. */
export type FieldLength = { digits: number } | { letters: number } | "char";

/** A number is drawn for 4 digits and a word for 9 letters unless the gap says otherwise; a word
 * is never drawn wider than 9 letters (the export's SlotStep). */
export const DEFAULT_DIGITS = 4;
export const DEFAULT_LETTERS = 9;

/**
 * The field's width from its length (Slots addendum 3.1), in the field's own type size: a number
 * `digits × 0.6 em + 34`, never under 72; a word `letters × 0.55 em + 36`; one character a 64
 * square. At the maths size (36 / 30) 4 digits are 120 / 106, 2 digits 77 / 72; 9 letters at 26
 * are 165.
 */
export function fieldWidth(length: FieldLength): { width: string; minWidth?: string } {
  if (length === "char") return inCell("4rem");
  if ("digits" in length)
    return inCell(`calc(${round(length.digits * 0.6)}em + 2.125rem)`, "4.5rem");
  return inCell(`calc(${round(Math.min(length.letters, DEFAULT_LETTERS) * 0.55)}em + 2.25rem)`);
}

/** A width that gives way to a cell's (gapFit.ts): a table cell, a square of a written sum, a
 * pyramid brick or a gap inside a word sets `--gap-w` and `--gap-min-w`, and the field fills it. */
function inCell(width: string, minWidth?: string): { width: string; minWidth?: string } {
  return {
    width: `var(--gap-w, ${width})`,
    ...(minWidth !== undefined ? { minWidth: `var(--gap-min-w, ${minWidth})` } : {}),
  };
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The field's box (Enter addendum 2.1, 2.4; Slots addendum 3.1): 64 tall in every state, r16, a 2 px
 * edge, bold, its text at the left with 14 sides (a character centred), in tabular lining figures.
 * The caller sets the type size of its line (maths 36 / 30, a sentence 26 / 24) and the width
 * (`fieldWidth`); the theme draws the states (foundation.css): the active field paper with the ink
 * edge and caret, a mark dashed red once the child is away, right green and flat.
 *
 * In a cell that fixes its gap (gapFit.ts: a table cell, a square of a written sum, a pyramid
 * brick, a gap inside a word) the box reads the cell's height, type size, padding, alignment and
 * corners instead.
 *
 * The alignment is written as the property (`[justify-content:…]`): Tailwind 4 makes no rule for
 * `justify-[var(…)]`, so a cell's gap held its digits at the left (dl-uukj.29.132).
 */
export const FIELD_BOX =
  "inline-flex h-[var(--gap-h,4rem)] shrink-0 items-center [justify-content:var(--gap-justify,flex-start)] rounded-[var(--gap-r,var(--radius-lg))] border-2 px-[var(--gap-px,0.875rem)] align-middle text-[length:var(--gap-font,1em)] [text-align:var(--gap-align,start)] font-bold leading-none tabular-nums lining-nums";

/** The line, then the field in the ?'s place. `children` is the field; the part sizes it, from the
 * field's length (`digits`, the step's own length setting). */
export function InlineField({
  line,
  digits = DEFAULT_DIGITS,
  children,
  className,
}: {
  line: string;
  digits?: number | undefined;
  children: ReactNode;
  className?: string | undefined;
}): JSX.Element {
  return (
    <div
      data-inline-line
      className={cn(
        "flex flex-wrap items-baseline gap-3 text-[length:var(--kid-math-size)] leading-[1.2] font-bold tabular-nums lining-nums",
        className,
      )}
    >
      {isPlainText(line) ? <span data-inline-text>{line}</span> : <RichText inline text={line} />}
      {/* The field fills this box, whatever its own width rule says (stage.css sizes a lone
                number field 180 / 160): its width from the length rule, at the line's size. */}
      <div data-inline-field className="[&_[data-field]]:!w-full" style={fieldWidth({ digits })}>
        {children}
      </div>
    </div>
  );
}
