/**
 * Place on a fraction shape (fraction_shade, dl-w3.61.7): a bar, a circle or a rectangle cut into
 * equal parts; a tap, or Space or Enter on the focused part, shades it or clears it. The fraction
 * to shade stands big above the shape. Any parts that make the count are right (place/fraction.ts),
 * so the step is marked as a whole: after a miss the shading stays and the shape is amber until the
 * next tap. Nothing moves while the child shades: the shape is drawn at its size from the start.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useState } from "react";
import { FractionShape } from "../../../parts/FractionShape.tsx";
import { RichText } from "../../../parts/RichText.tsx";
import { TONE_CLASS, type Tone } from "../../../parts/tone.ts";
import type { Clock, Instant } from "../../../stage/clock.ts";
import type { PressModality } from "../../../stage/press.ts";
import type { Language } from "../../../stage/types.ts";
import type { Missing } from "../../complete.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  StillLabel,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type FractionData = DataOf<typeof Surface.Fraction>;

/** The fraction to shade, big above the shape: the task, page-visible. */
function Target({ data }: { data: FractionData }): JSX.Element {
  return (
    <p className="text-[3rem] leading-none font-bold tabular-nums">
      <RichText inline text={data.label} />
    </p>
  );
}

/** Nothing shaded is no answer yet. */
function missingFraction(value: unknown | null): Missing | null {
  return value === null ? { reason: "incomplete_fraction", parts: [] } : null;
}

function Shape({
  data,
  shaded,
  tone,
  language,
  onToggle,
  clock,
}: {
  data: FractionData;
  shaded: readonly number[];
  tone: Tone;
  language: Language;
  clock?: Clock | undefined;
  onToggle?(i: number, at: Instant, modality: PressModality): void;
}): JSX.Element {
  return (
    <div
      data-tone={tone}
      className={cn(
        "w-full max-w-xl rounded-xl border-2 p-3",
        tone === "idle" ? "border-transparent" : TONE_CLASS[tone],
      )}
    >
      <FractionShape
        shape={data.shape}
        parts={data.parts}
        rows={data.rows}
        shaded={new Set(shaded)}
        label={copy(language, "fraction_shape", { d: data.parts })}
        partLabel={(i) => copy(language, "fraction_part", { n: i + 1, d: data.parts })}
        interactive={onToggle && clock ? { clock, onToggle } : undefined}
      />
    </div>
  );
}

const shadedOf = (v: unknown): number[] | null =>
  v !== null && typeof v === "object" && Array.isArray((v as { shaded?: unknown }).shaded)
    ? (v as { shaded: number[] }).shaded
    : null;

export function FractionStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.Fraction>): JSX.Element {
  const mine = shadedOf(shown);
  const good = shadedOf(right);
  // Any parts that make the count are right, so "the same" is the same number shaded.
  const same = mine !== null && good !== null && new Set(mine).size === good.length;
  return (
    <div className="flex flex-col gap-4">
      <Target data={data} />
      {mine !== null && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours />
          <Shape
            data={data}
            shaded={mine}
            tone={good === null ? "idle" : same ? "green" : "amber"}
            language={language}
          />
        </div>
      )}
      {good !== null && !same && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours={false} />
          <Shape data={data} shaded={good} tone="green" language={language} />
        </div>
      )}
      {mine === null && good === null && (
        <Shape data={data} shaded={[]} tone="idle" language={language} />
      )}
    </div>
  );
}

export function FractionPlay(props: SurfacePlayProps<typeof Surface.Fraction>): JSX.Element {
  const { data, language, clock, live } = props;
  const [shaded, setShaded] = useState<number[]>(() => shadedOf(props.initialValue ?? null) ?? []);
  const step = usePlaceStep(props, missingFraction);
  const value = shaded.length > 0 ? { shaded: [...shaded].sort((a, b) => a - b) } : null;
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={
          <FractionStill data={data} language={language} shown={value} right={props.solution} />
        }
      />
    );

  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      under={<Target data={data} />}
      answer={
        <Shape
          data={data}
          shaded={shaded}
          tone={step.whole}
          language={language}
          clock={clock}
          onToggle={(i, when, modality) => {
            if (!live) return;
            step.moved(when, modality);
            setShaded((s) => (s.includes(i) ? s.filter((j) => j !== i) : [...s, i]));
          }}
        />
      }
    />
  );
}
