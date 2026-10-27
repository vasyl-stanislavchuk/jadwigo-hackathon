/**
 * Part: a bar, a circle or a rectangle cut into equal parts, some of them shaded (dl-w3.61.7). The
 * area model of a fraction: a whole cut into d equal parts, n of them taken (docs/05: fractions as
 * equal parts of a whole; CCSS 3.NF.A.1, the Polish core curriculum's "ułamki" in klasa 3-4 drawn
 * as shaded parts). Drawn as one SVG that scales to its box, so it never scrolls.
 *
 * Still, it is one picture read by its label. Interactive, every part is a toggle: a tap, or Space
 * or Enter on the focused part, shades it or clears it. Parts are numbered from 0: left to right on
 * a bar, row by row on a rectangle, clockwise from twelve o'clock on a circle.
 */

import { cn } from "@jadwigo/ui";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import type { PressModality } from "../stage/press.ts";

export type FractionShapeKind = "bar" | "circle" | "rect";

export interface FractionShapeProps {
  shape: FractionShapeKind;
  parts: number;
  /** A rectangle's rows; the columns are parts / rows. One row when absent. */
  rows?: number | undefined;
  shaded: ReadonlySet<number>;
  /** The whole picture's words (still), or the group's name (interactive). */
  label: string;
  /** Each part's words when interactive, such as "Part 3 of 4". */
  partLabel?(i: number): string;
  interactive?: { clock: Clock; onToggle(i: number, at: Instant, modality: PressModality): void };
  /** Whose shading it is: the child's (blue, --focus) by default, or the question's, drawn in
   * ink (--text), as a figure to read is (Enter addendum 3.4, 10b). */
  ink?: "child" | "question" | undefined;
  className?: string | undefined;
}

/** The SVG units of one part's side on a bar or a rectangle; the circle's radius. */
const UNIT = 100;
const R = 150;
/** A bar's whole length: the same for any number of parts, so two bars of one width are one whole
 * of one size and line up, 1/2 and 1/4 alike (owner, 2026-10-19, dl-w3.46.28). Squares made a bar
 * of fewer parts taller. */
const BAR = 8 * UNIT;

/** A circle's slice i of n as an SVG path, clockwise from twelve o'clock. */
function slice(i: number, n: number): string {
  if (n === 1) return `M ${R} 0 A ${R} ${R} 0 1 1 ${R - 0.01} 0 Z`;
  const point = (k: number) => {
    const a = (2 * Math.PI * k) / n - Math.PI / 2;
    return `${(R + R * Math.cos(a)).toFixed(3)} ${(R + R * Math.sin(a)).toFixed(3)}`;
  };
  return `M ${R} ${R} L ${point(i)} A ${R} ${R} 0 0 1 ${point(i + 1)} Z`;
}

/** The columns of a rectangle (or a bar, one row). */
export function columnsOf(parts: number, rows = 1): number {
  return Math.max(1, Math.round(parts / Math.max(1, rows)));
}

export function FractionShape({
  shape,
  parts,
  rows,
  shaded,
  label,
  partLabel,
  interactive,
  ink = "child",
  className,
}: FractionShapeProps): JSX.Element {
  const r = shape === "rect" ? Math.max(1, rows ?? 1) : 1;
  const cols = shape === "circle" ? parts : columnsOf(parts, r);
  const box =
    shape === "circle"
      ? { w: 2 * R, h: 2 * R }
      : shape === "bar"
        ? { w: BAR, h: UNIT }
        : { w: cols * UNIT, h: r * UNIT };
  const partW = shape === "bar" ? BAR / cols : UNIT;
  const live = interactive !== undefined;
  const part = (i: number) => {
    const on = shaded.has(i);
    const common = {
      "data-part": i,
      "data-shaded": on ? "yes" : "no",
      className: cn(
        "stroke-foreground",
        on ? (ink === "question" ? "fill-foreground" : "fill-primary") : "fill-card",
        live && "cursor-pointer focus-visible:outline-none focus-visible:stroke-ring",
      ),
      strokeWidth: 4,
      vectorEffect: "non-scaling-stroke" as const,
      ...(live
        ? {
            role: "button",
            tabIndex: 0,
            "aria-pressed": on,
            "aria-label": partLabel?.(i) ?? String(i + 1),
            onPointerDown: (e: PointerEvent<SVGElement>) => {
              if (e.button === undefined || e.button === 0)
                interactive.onToggle(i, interactive.clock.now(), "click");
            },
            onKeyDown: (e: KeyboardEvent<SVGElement>) => {
              if (e.key !== " " && e.key !== "Enter") return;
              e.preventDefault();
              interactive.onToggle(i, interactive.clock.now(), "keyboard");
            },
          }
        : {}),
    };
    if (shape === "circle") return <path key={i} d={slice(i, parts)} {...common} />;
    const x = (i % cols) * partW;
    const y = Math.floor(i / cols) * UNIT;
    return <rect key={i} x={x} y={y} width={partW} height={UNIT} {...common} />;
  };
  return (
    <svg
      viewBox={`-4 -4 ${box.w + 8} ${box.h + 8}`}
      role={live ? "group" : "img"}
      aria-label={label}
      data-fraction={`${shape}:${shaded.size}/${parts}`}
      className={cn("block h-auto w-full", shape === "circle" && "max-w-xs", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: parts }, (_, i) => part(i))}
    </svg>
  );
}
