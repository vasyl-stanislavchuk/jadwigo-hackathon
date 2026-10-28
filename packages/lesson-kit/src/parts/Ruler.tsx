/**
 * Part: a ruler drawn in SVG over a picture (dl-w3.51.4), from tokens: the body on the card
 * colour, marks and numbers in ink (--text), the zero and its tick too: the ruler is the
 * question's, never the child's --focus (Enter addendum 3.8, 10b). A grip of 2 × 3 dots in
 * --text-muted sits at the left end before the zero, so it reads as a thing to slide (9b). `MeasuredPicture` lays it over a Picture part in the picture's own pixel space,
 * so one viewBox serves both and the ruler stays true at any width.
 *
 * Interactive, the whole picture is the target: a press on the ruler drags it (pointer capture,
 * so a fast finger keeps it), a tap elsewhere places the zero end there, and with focus the arrow
 * keys move it one mark, Shift and an arrow one whole unit, Home sends it back to the left. With
 * keyboard focus it draws a 3 px --focus outline 3 px out, not the browser's ring (dl-zz13.3): a
 * slider is the one exception to "no focus is drawn" (foundation.css, dl-uukj.29.93), so the
 * outline classes carry `!` to win over that rule. The part knows nothing of what is measured and
 * never holds a key.
 */

import type { KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import { Picture, type PictureProps } from "./Picture.tsx";
import {
  gripDots,
  lastZero,
  nudgeZero,
  numberPx,
  pictureX,
  type RulerGeometry,
  rulerBox,
  rulerMarks,
  snapZero,
  tickPx,
} from "./rulerGeometry.ts";

export interface RulerControl {
  /** The zero end's position in picture pixels. */
  zero: number;
  onMove(zero: number): void;
  /** What a screen reader hears for the ruler. */
  label: string;
  /** The position read out, such as "3,5 cm". */
  valueText: string;
}

interface RulerProps {
  geometry: RulerGeometry;
  /** The picture's height in its pixels: the SVG's viewBox. */
  height: number;
  /** Where the ruler's top edge sits, in picture pixels. */
  top: number;
  unit: string;
  zero: number;
  control?: RulerControl | undefined;
}

export function Ruler({ geometry: g, height, top, unit, zero, control }: RulerProps): JSX.Element {
  const svg = useRef<SVGSVGElement>(null);
  // A press on the ruler keeps the finger's offset from the zero, so the ruler does not jump.
  const [grab, setGrab] = useState<number | null>(null);
  const box = rulerBox(zero, g);
  const marks = rulerMarks(zero, g);
  const tall = box.height;
  const font = numberPx(g) * 0.42;
  const onRuler = (x: number) => x >= box.x && x <= box.x + box.width;

  const at = (e: PointerEvent<SVGSVGElement>) =>
    pictureX(e.clientX, e.currentTarget.getBoundingClientRect(), g.width);
  const interactive = control
    ? {
        role: "slider" as const,
        tabIndex: 0,
        "aria-label": control.label,
        "aria-valuemin": 0,
        "aria-valuemax": lastZero(g),
        "aria-valuenow": zero,
        "aria-valuetext": control.valueText,
        style: { cursor: grab === null ? "grab" : "grabbing" },
        onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
          const x = at(e);
          e.currentTarget.setPointerCapture?.(e.pointerId);
          if (onRuler(x)) return setGrab(x - zero);
          // A tap away from the ruler places its zero end there.
          setGrab(0);
          control.onMove(snapZero(x, g));
        },
        onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
          if (grab === null) return;
          control.onMove(snapZero(at(e) - grab, g));
        },
        onPointerUp: () => setGrab(null),
        onPointerCancel: () => setGrab(null),
        onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            control.onMove(nudgeZero(zero, e.key === "ArrowLeft" ? -1 : 1, g, e.shiftKey));
          } else if (e.key === "Home") {
            e.preventDefault();
            control.onMove(0);
          }
        },
      }
    : { role: "img" as const, "aria-hidden": true };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${g.width} ${height}`}
      className="absolute inset-0 h-full w-full touch-none outline-none select-none focus-visible:outline-[0.1875rem]! focus-visible:outline-offset-[0.1875rem]! focus-visible:outline-ring! focus-visible:outline-solid!"
      data-testid="ruler"
      data-zero={zero}
      {...interactive}
    >
      <g transform={`translate(0 ${top})`}>
        <rect
          x={box.x}
          y={0}
          width={box.width}
          height={tall}
          rx={numberPx(g) * 0.1}
          className="fill-card stroke-foreground"
          strokeWidth={tickPx(g) * 0.3}
        />
        <g data-testid="ruler-grip">
          {gripDots(g, tall).map((d, i) => (
            <circle key={i} cx={zero + d.dx} cy={d.y} r={d.r} className="fill-muted-foreground" />
          ))}
        </g>
        {marks.map((m, i) => {
          const h =
            m.kind === "number" ? tall * 0.5 : m.kind === "half" ? tall * 0.35 : tall * 0.22;
          return (
            <g key={i} data-testid="ruler-mark" data-kind={m.kind}>
              <line
                x1={m.x}
                y1={0}
                x2={m.x}
                y2={h}
                className="stroke-foreground"
                strokeWidth={m.kind === "number" ? tickPx(g) * 0.35 : tickPx(g) * 0.2}
              />
              {m.kind === "number" && (
                <text
                  x={m.x}
                  y={tall * 0.92}
                  textAnchor="middle"
                  fontSize={font}
                  fontWeight={700}
                  className="fill-foreground"
                >
                  {m.n}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={box.x + box.width - numberPx(g) * 0.12}
          y={tall * 0.92}
          textAnchor="end"
          fontSize={font * 0.8}
          className="fill-foreground"
        >
          {unit}
        </text>
      </g>
    </svg>
  );
}

/** A picture with the ruler laid over it, in one box the width of the picture. */
export function MeasuredPicture({
  picture,
  geometry,
  unit,
  zero,
  top,
  control,
}: {
  picture: PictureProps;
  geometry: RulerGeometry;
  unit: string;
  zero: number;
  top?: number | undefined;
  control?: RulerControl | undefined;
}): JSX.Element {
  return (
    <div
      className="relative inline-block max-w-full"
      style={{ width: picture.width }}
      data-measured
    >
      <Picture {...picture} />
      <Ruler
        geometry={geometry}
        height={picture.height}
        top={top ?? picture.height - rulerBox(0, geometry).height}
        unit={unit}
        zero={zero}
        control={control}
      />
    </div>
  );
}
