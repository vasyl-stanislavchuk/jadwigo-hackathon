/**
 * Part: a number pyramid (piramida liczbowa, dl-w3.61.4; Slots addendum 4.5, dl-uukj.29.124).
 * Bricks of one size, 104 × 64 on a laptop and 88 × 64 on a phone, 8 apart, in rows, each row
 * centred under the one above, so every brick rests on two. A number brick is printed: no fill, a
 * 2 px `--text-muted` border, r10, its number 36 / 30 bold. A gap brick is the field the caller
 * draws (`slot`), at the brick's size (gapFit.ts). Rows are drawn top to bottom, so the DOM order
 * is the reading order; the child fills from the bottom (families/slots/pyramid.ts
 * `pyramidFillOrder`). The part knows no family.
 */

import type { ReactNode } from "react";
import { gapFit, rem, usePhoneCells } from "./gapFit.ts";

export type PyramidBrick = { text: string } | { slot: string };

/** A brick's width and its number's size, laptop then phone; every brick is 64 tall. */
const SIZE = { laptop: { width: 104, digit: 36 }, phone: { width: 88, digit: 30 } } as const;
const HEIGHT = 64;

export function PyramidGrid({
  rows,
  slot,
  label,
}: {
  rows: PyramidBrick[][];
  slot(id: string): ReactNode;
  label: string;
}): JSX.Element {
  const size = SIZE[usePhoneCells() ? "phone" : "laptop"];
  const brick = { width: rem(size.width), height: rem(HEIGHT), fontSize: rem(size.digit) };
  return (
    <div
      role="group"
      aria-label={label}
      data-pyramid
      className="flex w-fit flex-col items-center gap-2 self-center leading-none font-bold tabular-nums"
      style={{ fontSize: rem(size.digit) }}
    >
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          {row.map((b, j) =>
            "slot" in b ? (
              <div
                key={j}
                data-brick
                data-brick-gap={b.slot}
                className="flex items-center justify-center"
                style={{ ...brick, ...gapFit(brick.width, brick.height, brick.fontSize) }}
              >
                {slot(b.slot)}
              </div>
            ) : (
              <div
                key={j}
                data-brick
                className="flex items-center justify-center rounded-[0.625rem] border-2 border-muted-foreground"
                style={brick}
              >
                {b.text}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
