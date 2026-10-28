/**
 * Part: the field a learner types one value into, with its keypad or keyboard (dl-w3.37.10). A
 * number on the keypad shows the big read-only answer box and the Keypad part; an expression
 * (dl-w3.51.1) does the same with the sign keys beside the digits. Text, or a number on a keyboard,
 * is a real input with no autocorrect. In a step frame the footer's Sprawdź checks and the step
 * keys own Enter (stepKeys.ts): the field is `data-field="entry"`, and after a miss its keypad box
 * is selected, so the next key replaces it (paper-behaviour README §3.5); the keypad and the letter row are the answer's tools
 * (Tools.tsx), docked, folded or in the laptop's tools panel. On its own, Enter or the Check button
 * submits. The caller holds the state (entry.ts) and the tone (tone.ts). A typed Polish answer
 * (`letters`, dl-uukj.28) gets the row of Polish letters under its field (LetterRow.tsx). After an
 * accent or one-letter slip only the slipped letters are marked over the field (`marks`,
 * LetterMarks.tsx, Enter addendum 3.6).
 */

import { copy } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import type { ComposerEvent } from "./composer.ts";
import { type EntryEvent, type EntryState, enter } from "./entryState.ts";
import { FractionBoxes } from "./FractionBoxes.tsx";
import { clearBox, type FractionBox, firstBox, typeInto } from "./fractionEntry.ts";
import { Keypad, type SignKeys } from "./Keypad.tsx";
import { LetterMarks } from "./LetterMarks.tsx";
import { LetterRow } from "./LetterRow.tsx";
import { Tools } from "./Tools.tsx";
import { MARK_FADE, SELECTION, TONE_CLASS, type Tone } from "./tone.ts";

/** The field (Enter addendum 2.1, 2.6): min 64 tall, r16, a 2 px edge, text at the left, bold.
 * Digits and signs at Zeszyt's maths size, 36 px on a laptop and 30 px on a phone, in tabular
 * lining figures; a word keeps the answer size, 26 / 24. Its look comes from the theme by state
 * (foundation.css): the active field is paper with the ink edge and caret, a mark is dashed red
 * once the child is away, right is green and flat. Every state keeps the same box, so the field
 * never moves by a pixel. */
const FIELD = cn(
  "relative min-h-16 w-full rounded-lg border-2 px-4 flex items-center text-[length:var(--kid-math-size)] font-bold",
  MARK_FADE,
);

const NO_MARKS: ReadonlySet<number> = new Set();

/** The one field's id for the step keys (stepKeys.ts). */
export const ENTRY_FIELD = "entry";

export function Entry({
  language,
  clock,
  input,
  entry,
  signs,
  signOf,
  code = false,
  max,
  state,
  tone,
  locked,
  label,
  letters = false,
  capitals = false,
  whole = false,
  check: withCheck = true,
  selected = false,
  away = false,
  unit,
  marks = NO_MARKS,
  under,
  place,
  onChange,
  onSubmit,
}: {
  language: Language;
  clock: Clock;
  input: "number" | "text" | "expression" | "fraction";
  entry: "keypad" | "keyboard";
  /** Fraction only (dl-w3.70.16): the whole number's box in front of the stacked boxes. */
  whole?: boolean | undefined;
  /** The sign keys of the keypad and what a hardware key stands for; plain props, so the part
   * knows no family (the Enter family passes its EXPRESSION_SIGNS and signOf, or the decimal
   * comma for a decimal, dl-w3.70.7). None, digits only. */
  signs?: readonly string[] | undefined;
  signOf?: ((key: string) => string | null) | undefined;
  code?: boolean | undefined;
  max: number;
  state: EntryState;
  tone: Tone;
  locked: boolean;
  label?: string | undefined;
  /** Text only: the row of Polish letters under the field (dl-uukj.28). The caller decides. */
  letters?: boolean | undefined;
  /** The letter row starts in capitals on the empty field (a sentence answer, dl-w3.68.22). */
  capitals?: boolean | undefined;
  /** Draw its own Check under a typed field. A family view sets false: the step shell's Sprawdź is
   * the action (lesson frame rule 1). */
  check?: boolean | undefined;
  /** The keypad box is selected (after a miss, stepKeys.ts): its digits wear the selection fill,
   * the next key replaces them and Backspace clears them. */
  selected?: boolean | undefined;
  /** After a miss the child clicked away on the page (stepKeys.ts, Enter addendum 2.3): the
   * keypad's field lets go of its active look and shows the dashed miss mark, its selection
   * hidden. The selection is kept, so a key or a tap back replaces the answer as before. */
  away?: boolean | undefined;
  /** Keypad only: the unit after the field, such as `cm` for a ruler (Enter addendum 3.8). The
   * field is then a number's width, 180 on a laptop and 160 on a phone, and the child types the
   * number only. */
  unit?: string | undefined;
  /** Text only: the letters an accent or one-letter slip marked (Enter addendum 3.6), by their
   * place (components/parts/letters.ts). The field keeps its look, paper inside its edge, and
   * only these letters are marked, until the child changes the word. */
  marks?: ReadonlySet<number> | undefined;
  /** What stands directly under the field, before its tools: the "checked too soon" line (Enter
   * addendum 2.2). The caller draws it. */
  under?: ReactNode | undefined;
  /** Keypad only: where the field stands. The Enter view puts it in the maths line, inside the
   * question card (InlineField.tsx, addendum 2.4); the keypad stays where it is. Absent, the field
   * stands here, under the card. */
  place?: ((field: JSX.Element) => JSX.Element) | undefined;
  onChange(next: EntryState, ev: EntryEvent): void;
  onSubmit(at: Instant, modality: "click" | "keyboard"): void;
}): JSX.Element {
  const field = useRef<HTMLDivElement & HTMLInputElement>(null);
  // A fraction (dl-w3.70.16): the box the keypad types into.
  const [box, setBox] = useState<FractionBox>(firstBox(whole));
  // Selected after a miss, the fraction starts again at its first box, where the focus goes.
  useEffect(() => {
    if (selected) setBox(firstBox(whole));
  }, [selected, whole]);

  const ariaLabel = label ?? copy(language, "answer_field");
  const look = cn(
    FIELD,
    tone === "idle" ? "border-border" : TONE_CLASS[tone],
    code && "font-mono",
    input !== "text" && "tabular-nums lining-nums",
  );
  // The selection shows while the child is in the field; away, the mark shows instead.
  const showSelected = selected && !away;

  if (input === "fraction") {
    // Stacked boxes (dl-w3.70.16): the keypad types into the box that has the focus, a tap on
    // a box moves to it, and a hardware `/` moves to the denominator.
    const onEvent = (ev: ComposerEvent) => {
      if (locked) return;
      if (ev.type === "enter") return onSubmit(clock.now(), "click");
      // A selected box (after a miss) is cleared by Backspace and replaced by the next digit.
      const from = selected ? clearBox(state.text, box) : state.text;
      if (ev.type === "backspace" && selected) return onChange({ ...state, text: from }, ev);
      if (ev.type === "backspace") {
        const next = typeInto(state.text, box, "backspace", whole);
        setBox(next.box);
        return onChange({ ...state, text: next.text }, ev);
      }
      const next = typeInto(from, box, { digit: ev.digit }, whole);
      if (next.text === state.text) return;
      onChange(
        enter(state, { type: "text", text: next.text, at: ev.at, source: ev.source }, max),
        ev,
      );
    };
    const slash: SignKeys = {
      signs: [],
      signOf: (key) => (key === "/" ? "den" : null),
      onSign: () => setBox("den"),
    };
    return (
      <div className="flex flex-col gap-4">
        <div
          ref={field}
          data-field={ENTRY_FIELD}
          data-empty={state.text === "" ? "" : undefined}
          data-away={away ? "" : undefined}
          className="text-[length:var(--kid-math-size)]"
        >
          <FractionBoxes
            text={state.text}
            whole={whole}
            tone={tone}
            active={locked || away ? null : box}
            selected={showSelected && !locked ? box : null}
            clock={clock}
            onPick={(b) => !locked && setBox(b)}
            label={ariaLabel}
            labels={{
              whole: copy(language, "fraction_whole"),
              num: copy(language, "fraction_numerator"),
              den: copy(language, "fraction_denominator"),
            }}
          />
        </div>
        {under}
        <Tools kind="keypad">
          <Keypad language={language} clock={clock} signKeys={slash} onEvent={onEvent} />
        </Tools>
      </div>
    );
  }

  if (input !== "text" && entry === "keypad") {
    const onEvent = (ev: ComposerEvent) => {
      if (locked) return;
      if (ev.type === "enter") return onSubmit(clock.now(), "click");
      const mapped: EntryEvent = ev;
      // A selected box is replaced by the next key, and cleared by Backspace.
      onChange(enter(selected ? { ...state, text: "" } : state, mapped, max), mapped);
    };
    const signKeys: SignKeys | undefined =
      signs !== undefined && signOf !== undefined
        ? {
            signs,
            signOf,
            onSign: (sign, at, source) => {
              if (locked) return;
              const ev: EntryEvent = { type: "sign", sign, at, source };
              onChange(enter(selected ? { ...state, text: "" } : state, ev, max), ev);
            },
          }
        : undefined;
    // The one field the keypad types into is the active one while it can be typed in (rule 10).
    // A unit (a ruler's cm) follows it at gap 12, 26 px bold --text-muted (Enter addendum 3.8).
    const box = (
      <div className={unit ? "flex items-center gap-3" : "contents"}>
        <div
          ref={field}
          role="textbox"
          aria-readonly="true"
          aria-label={ariaLabel}
          // It takes the focus, so the step keys can put the child in it.
          tabIndex={locked ? -1 : 0}
          data-tone={tone}
          data-field={ENTRY_FIELD}
          data-empty={state.text === "" ? "" : undefined}
          data-selected={showSelected ? "" : undefined}
          data-away={away ? "" : undefined}
          // The keypad types into it while the step is open, marked or not, so it wears the
          // active look then: paper, the ink edge and caret (foundation.css, Enter addendum
          // 2.1, 2.3). Once the child clicked away after a miss it shows the miss mark.
          data-active={!locked && !away ? "true" : undefined}
          data-entry={input}
          className={look}
        >
          {showSelected && state.text ? (
            <span {...SELECTION}>{state.text}</span>
          ) : (
            state.text || " "
          )}
        </div>
        {unit && (
          <span data-unit className="text-[1.625rem] leading-none font-bold text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    );
    return (
      <div className="flex flex-col gap-4">
        {place ? place(box) : box}
        {under}
        <Tools kind="keypad">
          <Keypad language={language} clock={clock} signKeys={signKeys} onEvent={onEvent} />
        </Tools>
      </div>
    );
  }

  const check = press(clock, (at, modality) => !locked && onSubmit(at, modality));
  const lettered = input === "text" && marks.size > 0;
  return (
    <div className="flex flex-col gap-4">
      {/* The letter row sits flush under its field, as part of it (dl-w3.68.30). */}
      <div className="flex flex-col">
        {/* As wide as the field (a number is 180 / 160, stage.css). */}
        <div className={cn("relative", input === "number" ? "w-fit max-w-full" : "w-full")}>
          <input
            ref={field}
            aria-label={ariaLabel}
            data-tone={tone}
            data-field={ENTRY_FIELD}
            data-entry={input}
            data-away={away ? "" : undefined}
            // Its selection after a slip (the marked letters, stepKeys.ts) draws nothing: the
            // marks show over it, and the next key replaces the slipped letter.
            data-letter-marked={lettered ? "" : undefined}
            // A word at the answer size, 26 / 24; a number or an expression typed on a
            // keyboard keeps the maths size (Enter addendum 2.6).
            className={cn(look, input === "text" && "text-[length:var(--kid-answer-size)]")}
            value={state.text}
            readOnly={locked}
            inputMode={input === "number" ? "numeric" : input === "expression" ? "decimal" : "text"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={max}
            onChange={(event) => {
              const ev: EntryEvent = {
                type: "text",
                text: event.target.value,
                at: clock.now(),
              };
              onChange(enter(state, ev, max), ev);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !locked) {
                event.preventDefault();
                onSubmit(clock.now(), "keyboard");
              }
            }}
          />
          {lettered && (
            <LetterMarks
              text={state.text}
              missed={marks}
              className={cn(
                "px-4 font-bold text-[length:var(--kid-answer-size)]",
                code && "font-mono",
              )}
            />
          )}
        </div>
        {under}
        {letters && input === "text" && (
          <Tools kind="letters">
            <LetterRow
              language={language}
              clock={clock}
              field={() => field.current}
              text={state.text}
              capitalStart={capitals}
              max={max}
              locked={locked}
              onInsert={(text, at, source) => {
                const ev: EntryEvent = { type: "text", text, at, source };
                onChange(enter(state, ev, max), ev);
              }}
            />
          </Tools>
        )}
      </div>
      {withCheck && (
        <Button
          type="button"
          size="commit"
          className="w-full text-2xl"
          aria-disabled={locked}
          onPointerDown={check.onPointerDown}
          onClick={check.onClick}
        >
          {copy(language, "check")}
        </Button>
      )}
    </div>
  );
}
