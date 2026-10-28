/**
 * What every Place surface shares (dl-w3.61.1): the step's bookkeeping (the first move's instant,
 * what changed since the last attempt, the missing mark, the help given), the step shell around a
 * surface, and the solution drawn in the step layout. A surface is one file in place/surfaces/,
 * with a play view and a still view; PlaceView.tsx picks one by `data.surface`. A new surface is a
 * new file there and one line in each of PlaceView's two switches.
 */

import { copy } from "@jadwigo/copy";
import { type ReactNode, useEffect, useRef } from "react";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import { praised, type Tone, useChanged, wholeTone } from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import { type Missing, missingPlace } from "../complete.ts";
import type { Family } from "../names.ts";
import { Stem } from "../Stem.tsx";
import type { Stem as StemData } from "../stem/model.ts";
import { helpIn, type PlayProps, shellOf } from "../view.ts";
import type { PlaceData, PlaceValue } from "./model.ts";

export type F = typeof Family.Place;
/** A surface's slice of the Place data. */
export type DataOf<S extends PlaceData["surface"]> = Extract<PlaceData, { surface: S }>;
/** A surface's play view: the step's props, with its data narrowed to the surface. */
export type SurfacePlayProps<S extends PlaceData["surface"]> = PlayProps<F> & { data: DataOf<S> };
/** A surface's still view: what was answered and the right answer, either may be absent. */
export interface SurfaceStillProps<S extends PlaceData["surface"]> {
  data: DataOf<S>;
  language: PlayProps<F>["language"];
  shown: PlaceValue | null;
  right: PlaceValue | null;
}

/** The step's bookkeeping, the same for every surface. `missingOf` says when a value is not an
 * answer yet (missingPlace unless the surface has its own). */
export function usePlaceStep(
  props: PlayProps<F>,
  missingOf: (value: unknown | null) => Missing | null = missingPlace,
) {
  const { clock, live, attemptNo, feedback, onCommit } = props;
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  const help = helpIn(props);
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingOf(props.initialValue ?? null);
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);

  /** A move on the surface: the first one is the answer's onset; `part` is what changed. */
  const moved = (when: Instant, modality: PressModality, part = "surface") => {
    onset.current ??= { at: when, modality };
    change(part);
    clear();
  };
  /** Check: commits `value`, or marks what is missing. */
  const check = (value: PlaceValue | null) =>
    press(clock, (when, modality) => {
      if (!live) return;
      const gap = missingOf(value);
      if (gap !== null) return flag(gap);
      if (value !== null)
        onCommit({
          value,
          t1: onset.current?.at ?? when,
          modality: onset.current?.modality ?? modality,
        });
    });
  const whole: Tone = orMissing(
    praised(feedback) ? "green" : wholeTone(feedback, changed),
    null,
    missing,
  );
  return { changed, missing, help, moved, check, whole };
}

/** The step around a surface: its stem (and anything the surface shows under it), the surface,
 * and Check, ready once there is a value. */
export function PlaceShell({
  props,
  step,
  value,
  stem,
  under,
  answer,
}: {
  props: PlayProps<F>;
  step: ReturnType<typeof usePlaceStep>;
  value: PlaceValue | null;
  stem?: StemData | undefined;
  under?: ReactNode | undefined;
  answer: ReactNode;
}): JSX.Element {
  const { spec, language, live } = props;
  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-place"
      incomplete={step.missing?.reason ?? null}
      stem={
        <div className="flex flex-col gap-4">
          <Stem say={spec.say} stem={stem} language={language} />
          {under}
        </div>
      }
      answer={answer}
      action={{ ready: live && value !== null, press: step.check(value) }}
    />
  );
}

/** The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f rule 2). */
export function PlaceSolution({
  props,
  stem,
  still,
}: {
  props: PlayProps<F>;
  stem?: StemData | undefined;
  still: ReactNode;
}): JSX.Element {
  return (
    <StepShell
      {...shellOf(props)}
      moveOn={null}
      stem={<Stem say={props.spec.say} stem={stem} language={props.language} />}
      answer={still}
      action={null}
    />
  );
}

/** The line over a still answer: "Your answer" or "The right answer". */
export function StillLabel({
  language,
  yours,
}: {
  language: PlayProps<F>["language"];
  yours: boolean;
}): JSX.Element {
  return (
    <span className="text-base">{copy(language, yours ? "answer_yours" : "answer_right")}</span>
  );
}
