/**
 * Part: the number line drawn in SVG (dl-w3.37.10), moved from blocks/number_line so the family
 * views draw the same line; the block re-exports it. The labels are HTML laid over the SVG (Enter
 * addendum 3.5): 34 px bold where the line is 600 px wide or more, scaled down only with a narrower
 * line, so they keep the UI's size instead of the drawing's. A tick labelled as a fraction or a
 * mixed number (dl-w3.55) is TeX, drawn through RichText; whole numbers are plain text. The strokes
 * keep their pixel widths at any size: the line 4 px, a tick 3 px, a labelled tick 4 px and longer,
 * all in --text. A marker read off the line is the question's ink, --text, never --focus (10b); a
 * marker the child places keeps the tone's colours. The geometry and the whole-height tap target
 * are the same either way.
 */

import type { KeyboardEvent, PointerEvent, Ref } from "react";
import { notationText, useNotation } from "./notation.ts";
import {
  commonDenominator,
  drawnTicks,
  isTexLabel,
  type LineData,
  PAD,
  tickLabel,
  tickLabelText,
  ticks,
  WIDTH,
  xOf,
} from "./numberLine.ts";
import { RichText } from "./RichText.tsx";
import type { Tone } from "./tone.ts";

const HEIGHT = 170;
const LINE_Y = 100;
/** A label's centre, in SVG units, under the line. */
const LABEL_Y = LINE_Y + 46;

interface Props {
  data: LineData & { labelled: readonly number[] };
  marker: number | null;
  tone: Tone;
  /** placed, missed (the last miss, amber) or the read-mode marker. */
  markerState?: string | undefined;
  /** Arcs from min to the marker, one per step (docs/17 §3 jump arcs). */
  arcs: boolean;
  label: string;
  svgRef?: Ref<SVGSVGElement> | undefined;
  interactive?:
    | {
        valueText: string | undefined;
        onPointerDown(e: PointerEvent<SVGSVGElement>): void;
        onPointerMove(e: PointerEvent<SVGSVGElement>): void;
        onPointerUp(e: PointerEvent<SVGSVGElement>): void;
        onKeyDown(e: KeyboardEvent<SVGSVGElement>): void;
      }
    | undefined;
}

const MARKER: Record<Tone, string> = {
  idle: "fill-primary",
  green: "fill-kid-correct",
  amber: "fill-kid-try-again",
  missing: "fill-primary",
};
/** The read-mode marker is part of the question, not the child's ink (Enter addendum 10b). */
const READ_MARKER = "fill-foreground";

/** The line itself, plain SVG (docs/17: SVG first, Mafs later), its labels HTML. Never draws a key. */
export function NumberLineSvg({
  data,
  marker,
  tone,
  markerState = "shown",
  arcs,
  label,
  svgRef,
  interactive,
}: Props): JSX.Element {
  // A decimal tick reads 0,5 in a Polish lesson (notation.ts).
  const language = useNotation();
  const all = ticks(data);
  const at = (v: number) => xOf(v, data);
  const jumps = arcs && marker !== null ? all.filter((v) => v < marker) : [];
  const style = data.tick_label ?? "decimal";
  // A non-reduced line writes every label over one denominator, the whole line's (dl-w3.70.2).
  const base = style === "non-reduced" ? commonDenominator(data, data.labelled) : null;
  // One drawing for every label on a line: TeX when any labelled tick is a fraction.
  const texLabels = data.labelled.some((v) => isTexLabel(tickLabel(v, style, base)));
  const marked = markerState === "read" ? READ_MARKER : MARKER[tone];
  return (
    // The labels' box, as wide as the line: a label's left is its tick's share of the width, and
    // its size reads the box's width (cqw). A span, so the phone's div[data-wide] rules for
    // tables pass it by, as they passed the SVG; on a laptop a number line in the answer still
    // breaks out of the column to 1120 (styles/stage.css).
    <span data-wide data-number-line className="relative block w-full [container-type:inline-size]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto min-h-[var(--kid-tap-min)] w-full touch-none select-none"
        data-testid="number-line"
        {...(interactive
          ? {
              role: "slider",
              tabIndex: 0,
              "aria-label": label,
              "aria-valuemin": data.min,
              "aria-valuemax": data.max,
              "aria-valuenow": marker ?? undefined,
              "aria-valuetext": interactive.valueText,
              onPointerDown: interactive.onPointerDown,
              onPointerMove: interactive.onPointerMove,
              onPointerUp: interactive.onPointerUp,
              onPointerCancel: interactive.onPointerUp,
              onKeyDown: interactive.onKeyDown,
              style: { cursor: "pointer" },
            }
          : { role: "img", "aria-label": label })}
      >
        {/* The whole height is the tap target. */}
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent" />
        {jumps.map((v) => {
          const x1 = at(v);
          const x2 = at(v + data.step);
          const mid = (x1 + x2) / 2;
          return (
            <path
              key={`arc-${v}`}
              data-testid="jump-arc"
              d={`M ${x1} ${LINE_Y - 4} Q ${mid} ${LINE_Y - 60} ${x2} ${LINE_Y - 4}`}
              className="fill-none stroke-primary/60"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <line
          x1={PAD}
          y1={LINE_Y}
          x2={WIDTH - PAD}
          y2={LINE_Y}
          className="stroke-foreground"
          strokeWidth={4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {drawnTicks(data, data.labelled).map((v) => {
          const labelled = data.labelled.includes(v);
          return (
            <g key={v} data-testid="tick" data-value={v} data-labelled={labelled ? "" : undefined}>
              <line
                x1={at(v)}
                y1={LINE_Y - (labelled ? 22 : 14)}
                x2={at(v)}
                y2={LINE_Y + (labelled ? 22 : 14)}
                className="stroke-foreground"
                strokeWidth={labelled ? 4 : 3}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        {marker !== null && (
          <g
            data-testid="marker"
            data-value={marker}
            data-state={markerState}
            className="pointer-events-none"
          >
            <path d={`M ${at(marker)} ${LINE_Y - 8} l -16 -30 h 32 z`} className={marked} />
            <circle cx={at(marker)} cy={LINE_Y} r={10} className={marked} />
          </g>
        )}
      </svg>
      {data.labelled.map((v) => (
        <span
          key={v}
          data-testid="tick-label"
          aria-hidden="true"
          // 34 px (2.125rem) at a line of 600 or more, smaller only on a narrower one (34 / 600 = 5.667cqw).
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[length:min(2.125rem,5.667cqw)] leading-none font-bold whitespace-nowrap text-foreground"
          style={{ left: `${(at(v) / WIDTH) * 100}%`, top: `${(LABEL_Y / HEIGHT) * 100}%` }}
        >
          {texLabels ? (
            <RichText inline text={tickLabelText(v, style, base)} />
          ) : (
            notationText(tickLabel(v, style, base), language)
          )}
        </span>
      ))}
    </span>
  );
}
