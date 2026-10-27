/**
 * Set the clock (clock_set, dl-w3.61.5): the time to show sits big above a clock face, and the
 * child moves its two hands (components/parts/ClockFace.tsx). A tap on the face moves the active
 * hand there, a drag carries it, the two buttons under the face pick the active hand, and from the
 * keyboard each hand is a slider moved one step by the arrow keys. `hands: 'geared'` moves the hour
 * hand with the minutes, as a real clock does; `free` leaves it to the child.
 *
 * Check waits for a first move: a clock nobody touched is not an answer. After a miss each hand is
 * marked on its own (the marks rule), and the hands stay where they were.
 */

import { copy } from "@jadwigo/copy";
import { useState } from "react";
import { ClockFace } from "../../../parts/ClockFace.tsx";
import { type ClockHands, faceNumbers, type Hand, hourAtOf } from "../../../parts/clock.ts";
import { RichText } from "../../../parts/RichText.tsx";
import { partTone, praised, type Tone } from "../../../parts/tone.ts";
import type { Language } from "../../../stage/types.ts";
import type { Missing } from "../../complete.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import type { ClockValue } from "../model.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  StillLabel,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type ClockData = DataOf<typeof Surface.Clock>;

const missingClock = (value: unknown | null): Missing | null =>
  value === null ? { reason: "incomplete_clock", parts: [] } : null;

const toHands = (v: ClockValue): ClockHands => ({ hourAt: v.hour_at, minute: v.m });
const toValue = (h: ClockHands): ClockValue => ({ hour_at: h.hourAt, m: h.minute });
const isClock = (v: unknown): v is ClockValue =>
  v !== null && typeof v === "object" && "hour_at" in v && "m" in v;

/** Where the hands stand before the child moves them: the step's start, else twelve o'clock. */
function startOf(data: ClockData): ClockHands {
  return data.starting ? toHands(data.starting) : { hourAt: hourAtOf(12, 0), minute: 0 };
}

/** The time to show, big above the face; it may be words or digits. */
function Target({ data }: { data: ClockData }): JSX.Element {
  return (
    <p className="text-center text-[2.5rem] leading-tight font-bold">
      <RichText inline text={data.target_label} />
    </p>
  );
}

function words(language: Language) {
  const where = (marks: number): string => {
    const at = faceNumbers(marks);
    return "at" in at
      ? copy(language, "clock_points_at", { n: at.at })
      : copy(language, "clock_points_between", { from: at.from, to: at.to });
  };
  const handLabel = (hand: Hand): string =>
    copy(language, hand === "h" ? "clock_hour_hand" : "clock_minute_hand");
  return {
    handLabel,
    valueText: (hand: Hand, hands: ClockHands): string =>
      where(hand === "h" ? hands.hourAt : hands.minute),
    pickLabel: copy(language, "clock_pick_hand"),
    face: copy(language, "clock_face"),
  };
}

export function ClockStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.Clock>): JSX.Element {
  const label = copy(language, "clock_face");
  const mine = isClock(shown) ? toHands(shown) : null;
  const good = isClock(right) ? toHands(right) : null;
  const same =
    mine !== null &&
    good !== null &&
    mine.minute === good.minute &&
    Math.abs(mine.hourAt - good.hourAt) < 1e-6;
  const tonesOf = (h: ClockHands): Partial<Record<Hand, Tone>> =>
    good === null
      ? {}
      : {
          h: Math.abs(h.hourAt - good.hourAt) < 2.5 ? "green" : "amber",
          m: h.minute === good.minute ? "green" : "amber",
        };
  return (
    <div className="flex flex-col gap-4">
      <Target data={data} />
      {mine !== null && (
        <div className="flex flex-col items-center gap-1">
          <StillLabel language={language} yours />
          <ClockFace hands={mine} label={label} tones={tonesOf(mine)} />
        </div>
      )}
      {good !== null && !same && (
        <div className="flex flex-col items-center gap-1">
          <StillLabel language={language} yours={false} />
          <ClockFace hands={good} label={label} tones={{ h: "green", m: "green" }} />
        </div>
      )}
      {mine === null && good === null && (
        <div className="flex justify-center">
          <ClockFace hands={startOf(data)} label={label} />
        </div>
      )}
    </div>
  );
}

export function ClockPlay(props: SurfacePlayProps<typeof Surface.Clock>): JSX.Element {
  const { data, language, clock, live, feedback } = props;
  const seed = props.initialValue ?? undefined;
  const [hands, setHands] = useState<ClockHands | null>(() =>
    seed !== undefined && isClock(seed) ? toHands(seed) : null,
  );
  const step = usePlaceStep(props, missingClock);
  const value = hands === null ? null : toValue(hands);
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={<ClockStill data={data} language={language} shown={value} right={props.solution} />}
      />
    );

  const w = words(language);
  const shown = hands ?? startOf(data);
  const tones: Partial<Record<Hand, Tone>> = {
    h: praised(feedback) ? "green" : partTone("h", feedback, step.changed),
    m: praised(feedback) ? "green" : partTone("m", feedback, step.changed),
  };
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      under={<Target data={data} />}
      answer={
        <div className="flex justify-center">
          <ClockFace
            hands={shown}
            label={w.face}
            tones={tones}
            tone={feedback?.parts === undefined ? step.whole : "idle"}
            focus={step.help.focus}
            interactive={{
              minuteStep: data.minute_step,
              gearing: data.hands,
              handLabel: w.handLabel,
              valueText: w.valueText,
              pickLabel: w.pickLabel,
              onChange: (next, hand, modality) => {
                if (!live) return;
                const at = clock.now();
                step.moved(at, modality, hand);
                // Geared, the minute hand carries the hour hand: both have moved.
                if (hand === "m" && next.hourAt !== shown.hourAt) step.moved(at, modality, "h");
                setHands(next);
              },
            }}
          />
        </div>
      }
    />
  );
}
