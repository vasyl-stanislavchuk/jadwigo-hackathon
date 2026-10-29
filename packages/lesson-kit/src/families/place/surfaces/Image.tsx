/**
 * Place on a picture (hotspot): each tap sets a marker, as fractions of the picture (up to the
 * step's taps); tapping a marker lifts it. After a miss each tap is marked (the marks rule). Moved
 * out of PlaceView.tsx (dl-w3.61.1).
 *
 * By keyboard (dl-w3.61.3): the picture takes the focus, and a crosshair moves over a 20 by 20
 * grid with the arrow keys; Enter or Space places a marker at the cell's centre and Backspace lifts
 * the last one. Each move is announced. The markers and the crosshair sit over the picture, so
 * nothing on the page moves while the child taps.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { type KeyboardEvent, useState } from "react";
import { partTone, praised, type Tone } from "../../../parts/tone.ts";
import type { Language } from "../../../stage/types.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import type { Point } from "../model.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type ImageData = DataOf<typeof Surface.Image>;

const MARKER_TONE: Record<Tone, string> = {
  idle: "bg-primary",
  green: "bg-kid-correct",
  amber: "bg-kid-try-again",
  missing: "bg-primary",
};

/** The keyboard crosshair's grid: 20 cells each way, so a cell is 5% of the picture. */
const CURSOR_CELLS = 20;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const cellCentre = (i: number): number => (2 * i + 1) / (2 * CURSOR_CELLS);
/** The same centre as a CSS percentage, computed without a float step that prints 57.49999%. */
const cellPercent = (i: number): string => `${((2 * i + 1) * 50) / CURSOR_CELLS}%`;

function Picture({
  data,
  points,
  tones,
  onTap,
  onLift,
  language,
}: {
  data: ImageData;
  points: Point[];
  tones: Tone[];
  onTap?(p: Point, modality: "click" | "keyboard"): void;
  onLift?(i: number): void;
  language: Language;
}): JSX.Element {
  const [cursor, setCursor] = useState<{ x: number; y: number }>({
    x: CURSOR_CELLS / 2,
    y: CURSOR_CELLS / 2,
  });
  const [keyboard, setKeyboard] = useState(false);
  const [announce, setAnnounce] = useState("");
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onTap || e.target !== e.currentTarget) return;
    const arrow = ARROWS[e.key];
    if (arrow !== undefined) {
      e.preventDefault();
      const next = {
        x: Math.min(CURSOR_CELLS - 1, Math.max(0, cursor.x + arrow[0])),
        y: Math.min(CURSOR_CELLS - 1, Math.max(0, cursor.y + arrow[1])),
      };
      setKeyboard(true);
      setCursor(next);
      setAnnounce(copy(language, "hotspot_cursor", { x: next.x + 1, y: next.y + 1 }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setKeyboard(true);
      onTap({ x: cellCentre(cursor.x), y: cellCentre(cursor.y) }, "keyboard");
    } else if ((e.key === "Backspace" || e.key === "Delete") && points.length > 0) {
      e.preventDefault();
      onLift?.(points.length - 1);
    }
  };
  return (
    <div
      className={cn(
        "relative w-full touch-none select-none overflow-hidden rounded-xl border-2 border-border outline-none focus-visible:ring-4 focus-visible:ring-ring",
        onTap && "cursor-crosshair",
      )}
      role="group"
      {...(onTap ? { tabIndex: 0, "aria-label": copy(language, "hotspot_area") } : {})}
      data-testid="hotspot-picture"
      onKeyDown={onKey}
      onBlur={() => setKeyboard(false)}
      onPointerDown={(e) => {
        setKeyboard(false);
        if (!onTap || e.target !== e.currentTarget.querySelector("img")) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0)
          onTap(
            { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height },
            "click",
          );
      }}
    >
      <img src={data.image} alt={data.image_alt} className="block w-full" draggable={false} />
      {onTap && keyboard && (
        <span
          aria-hidden="true"
          data-testid="hotspot-cursor"
          className="pointer-events-none absolute size-kid-tap -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-dashed border-ring"
          style={{ left: cellPercent(cursor.x), top: cellPercent(cursor.y) }}
        >
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-ring" />
          <span className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-ring" />
        </span>
      )}
      {onTap && (
        <span className="sr-only" aria-live="polite" data-testid="hotspot-announce">
          {announce}
        </span>
      )}
      {points.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={copy(language, "hotspot_marker", { n: i + 1 })}
          data-tone={tones[i]}
          disabled={!onLift}
          className={cn(
            "absolute size-kid-tap -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card opacity-90",
            MARKER_TONE[tones[i] ?? "idle"],
          )}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          onClick={() => onLift?.(i)}
        />
      ))}
    </div>
  );
}

/** `rightKeyRegions`: the key's target regions, drawn over the picture when the key may show. */
export function ImageStill({
  data,
  language,
  shown,
  rightKeyRegions,
}: SurfaceStillProps<typeof Surface.Image> & { rightKeyRegions: Point[][] }): JSX.Element {
  const points = shown !== null && "points" in shown ? shown.points : [];
  return (
    <div className="relative">
      <Picture data={data} points={points} tones={points.map(() => "idle")} language={language} />
      {rightKeyRegions.length > 0 && (
        <svg
          aria-hidden="true"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {rightKeyRegions.map((poly, i) => (
            <polygon
              key={i}
              points={poly.map((p) => `${p.x},${p.y}`).join(" ")}
              className="fill-kid-correct/30 stroke-kid-correct"
              strokeWidth={0.006}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

export function ImagePlay(props: SurfacePlayProps<typeof Surface.Image>): JSX.Element {
  const { data, language, clock, live, feedback } = props;
  const seed = props.initialValue ?? undefined;
  const [points, setPoints] = useState<Point[]>(() =>
    seed !== undefined && "points" in seed ? [...seed.points] : [],
  );
  const step = usePlaceStep(props);
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={
          <ImageStill
            data={data}
            language={language}
            shown={{ points }}
            right={props.solution}
            rightKeyRegions={[]}
          />
        }
      />
    );

  const value = points.length > 0 ? { points } : null;
  const tones = points.map(
    (_, i): Tone => (praised(feedback) ? "green" : partTone(`t${i + 1}`, feedback, step.changed)),
  );
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      answer={
        <Picture
          data={data}
          points={points}
          tones={tones}
          language={language}
          onTap={(p, modality) => {
            if (!live) return;
            const i = points.length < data.taps ? points.length : data.taps - 1;
            step.moved(clock.now(), modality, `t${i + 1}`);
            setPoints((ps) => (ps.length < data.taps ? [...ps, p] : [...ps.slice(0, -1), p]));
          }}
          onLift={(i) => {
            if (!live) return;
            step.moved(clock.now(), "click", `t${i + 1}`);
            setPoints((ps) => ps.filter((_, j) => j !== i));
          }}
        />
      }
    />
  );
}
