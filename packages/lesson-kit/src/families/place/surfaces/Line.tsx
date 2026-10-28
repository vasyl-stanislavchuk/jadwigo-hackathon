/**
 * Place on a number line (number_line_place): tap or drag to place the marker, arrow keys to step
 * it; it snaps to the line's finest position (a tick, or a finer `snap`), which may be a fraction
 * (dl-w3.55). After a miss the marker stays where it was and the line is amber as a whole until the
 * next move. Moved out of PlaceView.tsx (dl-w3.61.1).
 *
 * Khan's tick control (dl-w3.70.19): with `divisions` a stepper above the line sets how many equal
 * parts it is cut into, within Khan's range and starting where Khan starts (1 part). It is a tool:
 * only the dot is judged, a change of parts moves a placed dot to the nearest new tick (as Perseus
 * does), and a dot never placed is not an answer yet. The still view draws the line in the parts
 * that show the dot.
 */

import { copy } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { NumberLineSvg } from "../../../parts/NumberLineSvg.tsx";
import { nudge, snapAt, WIDTH, xOf } from "../../../parts/numberLine.ts";
import { RichText } from "../../../parts/RichText.tsx";
import type { Language } from "../../../stage/types.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import { lineInParts, partsHolding, partsOf } from "../model.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  StillLabel,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type LineData = DataOf<typeof Surface.NumberLine>;

function Target({ data }: { data: LineData }): JSX.Element | null {
  if (data.target_label === null || data.target_label === undefined) return null;
  // A fraction to place is written as TeX; a whole number stays a number.
  return (
    <p className="text-[3rem] leading-none font-bold tabular-nums">
      {typeof data.target_label === "string" ? (
        <RichText inline text={data.target_label} />
      ) : (
        data.target_label
      )}
    </p>
  );
}

/** The line a value is drawn on: a line with a stepper in the fewest parts whose ticks hold it. */
function lineShowing(data: LineData, value: number | null): LineData {
  if (data.divisions === undefined || value === null) return data;
  const parts = partsHolding(data, data.divisions, value);
  return parts === null ? data : lineInParts(data, parts);
}

/** The stepper over a line with tick control: fewer and more parts, and how many there are now. */
function PartsStepper({
  parts,
  range,
  language,
  live,
  onChange,
}: {
  parts: number;
  range: NonNullable<LineData["divisions"]>;
  language: Language;
  live: boolean;
  onChange: (parts: number) => void;
}): JSX.Element {
  return (
    <div
      data-divisions={parts}
      role="group"
      aria-label={copy(language, "divisions_label", { n: parts })}
      className="flex items-center gap-4"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-2xl font-bold"
        aria-label={copy(language, "divisions_fewer")}
        disabled={!live || parts <= range.min}
        onClick={() => onChange(parts - 1)}
      >
        −
      </Button>
      <span className="text-xl font-semibold tabular-nums" aria-live="polite">
        {copy(language, "divisions_label", { n: parts })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="text-2xl font-bold"
        aria-label={copy(language, "divisions_more")}
        disabled={!live || parts >= range.max}
        onClick={() => onChange(parts + 1)}
      >
        +
      </Button>
    </div>
  );
}

export function LineStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.NumberLine>): JSX.Element {
  const mine = shown !== null && "at" in shown ? shown.at : null;
  const good = right !== null && "at" in right ? right.at : null;
  const axis = copy(language, "number_line_axis", { min: data.min, max: data.max });
  return (
    <>
      <Target data={data} />
      {mine !== null && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours />
          <NumberLineSvg
            data={lineShowing(data, mine)}
            marker={mine}
            tone={good === null ? "idle" : mine === good ? "green" : "amber"}
            markerState="placed"
            arcs={false}
            label={axis}
          />
        </div>
      )}
      {good !== null && mine !== good && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours={false} />
          <NumberLineSvg
            data={lineShowing(data, good)}
            marker={good}
            tone="green"
            markerState="placed"
            arcs={false}
            label={axis}
          />
        </div>
      )}
      {mine === null && good === null && (
        <NumberLineSvg data={data} marker={null} tone="idle" arcs={false} label={axis} />
      )}
    </>
  );
}

export function LinePlay(props: SurfacePlayProps<typeof Surface.NumberLine>): JSX.Element {
  const { data: given, language, clock, live } = props;
  const seed = props.initialValue ?? undefined;
  const [at, setAt] = useState<number | null>(() =>
    seed !== undefined && "at" in seed ? seed.at : null,
  );
  // Tick control: the parts the child has chosen, from where Khan starts (or where a kept dot sits).
  const [parts, setParts] = useState<number>(() =>
    given.divisions !== undefined && at !== null
      ? (partsHolding(given, given.divisions, at) ?? partsOf(given))
      : partsOf(given),
  );
  const data = given.divisions === undefined ? given : lineInParts(given, parts);
  const dragging = useRef(false);
  const step = usePlaceStep(props);
  const value = at === null ? null : { at };
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={given.stem}
        still={<LineStill data={given} language={language} shown={value} right={props.solution} />}
      />
    );

  const reparts = (next: number) => {
    if (!live) return;
    setParts(next);
    if (at === null) return;
    // A placed dot moves to the nearest tick of the new parts, as Perseus re-snaps it.
    const line = lineInParts(given, next);
    const moved = snapAt(xOf(at, line) / WIDTH, line);
    if (moved !== at) {
      step.moved(clock.now(), "click");
      setAt(moved);
    }
  };

  const valueAt = (e: PointerEvent<SVGSVGElement>): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return snapAt(r.width > 0 ? (e.clientX - r.left) / r.width : 0, data);
  };
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      answer={
        <>
          <Target data={data} />
          {given.divisions !== undefined && (
            <PartsStepper
              parts={parts}
              range={given.divisions}
              language={language}
              live={live}
              onChange={reparts}
            />
          )}
          <NumberLineSvg
            data={data}
            marker={at}
            tone={step.whole}
            markerState={at === null ? "empty" : "placed"}
            arcs={false}
            label={copy(language, "number_line_axis", { min: data.min, max: data.max })}
            interactive={{
              valueText:
                at === null ? undefined : copy(language, "number_line_marker", { value: at }),
              onPointerDown: (e) => {
                if (!live) return;
                dragging.current = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                step.moved(clock.now(), "click");
                setAt(valueAt(e));
              },
              onPointerMove: (e) => {
                if (live && dragging.current) setAt(valueAt(e));
              },
              onPointerUp: () => {
                dragging.current = false;
              },
              onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
                if (!live) return;
                const by =
                  e.key === "ArrowRight" || e.key === "ArrowUp"
                    ? 1
                    : e.key === "ArrowLeft" || e.key === "ArrowDown"
                      ? -1
                      : 0;
                if (by === 0) return;
                e.preventDefault();
                step.moved(clock.now(), "keyboard");
                setAt((v) => nudge(v, by, data));
              },
            }}
          />
        </>
      }
    />
  );
}
