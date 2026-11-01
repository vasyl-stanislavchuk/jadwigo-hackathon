/**
 * The Enter view (dl-w3.37.12): one typed value, under a figure when the step has one (an
 * expression, a number line with its marker for reading, dots or groups: families/figure.ts).
 * Numbers on the big keypad, text on a keyboard field with no autocorrect, and an expression
 * (dl-w3.51.1) on the keypad with its sign keys, kept exactly as typed. A Polish text answer
 * (`letters: 'pl'`, dl-uukj.28) has the row of Polish letters under its field.
 *
 * Play: the answer is kept after a miss so the learner can fix it (the miss rule); the field is
 * red until the first change, then idle again, and selected meanwhile so the next key replaces
 * it (paper-behaviour README §3.5). t1 is the first input of the attempt.
 *
 * Layout (Enter addendum 2.2, 2.4, 2.8, 3.1; dl-uukj.29.106): a maths line ending in "= ?" takes
 * the field in the ?'s place inside the card (InlineField.tsx), with the instruction above the
 * card; Sprawdź pressed too soon puts complete.ts's line directly under the field, the footer
 * plain; after "Jeszcze nie wiem" the child's field stays where and as it was, and the solution
 * card under it ends on the answer.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useContext, useEffect, useState } from "react";
import { ENTRY_FIELD, Entry } from "../../parts/Entry.tsx";
import { EMPTY_ENTRY, type EntryState, rearm, submit } from "../../parts/entryState.ts";
import {
  DECIMAL_SEPARATORS,
  decimalKeyOf,
  decimalShown,
  parseDecimal,
  parseFraction,
  sameExact,
  separatorCount,
} from "../../parts/exact.ts";
import { FractionBoxes } from "../../parts/FractionBoxes.tsx";
import { FRACTION_MAX } from "../../parts/fractionEntry.ts";
import { InlineField, inlineLine } from "../../parts/InlineField.tsx";
import { missedLetters, missedRun } from "../../parts/letters.ts";
import type { RulerControl } from "../../parts/Ruler.tsx";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import type { StepKeysInput } from "../../parts/stepKeys.ts";
import { TooSoon } from "../../parts/TooSoon.tsx";
import { missed, TONE_CLASS, type Tone, useChanged, wholeTone } from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { LessonLanguage, useScreensLang } from "../../stage/lessonLanguage.ts";
import { press } from "../../stage/press.ts";
import type { Language, PageSolutionLine } from "../../stage/types.ts";
import {
  type Missing,
  missingDecimal,
  missingExpression,
  missingFraction,
  missingText,
} from "../complete.ts";
import type { Family } from "../names.ts";
import { Instruction, instructionOf, Stem } from "../Stem.tsx";
import {
  answers,
  type PlayProps,
  shellOf,
  showingSolution,
  ViewMode,
  type ViewProps,
} from "../view.ts";
import { EQUATION_SIGNS, EXPRESSION_SIGNS, equationSignOf, signOf } from "./expression.ts";
import type { EnterData, EnterValue } from "./model.ts";

type F = typeof Family.Enter;

/** The longest entry a field takes when the step names none; a decimal takes more (dl-w3.70.7). */
// An expression takes 24 (Enter addendum 3.7): Khan's 6+6+6+6+6+6+6+6 is 15.
const MAX = { number: 4, text: 40, expression: 24, fraction: FRACTION_MAX };
const MAX_DECIMAL = 8;

const maxOf = (data: EnterData): number =>
  data.max_length ?? (data.input === "number" && data.decimal ? MAX_DECIMAL : MAX[data.input]);

/** What is still missing from the entry, by what the step asks for. */
const missingOf = (data: EnterData, text: string): Missing | null => {
  if (data.input === "expression") return missingExpression(text);
  if (data.input === "fraction") return missingFraction(text);
  return data.input === "number" && data.decimal ? missingDecimal(text) : missingText(text);
};

/** A decimal's key, and a hardware comma or point typed as itself (dl-w3.70.7). */
const decimalSignOf = (key: string): string | null =>
  DECIMAL_SEPARATORS.includes(key) ? key : null;

/** The keypad's sign keys for the step: an expression's signs, a decimal's key (a comma, or a
 * point in an English lesson, dl-uukj.42), else none. */
function signsOf(
  data: EnterData,
  decimalKey: string,
): { signs: readonly string[]; signOf: (key: string) => string | null } | null {
  // An equation (dl-w3.70.17) adds `=`.
  if (data.input === "expression")
    return data.equation
      ? { signs: EQUATION_SIGNS, signOf: equationSignOf }
      : { signs: EXPRESSION_SIGNS, signOf };
  if (data.input === "number" && data.decimal)
    return { signs: [decimalKey], signOf: decimalSignOf };
  return null;
}

/** Whether the learner's entry is the right one shown beside it: a decimal or a fraction by its
 * value and form (6/8 shows as the right 3/4, 1 1/2 is not 3/2). */
function sameEntry(data: EnterData, shown: string, right: string): boolean {
  if (data.input === "fraction") {
    const a = parseFraction(shown);
    const b = parseFraction(right);
    return a !== null && b !== null && sameExact(a.value, b.value) && a.form === b.form;
  }
  if (data.input === "number" && data.decimal) {
    const a = parseDecimal(shown);
    const b = parseDecimal(right);
    return a !== null && b !== null && sameExact(a, b);
  }
  return shown.trim() === right;
}

/** One answer box, inert: the learner's or the right one, with its word under it. A fraction
 * (dl-w3.70.16) is its stacked boxes. */
function Answer({
  text,
  tone,
  label,
  code,
  fraction,
  language,
}: {
  text: string;
  tone: Tone;
  label: string;
  code?: boolean | undefined;
  fraction?: { whole: boolean } | undefined;
  language: Language;
}): JSX.Element {
  // "Your answer" and "Right answer" are the screens' words, under the lesson's lang (dl-uukj.41).
  const labelLang = useScreensLang(language);
  if (fraction) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-jw-small" {...labelLang}>
          {label}
        </span>
        {/* Digits only, named for a screen reader in the screens' words. */}
        <div className="text-jw-math" {...labelLang}>
          <FractionBoxes
            text={text}
            whole={fraction.whole || text.includes(" ")}
            tone={tone}
            label={label}
            labels={{
              whole: copy(language, "fraction_whole"),
              num: copy(language, "fraction_numerator"),
              den: copy(language, "fraction_denominator"),
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-jw-small" {...labelLang}>
        {label}
      </span>
      <div
        data-tone={tone}
        className={cn(
          "min-h-16 rounded-lg border-2 px-4 flex items-center text-jw-math font-bold tabular-nums lining-nums",
          tone === "idle" ? "border-border" : TONE_CLASS[tone],
          code && "font-mono",
        )}
      >
        {text || " "}
      </div>
    </div>
  );
}

/** The step outside play (review, preview, print): the learner's answer and the right one, each
 * named. In a lesson the solution keeps the child's field instead (EnterPlay, addendum 2.8). */
function EnterStill({
  data,
  say,
  language,
  shown,
  right,
  paper,
}: {
  data: EnterData;
  say: string;
  language: Language;
  shown: EnterValue | null;
  right: EnterValue | null;
  paper: boolean;
}): JSX.Element {
  const same = shown !== null && right !== null && sameEntry(data, shown.entered, right.entered);
  const lessonLanguage = useContext(LessonLanguage);
  // A key's decimal reads as the learner's language writes it (0,29 in Polish, dl-w3.70.7).
  const rightText =
    right !== null ? rightShown(data, right.entered, lessonLanguage ?? language) : undefined;
  const fraction = data.input === "fraction" ? { whole: data.whole === true } : undefined;
  return (
    <div className="kid-family-enter flex flex-col gap-6">
      <Stem say={say} stem={data.stem} figure={data.figure} language={language} paper={paper} />
      {shown !== null && (
        <Answer
          text={shown.entered}
          tone={right === null ? "idle" : same ? "green" : "try_again"}
          label={copy(language, "answer_yours")}
          code={data.code}
          fraction={fraction}
          language={language}
        />
      )}
      {right !== null && !same && (
        <Answer
          text={rightText ?? ""}
          tone="green"
          label={copy(language, "answer_right")}
          code={data.code}
          fraction={fraction}
          language={language}
        />
      )}
      {shown === null && right === null && (
        <Answer
          text=""
          tone="idle"
          label={copy(language, "answer_field")}
          code={data.code}
          fraction={fraction}
          language={language}
        />
      )}
    </div>
  );
}

function EnterPlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  // The decimal key and a shown answer follow the lesson's language (dl-uukj.42).
  const lessonLanguage = useContext(LessonLanguage);
  const data = spec.data;
  const [state, setState] = useState<EntryState>(() =>
    props.initialValue === undefined
      ? EMPTY_ENTRY
      : { ...EMPTY_ENTRY, text: props.initialValue.entered },
  );
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  // The keypad box selected after a miss (stepKeys.ts), which the next key replaces.
  const [selected, setSelected] = useState(false);
  // After a miss, the child clicked away on the page (stepKeys.ts, Enter addendum 2.3): the field
  // shows its dashed miss mark until they come back to it.
  const [away, setAway] = useState(false);
  useEffect(() => {
    setState(rearm);
    setAway(false);
  }, [attemptNo]);
  // A ruler figure (dl-w3.51.4): the page holds where the child slid it; the key never knows.
  const rulerFigure = data.figure?.kind === "ruler" ? data.figure : null;
  // The ruler's name and reading are the screens' words, under the lesson's lang (dl-uukj.43).
  const rulerLang = useScreensLang(language);
  const [rulerZero, setRulerZero] = useState<number>(rulerFigure?.start ?? 0);
  const ruler: RulerControl | undefined = rulerFigure
    ? {
        zero: rulerZero,
        onMove: (zero) => {
          if (live) setRulerZero(zero);
        },
        ...(rulerLang.lang === undefined ? {} : { lang: rulerLang.lang }),
        label: copy(language, "ruler_label"),
        valueText: copy(language, "ruler_at", {
          n: (rulerZero / rulerFigure.pixels_per_unit)
            .toFixed(rulerFigure.unit === "cm" ? 1 : 0)
            .replace(".", language === "en" ? "." : ","),
          unit: rulerFigure.unit,
        }),
      }
    : undefined;
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingOf(data, props.initialValue?.entered ?? "");
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After "Jeszcze nie wiem" the step keeps its layout (Enter addendum 2.8, decision dl-y3th 13b):
  // the child's field stays where and as it was, with the miss mark, and the solution card stands
  // under it, its last line the right answer. No "Twoja odpowiedź", no second box.
  const solved = showingSolution(props);
  const lines = solved
    ? solutionCardLines(
        props.solutionLines ?? null,
        rightShown(data, props.solution.entered, lessonLanguage ?? language),
      )
    : null;

  const send = (at: Instant, modality: "click" | "keyboard") => {
    if (!live || solved) return;
    const gap = missingOf(data, state.text);
    if (gap !== null) return flag(gap);
    // The judge first, then the ask (Enter addendum 3.4): a right 2/6 is asked for more simply,
    // with the boxes unmarked; a 4/6 goes on to be judged a miss.
    const nudge = props.around?.nudge?.({ entered: state.text }) ?? null;
    if (nudge !== null) return flag({ reason: nudge, parts: [] });
    const sent = submit(state, at, modality);
    if (sent !== null)
      onCommit({ value: { entered: sent.text }, t1: sent.t1, modality: sent.modality });
  };
  const signKeys = signsOf(data, decimalKeyOf(lessonLanguage));
  // A nudge is a line under the field only: the boxes keep their look (Enter addendum 3.4). The
  // solution keeps the miss mark the child last saw (addendum 2.8).
  const tone: Tone = solved
    ? state.text === ""
      ? "idle"
      : "try_again"
    : missing?.reason === "fraction_simplify"
      ? wholeTone(feedback, changed)
      : orMissing(wholeTone(feedback, changed), null, missing);
  // An accent or one-letter slip marks only its letters (addendum 3.6), until the word is changed.
  const letterMarks = missedLetters(
    missed(feedback) && changed.size === 0 ? feedback?.parts : undefined,
  );
  // The one field for the step keys: a slot when it takes one character, else a field.
  const max = maxOf(data);
  const keys: StepKeysInput = {
    fields: [
      {
        id: ENTRY_FIELD,
        kind: max === 1 ? "slot" : "field",
        maxLength: max,
        value: state.text,
        marked: tone === "try_again" || letterMarks.size > 0,
        ...(data.input === "text"
          ? { word: true, missedRun: missedRun(state.text, letterMarks) }
          : {}),
      },
    ],
    clear: () => setState((s) => ({ ...s, text: "" })),
    select: (id) => setSelected(id === ENTRY_FIELD),
    away: setAway,
  };
  // A maths line ending in "= ?" takes the field in the ?'s place, inside the card (addendum 2.4):
  // a whole number on the keypad. The card is then drawn with the field in the answer area, and
  // the instruction stands above it in the stem's place.
  const line =
    data.figure?.kind === "expression" &&
    data.input === "number" &&
    data.decimal !== true &&
    data.entry === "keypad"
      ? inlineLine(data.figure.text)
      : null;
  const stemOf = (figureAs?: JSX.Element) => (
    <Stem
      say={spec.say}
      stem={data.stem}
      figure={data.figure}
      language={language}
      ruler={ruler}
      instructionAbove
      cardOnly={figureAs !== undefined}
      figureAs={figureAs}
    />
  );
  // The field's width comes from the step's length setting, as a Slots gap's does (owner, 2026-10-27).
  const place =
    line === null
      ? undefined
      : (field: JSX.Element) =>
          stemOf(
            <InlineField line={line} digits={max}>
              {field}
            </InlineField>,
          );
  // "Checked too soon" (addendum 2.2): the line directly under the field, 12 below it (16 under the
  // card when the field is in it), on every screen. The footer stays plain.
  const underClass =
    line !== null
      ? undefined
      : data.input === "text"
        ? cn("mt-3", data.letters === "pl" && "mb-3")
        : "-mt-1";
  const under = (
    <TooSoon
      reason={solved ? null : (missing?.reason ?? null)}
      language={language}
      className={underClass}
    />
  );

  return (
    <StepShell
      {...shellOf(props)}
      {...(solved ? { moveOn: null, solutionLines: lines } : {})}
      className="kid-family-enter"
      stem={line === null ? stemOf() : <Instruction say={instructionOf(spec.say, data.stem)} />}
      // The footer's Sprawdź is the one check, keypad or not (lesson frame rule 1, dl-uukj.29.26).
      action={
        solved ? null : { ready: live && state.text.trim() !== "", press: press(clock, send) }
      }
      keys={keys}
      answer={
        <Entry
          language={language}
          clock={clock}
          input={data.input}
          entry={data.entry}
          whole={data.input === "fraction" && data.whole === true}
          signs={signKeys?.signs}
          signOf={signKeys?.signOf}
          code={data.code}
          max={max}
          state={state}
          tone={tone}
          selected={selected && !solved}
          away={solved || (away && tone === "try_again")}
          // A measurement: the child types the number, the unit stands after the field (addendum 3.8).
          unit={rulerFigure?.unit}
          marks={letterMarks}
          locked={!live || solved}
          letters={data.input === "text" && data.letters === "pl"}
          capitals={data.capitals === true}
          check={false}
          under={under}
          place={place}
          onChange={(next) => {
            if (!live || solved) return;
            // A decimal takes one comma (dl-w3.70.7): a second is not typed.
            if (data.input === "number" && data.decimal && separatorCount(next.text) > 1) return;
            change("entry");
            clear();
            setSelected(false);
            setAway(false);
            setState(next);
          }}
          onSubmit={send}
        />
      }
    />
  );
}

/** The right answer as the learner's language writes it: a decimal's comma in Polish (dl-w3.70.7). */
function rightShown(data: EnterData, entered: string, language: Language): string {
  return data.input === "number" && data.decimal ? decimalShown(entered, language) : entered;
}

/** The solution card's lines (Enter addendum 2.8): the worked lines, which end on the answer
 * (section 6). A step with none, or whose last line does not hold the answer, ends on the answer
 * itself, so the card always shows it. */
export function solutionCardLines(
  worked: readonly PageSolutionLine[] | null,
  right: string,
): PageSolutionLine[] {
  const lines = worked ?? [];
  const squeeze = (text: string): string => text.replace(/\\times/g, "×").replace(/[\s$]/g, "");
  const last = lines[lines.length - 1];
  if (right.trim() === "" || (last !== undefined && squeeze(last.text).includes(squeeze(right))))
    return [...lines];
  return [...lines, { text: right }];
}

/** How long the "too soon" line and the dashed edge take to go on the first key (addendum 2.2). */
export function EnterView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) return <EnterPlay {...props} />;
  const { shown, right } = answers(props);
  return (
    <EnterStill
      data={props.spec.data}
      say={props.spec.say}
      language={props.language}
      shown={shown}
      right={right}
      paper={props.mode === ViewMode.Print}
    />
  );
}
