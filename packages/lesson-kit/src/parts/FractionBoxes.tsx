/**
 * Part: a fraction in stacked boxes (dl-w3.70.16), the numerator over a bar over the denominator,
 * with the whole number's box in front when the step takes a mixed number, as a Polish notebook
 * writes it (owner, 2026-10-25). In play each box is a tap target the keypad types into (tap a box
 * to move to it); still, the boxes show an answer with its tone. The caller holds the text
 * (fractionEntry.ts), the box that has the focus, and the tone (tone.ts).
 */

import { cn } from "@jadwigo/ui";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import { boxesOf, type FractionBox } from "./fractionEntry.ts";
import { SELECTION, TONE_CLASS, type Tone } from "./tone.ts";

/** A box (Enter addendum 3.4): 64 × 64 at least, r16, a 2 px edge, padding 0 8, its digits bold and
 * centred at the maths size the caller sets (36 / 30, 2.6), with the typed field's own looks: the
 * active box is paper with the ink edge and caret, no glow (2.1, foundation.css), and a mark is
 * dashed red (2.3). */
const BOX =
  "inline-flex min-h-16 min-w-16 items-center justify-center rounded-lg border-2 px-2 font-bold tabular-nums lining-nums";

export function FractionBoxes({
  text,
  whole,
  tone,
  labels,
  active = null,
  clock,
  onPick,
  label,
  selected = null,
  className,
}: {
  text: string;
  /** Draw the whole number's box in front (a mixed number). */
  whole: boolean;
  tone: Tone;
  /** What a screen reader calls each box. */
  labels: Record<FractionBox, string>;
  /** The box the keypad types into, outlined; null when none is. */
  active?: FractionBox | null | undefined;
  /** Play: each box is a button that moves the keypad to it. Without these the boxes are still. */
  clock?: Clock | undefined;
  onPick?(box: FractionBox, at: Instant, modality: PressModality): void;
  /** The whole answer's name, for a screen reader. */
  label?: string | undefined;
  /** The box selected after a miss (stepKeys.ts): its digits wear the selection fill, and the
   * next key replaces them. */
  selected?: FractionBox | null | undefined;
  className?: string | undefined;
}): JSX.Element {
  const b = boxesOf(text);
  // The active box's edge in the ink blue; the theme draws it on paper with the caret (data-active).
  const look = (box: FractionBox) =>
    cn(
      BOX,
      tone === "idle" ? "border-border bg-card" : TONE_CLASS[tone],
      active === box && tone === "idle" && "border-primary",
    );
  const cell = (box: FractionBox) => {
    if (onPick === undefined || clock === undefined) {
      return (
        <span
          key={box}
          data-box={box}
          data-tone={tone}
          role="img"
          aria-label={`${labels[box]}: ${b[box] || " "}`}
          className={look(box)}
        >
          {b[box] || " "}
        </span>
      );
    }
    const h = press(clock, (at, modality) => onPick(box, at, modality));
    return (
      <button
        key={box}
        type="button"
        data-box={box}
        data-tone={tone}
        data-selected={selected === box ? "" : undefined}
        data-active={active === box ? "true" : undefined}
        aria-label={labels[box]}
        aria-pressed={active === box}
        className={look(box)}
        onPointerDown={h.onPointerDown}
        onClick={h.onClick}
        onFocus={() => onPick(box, clock.now(), "keyboard")}
      >
        {selected === box && b[box] ? <span {...SELECTION}>{b[box]}</span> : b[box] || " "}
      </button>
    );
  };
  return (
    <span
      role="group"
      aria-label={label}
      data-fraction={text}
      className={cn("inline-flex items-center gap-2 align-middle", className)}
    >
      {/* The fraction as one string for a screen reader and for find-in-page: `2 1/4`. */}
      <span className="sr-only">{text}</span>
      {whole && cell("whole")}
      <span className="inline-flex flex-col items-stretch gap-1">
        {cell("num")}
        {/* The bar: 3 px of text ink, 4 px from each box (addendum 3.4). */}
        <span aria-hidden="true" className="border-t-3 border-current" />
        {cell("den")}
      </span>
    </span>
  );
}
