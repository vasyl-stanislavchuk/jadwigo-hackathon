/**
 * Part: an analogue clock face in SVG (dl-w3.61.5): the face, a tick for every minute and a longer
 * one for every hour, the numbers 1 to 12 (or none), a short thick hour hand and a long minute hand.
 * Geometry is in clock.ts. Still, it is one picture with its words (role img), and it never says the
 * time: a reading exercise's figure would give the answer away.
 *
 * Interactive (clock_set), each hand is a slider the keyboard reaches with Tab, and the arrow keys
 * move it one step (the minute hand by `minuteStep` minutes, the hour hand as clock.ts says). A tap
 * on the face moves the active hand there, a drag carries it round, and a press on a hand makes it
 * the active one. Two buttons under the face pick the active hand too, so a child who never drags
 * can set both. Nothing moves the layout: the buttons are drawn from the first frame.
 *
 * Both hands are --text (the question's ink), the face --surface with a 4 px --text rim. On a
 * phone a figure's face is 200 px (stage.css), on a laptop at most 384.
 *
 * Tones are per hand, from tone.ts: a right hand is green with a solid ring at its tip, a missed one
 * red with a dashed ring (never colour alone). A hand rung 1 points at wears a dotted ring.
 */

import { cn } from "@jadwigo/ui";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import {
  CAP_HEIGHT,
  type ClockHands,
  FACE,
  type Gearing,
  type Hand,
  marksAt,
  nudgeHand,
  pointAt,
  setHour,
  setMinute,
  snapMinute,
} from "./clock.ts";
import type { Tone } from "./tone.ts";

/** The face's own units: a 200 by 200 box, the centre at 100 (clock.ts FACE, held by its test). */
const SIZE = FACE.size;
const C = SIZE / 2;
const RIM = FACE.rim;
const NUMBER_R = FACE.numberR;
const MINUTE_LEN = FACE.minuteLen;
const HOUR_LEN = FACE.hourLen;
const FONT = FACE.font;

const HAND_STROKE: Record<Tone, string> = {
  idle: "",
  green: "stroke-kid-correct",
  try_again: "stroke-kid-try-again",
  missing: "",
};
const RING: Record<Tone, string | null> = {
  idle: null,
  green: "stroke-kid-correct",
  try_again: "stroke-kid-try-again",
  missing: "stroke-primary",
};

export interface ClockFaceProps {
  hands: ClockHands;
  numbers?: "arabic" | "none" | undefined;
  /** What the face is, for a screen reader; never the time it shows when the time is the answer. */
  label: string;
  /** A tone per hand after a verdict. */
  tones?: Partial<Record<Hand, Tone>> | undefined;
  /** The face's frame tone, after a verdict that marked no hand. */
  tone?: Tone | undefined;
  /** The hands rung 1 points at. */
  focus?: ReadonlySet<string> | undefined;
  interactive?:
    | {
        minuteStep: number;
        gearing: Gearing;
        /** Each hand's name and its position in words, for its slider. */
        handLabel(hand: Hand): string;
        valueText(hand: Hand, hands: ClockHands): string;
        /** The two buttons that pick the active hand. */
        pickLabel: string;
        onChange(next: ClockHands, hand: Hand, modality: "click" | "keyboard"): void;
      }
    | undefined;
}

function HandShape({
  hand,
  marks,
  tone,
  focused,
  helped,
}: {
  hand: Hand;
  marks: number;
  tone: Tone;
  focused: boolean;
  helped: boolean;
}): JSX.Element {
  const len = hand === "m" ? MINUTE_LEN : HOUR_LEN;
  const tip = pointAt(marks, len, C);
  const knob = pointAt(marks, len - 6, C);
  // Both hands are the question's ink, never the child's --focus blue (Slots addendum 2.6 and 4.6).
  const ink = HAND_STROKE[tone] || "stroke-foreground";
  return (
    <>
      {/* A wide clear stroke over the hand: what a finger grabs. */}
      <line
        x1={C}
        y1={C}
        x2={tip.x}
        y2={tip.y}
        className="stroke-transparent"
        strokeWidth={26}
        strokeLinecap="round"
      />
      <line
        x1={C}
        y1={C}
        x2={tip.x}
        y2={tip.y}
        className={ink}
        strokeWidth={hand === "m" ? 5 : 9}
        strokeLinecap="round"
      />
      {RING[tone] && (
        <circle
          cx={knob.x}
          cy={knob.y}
          r={11}
          className={cn("fill-none", RING[tone])}
          strokeWidth={3}
          strokeDasharray={tone === "try_again" || tone === "missing" ? "5 4" : undefined}
        />
      )}
      {helped && (
        <circle
          cx={knob.x}
          cy={knob.y}
          r={15}
          className="fill-none stroke-primary"
          strokeWidth={2.5}
          strokeDasharray="2 5"
        />
      )}
      {focused && (
        <circle cx={knob.x} cy={knob.y} r={18} className="fill-none stroke-ring" strokeWidth={3} />
      )}
    </>
  );
}

export function ClockFace({
  hands,
  numbers = "arabic",
  label,
  tones,
  tone = "idle",
  focus,
  interactive,
}: ClockFaceProps): JSX.Element {
  const [active, setActive] = useState<Hand>("m");
  const [focused, setFocused] = useState<Hand | null>(null);
  const dragging = useRef<Hand | null>(null);
  const [announce, setAnnounce] = useState("");

  const move = (hand: Hand, next: ClockHands, modality: "click" | "keyboard") => {
    if (!interactive) return;
    if (next.hourAt === hands.hourAt && next.minute === hands.minute) return;
    interactive.onChange(next, hand, modality);
    setAnnounce(interactive.valueText(hand, next));
  };
  const marksFrom = (e: PointerEvent<SVGElement>): number => {
    const svg =
      e.currentTarget instanceof SVGSVGElement ? e.currentTarget : e.currentTarget.ownerSVGElement;
    const r = svg?.getBoundingClientRect();
    const w = r && r.width > 0 ? r.width : SIZE;
    const h = r && r.height > 0 ? r.height : SIZE;
    return marksAt(e.clientX - (r?.left ?? 0) - w / 2, e.clientY - (r?.top ?? 0) - h / 2);
  };
  const placeAt = (hand: Hand, marks: number) => {
    if (!interactive) return;
    const next =
      hand === "m"
        ? setMinute(hands, snapMinute(marks, interactive.minuteStep), interactive.gearing)
        : setHour(hands, marks, interactive.gearing);
    move(hand, next, "click");
  };

  const face = (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      data-testid="clock-face"
      data-tone={tone}
      data-hour-at={hands.hourAt}
      data-minute={hands.minute}
      {...(interactive
        ? { role: "group", "aria-label": label }
        : { role: "img", "aria-label": label })}
      className={cn(
        "h-auto w-full max-w-sm select-none",
        interactive && "cursor-pointer touch-none",
      )}
      onPointerDown={(e) => {
        if (!interactive) return;
        dragging.current = active;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        placeAt(active, marksFrom(e));
      }}
      onPointerMove={(e) => {
        if (interactive && dragging.current !== null) placeAt(dragging.current, marksFrom(e));
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
    >
      <circle
        cx={C}
        cy={C}
        r={RIM}
        className={cn(
          "fill-card",
          tone === "green"
            ? "stroke-kid-correct"
            : tone === "try_again"
              ? "stroke-kid-try-again"
              : "stroke-foreground",
        )}
        strokeWidth={4}
        strokeDasharray={tone === "try_again" ? "12 8" : undefined}
      />
      {Array.from({ length: 60 }, (_, i) => {
        const hour = i % 5 === 0;
        const a = pointAt(i, FACE.tickOut, C);
        const b = pointAt(i, hour ? FACE.hourTickIn : FACE.minuteTickIn, C);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className={hour ? "stroke-foreground" : "stroke-muted-foreground"}
            strokeWidth={hour ? 3 : 1.5}
          />
        );
      })}
      {numbers === "arabic" &&
        Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const p = pointAt(n * 5, NUMBER_R, C);
          return (
            <text
              key={n}
              x={p.x}
              y={p.y + (CAP_HEIGHT * FONT) / 2}
              textAnchor="middle"
              fontSize={FONT}
              className="fill-foreground font-bold tabular-nums"
              data-testid="clock-number"
            >
              {n}
            </text>
          );
        })}
      {(["h", "m"] as const).map((hand) => {
        const marks = hand === "m" ? hands.minute : hands.hourAt;
        const shape = (
          <HandShape
            hand={hand}
            marks={marks}
            tone={tones?.[hand] ?? "idle"}
            focused={focused === hand}
            helped={focus?.has(hand) ?? false}
          />
        );
        if (!interactive)
          return (
            <g key={hand} data-hand={hand}>
              {shape}
            </g>
          );
        return (
          <g
            key={hand}
            data-hand={hand}
            data-tone={tones?.[hand] ?? "idle"}
            data-active={active === hand}
            role="slider"
            tabIndex={0}
            aria-label={interactive.handLabel(hand)}
            aria-valuemin={0}
            aria-valuemax={59}
            aria-valuenow={Math.round(marks)}
            aria-valuetext={interactive.valueText(hand, hands)}
            {...(focus?.has(hand) ? { "data-help-focus": "true" } : {})}
            className="outline-none"
            onFocus={() => {
              setFocused(hand);
              setActive(hand);
            }}
            onBlur={() => setFocused(null)}
            onPointerDown={(e) => {
              // A press on a hand picks it up; the face then carries it.
              e.stopPropagation();
              setActive(hand);
              dragging.current = hand;
              e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
            }}
            onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
              const by =
                e.key === "ArrowUp" || e.key === "ArrowRight"
                  ? 1
                  : e.key === "ArrowDown" || e.key === "ArrowLeft"
                    ? -1
                    : 0;
              if (by === 0) return;
              e.preventDefault();
              move(
                hand,
                nudgeHand(hands, hand, by, interactive.minuteStep, interactive.gearing),
                "keyboard",
              );
            }}
          >
            {shape}
          </g>
        );
      })}
      <circle cx={C} cy={C} r={6} className="fill-foreground" />
    </svg>
  );
  if (!interactive) return face;
  return (
    <div className="flex flex-col items-center gap-3">
      {face}
      <div role="group" aria-label={interactive.pickLabel} className="flex gap-3">
        {(["h", "m"] as const).map((hand) => (
          <button
            key={hand}
            type="button"
            aria-pressed={active === hand}
            data-pick={hand}
            onClick={() => setActive(hand)}
            className={cn(
              "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-xl border-2 px-4 py-2 text-lg font-semibold",
              active === hand ? "border-primary bg-primary/10" : "border-border bg-card",
            )}
          >
            {interactive.handLabel(hand)}
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
