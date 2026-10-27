/**
 * Part: a written sum on squared paper (działania pisemne, dl-w3.61.4; Slots addendum 4.4,
 * dl-uukj.29.124). A grid of squares, 56 on a laptop and 48 on a phone, ruled with 1 px `--line`:
 * the one place the lesson draws squared paper, because here it carries meaning. One digit to a
 * square, 36 / 30 bold, aligned by place value, the sign in the left column and a 3 px rule under
 * the second number. The carries, and a subtraction's new digits, sit in a full square above their
 * column (22 / 20). A digit that lent a ten is crossed out once the digit over it is written: a 3 px
 * line at −40°, 6 px past the digit on each side.
 *
 * Every square is placed before the child starts, so nothing moves while they work: a gap is drawn
 * by the caller in its square (`slot`), and fills it (square − 4, gapFit.ts), and a crossed-out
 * digit only gains a line. The cells are placed on the grid by row and column, so their DOM order
 * is free: the caller lists the gaps in working order (units first, a column's small cell before
 * its digit), and Tab follows that order. The part knows no family: the layout comes from the
 * caller (families/slots/column.ts `columnGrid`).
 */

import { cn } from "@jadwigo/ui";
import type { ReactNode } from "react";
import { gapFit, rem, SQUARE_RADIUS, usePhoneCells } from "./gapFit.ts";

interface ColumnGridCell {
  row: number;
  col: number;
  /** A digit or the sign, drawn as text. */
  text?: string | undefined;
  /** A gap's id: the caller draws it here. */
  slot?: string | undefined;
  /** A small cell: a carry, or a lent ten's digit. */
  small?: boolean | undefined;
  /** A digit filled in for the child (a given step): drawn quieter. */
  given?: boolean | undefined;
  /** Crossed out once this gap is filled (a subtraction's lending digit). */
  strikeBy?: string | undefined;
  /** Crossed out from the start (its new digit is given). */
  struck?: boolean | undefined;
}

export interface ColumnGridProps {
  rows: number;
  cols: number;
  /** The row the rule is drawn under: the second number's. */
  rule: number;
  cells: ColumnGridCell[];
  slot(id: string): ReactNode;
  /** Whether a gap holds something, for crossing out a digit. */
  filled?: ((id: string) => boolean) | undefined;
  /** The grid's name for a screen reader, such as the sum in words. */
  label: string;
}

/** The square's side and the type sizes, laptop then phone (addendum 4.4). */
const SIZE = {
  laptop: { square: 56, digit: 36, small: 22 },
  phone: { square: 48, digit: 30, small: 20 },
} as const;

/** The squared paper: 1 px `--line` lines on every square's left and top edge, and the grid's own
 * right and bottom edge closed with an inset line. */
const PAPER =
  "bg-[linear-gradient(to_right,var(--border)_0.0625rem,transparent_0.0625rem),linear-gradient(to_bottom,var(--border)_0.0625rem,transparent_0.0625rem)] shadow-[inset_-0.0625rem_-0.0625rem_0_var(--border)]";

export function ColumnGrid({
  rows,
  cols,
  rule,
  cells,
  slot,
  filled,
  label,
}: ColumnGridProps): JSX.Element {
  const size = SIZE[usePhoneCells() ? "phone" : "laptop"];
  const square = rem(size.square);
  return (
    <div
      role="group"
      aria-label={label}
      data-column-grid
      className={cn("grid w-fit self-center font-bold tabular-nums leading-none", PAPER)}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${square})`,
        gridTemplateRows: `repeat(${rows}, ${square})`,
        backgroundSize: `${square} ${square}`,
        fontSize: rem(size.digit),
      }}
    >
      {/* The rule under the second number, the sign's square included. */}
      <div
        aria-hidden
        data-column-rule
        className="pointer-events-none border-b-3 border-foreground"
        style={{ gridRow: rule + 1, gridColumn: "1 / -1" }}
      />
      {cells.map((c) => {
        const at = { gridRow: c.row + 1, gridColumn: c.col + 1 };
        const type = rem(c.small ? size.small : size.digit);
        if (c.slot !== undefined) {
          return (
            <div
              key={`s-${c.slot}`}
              data-column-cell={c.slot}
              data-small={c.small || undefined}
              className="flex items-center justify-center"
              style={{
                ...at,
                ...gapFit(rem(size.square - 4), rem(size.square - 4), type, SQUARE_RADIUS),
              }}
            >
              {slot(c.slot)}
            </div>
          );
        }
        const struck =
          c.struck === true || (c.strikeBy !== undefined && filled?.(c.strikeBy) === true);
        return (
          <div
            key={`t-${c.row}-${c.col}`}
            data-column-digit
            data-struck={struck || undefined}
            className={cn("flex items-center justify-center", c.given && "text-muted-foreground")}
            style={{ ...at, fontSize: type }}
          >
            <span className="relative">
              {c.text}
              {/* The crossing-out line: 3 px of ink at −40°, 6 px past the digit each side. */}
              {struck && (
                <span
                  aria-hidden
                  data-strike
                  className="absolute top-1/2 -right-1.5 -left-1.5 border-t-3 border-foreground [transform:rotate(-40deg)]"
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
