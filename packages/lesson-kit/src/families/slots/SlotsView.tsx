/**
 * The Gaps view (dl-w3.37.12): a sentence, an equation or a command with its gaps inline. A typed
 * text gap is a field in the line; a typed number gap is a box the one keypad below types into (tap
 * a box to move to it; a decimal gap's keypad has a comma key, dl-w3.70.7); a chosen gap is a menu: the gap is a button that opens its options in a
 * list below it (owner, 2026-10-12, after ClassTime's dropdown gap), so the sentence reads as a
 * sentence and the options get full-size targets. A gap may also sit in a table's cell
 * (dl-w3.51.5) or as a marker on a picture (dl-w3.51.2). Check commits every gap at once and is
 * offered once every gap is filled.
 *
 * Play: after a miss only the missed gaps are marked (Slots addendum 2.1, dl-4e0f 4b): a right gap
 * stays as it was typed, paper and editable, and a missed one wears the miss mark until the learner
 * changes it; every gap turns green only when the whole step is right. Everything typed is kept.
 * Sprawdź pressed too soon marks every empty gap dashed and puts one line under the body (addendum
 * 3.3, TooSoon.tsx); the footer stays plain. After a
 * right answer a chosen gap reads whole (dl-w3.68.2): no longer a menu, its form is a green word of
 * the sentence, so the child reads the sentence once with the right form in place.
 *
 * A typed Polish text gap (`letters: 'pl'`, dl-uukj.28) gets one row of Polish letters under the
 * step, serving the Polish gap that last had the focus (the first in reading order until one
 * does). The gap's field widens as letters arrive, easing (dl-w3.68.30). The row starts in
 * capitals only for a gap that starts a sentence (dl-w3.68.22).
 *
 * A text gap missed by an accent or one slipped letter marks only those letters, as the Enter field
 * does (Enter addendum 3.6): the gap keeps its paper and the letters wear the mark until it is
 * changed. After a miss a click on the page sends the child away (stepKeys.ts, addendum 2.3): the
 * keypad's box lets go of its active look and its selection, and a marked one shows its dashed mark.
 * A fraction gap is judged first and then asked for in lower terms (addendum 3.4, nudgeOf).
 *
 * The parts (dl-uukj.29.120): this file holds the step's state and keys. The gaps are drawn by
 * SlotGap.tsx (one part per kind) and GapMenu.tsx (a chosen gap); the body by SlotsBody.tsx, with
 * SlotsTable.tsx and SlotsLabelled.tsx; the review, print and solution views by SlotsStill.tsx;
 * what a gap is, by gaps.ts.
 */

import { useEffect, useRef, useState } from "react";
import type { ComposerEvent } from "../../parts/composer.ts";
import { DECIMAL_KEY, DECIMAL_SEPARATORS, separatorCount } from "../../parts/exact.ts";
import { clearBox, type FractionBox, firstBox, typeInto } from "../../parts/fractionEntry.ts";
import { Keypad } from "../../parts/Keypad.tsx";
import { LetterRow } from "../../parts/LetterRow.tsx";
import { missedLetters, missedRun } from "../../parts/letters.ts";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import type { StepField, StepKeysInput } from "../../parts/stepKeys.ts";
import { Tools } from "../../parts/Tools.tsx";
import { TooSoon } from "../../parts/TooSoon.tsx";
import { fieldTone, missed, praised, type Tone, useChanged } from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import { missingGaps } from "../complete.ts";
import { Family } from "../names.ts";
import { Stem } from "../Stem.tsx";
import {
  answers,
  helpIn,
  type PlayProps,
  shellOf,
  showingSolution,
  ViewMode,
  type ViewProps,
} from "../view.ts";
import { optionalGap } from "./column.ts";
import {
  gapName,
  isDecimal,
  isFraction,
  isSlot,
  MAX_DECIMAL,
  MAX_NUMBER,
  MAX_TEXT,
} from "./gaps.ts";
import { fillOrder, markerIds, startsSentence, takes } from "./model.ts";
import { type GapPlay, SlotGap } from "./SlotGap.tsx";
import { SlotsBody } from "./SlotsBody.tsx";
import { endsOnBody, SlotsPrinted, SlotsStill } from "./SlotsStill.tsx";

type F = typeof Family.Slots;

function SlotsPlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const data = spec.data;
  // The gaps the one keypad types into: numbers, and fractions in stacked boxes (dl-w3.70.16).
  const numberGaps = data.gaps
    .filter((g) => g.kind === Family.Enter && (g.input === "number" || g.input === "fraction"))
    .map((g) => g.id);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...(props.initialValue?.gaps ?? {}),
  }));
  // The order the child fills the gaps in (§3.4): reading order, a column's units first.
  const order = fillOrder(data);
  // The keypad starts at the first number gap in fill order (a column's units digit).
  const [active, setActiveGap] = useState<string | null>(
    order.find((id) => numberGaps.includes(id)) ?? numberGaps[0] ?? null,
  );
  // The keypad box selected after a miss (§3.5), which the next key replaces.
  const [selected, setSelected] = useState<string | null>(null);
  // After a miss, the child clicked away on the page (addendum 2.3): the boxes show their marks.
  const [away, setAway] = useState(false);
  // The chosen gap whose list is open (addendum 2.2): only it draws the focus border, and the
  // keypad stays docked but quiet until a pick or a tap elsewhere closes it.
  const [menu, setMenu] = useState<string | null>(null);
  // A chosen gap is in use: its list is open, or after a miss it is the first missed gap and the
  // child has not clicked away. Then no keypad gap is active and the keypad types nothing, so
  // only that gap has the focus border (addendum 2.2).
  const chosenInUse =
    menu !== null ||
    (selected !== null &&
      !away &&
      data.gaps.some((g) => g.id === selected && g.kind === Family.Choose));
  // In a fraction gap, the box the keypad types into; moving to a gap starts at its first box.
  const startBox = (id: string | null): FractionBox => {
    const gap = data.gaps.find((g) => g.id === id);
    return firstBox(gap?.kind === Family.Enter && gap.whole === true);
  };
  const [box, setBox] = useState<FractionBox>(() => startBox(active));
  const setActive = (id: string | null, at: FractionBox = startBox(id)) => {
    if (id !== active || at !== box) setBox(at);
    setActiveGap(id);
  };
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  // The Polish letter row (dl-uukj.28) types into the Polish text gap that last had the focus.
  const polishGaps = markerIds(data).filter((id) =>
    data.gaps.some(
      (g) => g.id === id && g.kind === Family.Enter && g.input === "text" && g.letters === "pl",
    ),
  );
  const [lettersFor, setLettersFor] = useState<string | null>(polishGaps[0] ?? null);
  const fields = useRef(new Map<string, HTMLInputElement>());
  const lettersGap = data.gaps.find((g) => g.id === lettersFor);
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  // The help ladder (families/help.ts): rung 1 outlines gaps, rung 2 fills some with the right
  // answer. A given gap is settled: shown, locked, and part of every commit.
  const help = helpIn(props, markerIds(data));
  const given = (help.given as { gaps?: Record<string, string> } | null)?.gaps ?? {};
  const isGiven = (id: string) => given[id] !== undefined;
  const merged = { ...values, ...given };
  const valuesRef = useRef(merged);
  valuesRef.current = merged;
  useEffect(() => {
    onset.current = null;
    setAway(false);
  }, [attemptNo]);
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingGaps(data, { gaps: valuesRef.current });
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const givenKey = Object.keys(given).join(",");
  useEffect(() => {
    // The gap the keypad types into was given: move on to the next open number gap.
    if (active !== null && isGiven(active))
      setActive(numberGaps.find((id) => !isGiven(id)) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [givenKey]);

  // The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f
  // rule 2): the child's gaps as left, and one card of worked lines under them (Slots addendum 6).
  // A last line that is the body filled in (Khan's table) is drawn as the body, printed.
  if (showingSolution(props)) {
    const shell = shellOf(props);
    const cut = shell.solutionLines ? endsOnBody(data, shell.solutionLines) : null;
    return (
      <StepShell
        {...shell}
        solutionLines={cut ?? shell.solutionLines}
        solutionBody={
          cut ? <SlotsPrinted data={data} language={language} right={props.solution} /> : null
        }
        moveOn={null}
        stem={<Stem say={spec.say} stem={data.stem} figure={data.figure} language={language} />}
        answer={
          <SlotsStill
            data={data}
            say={spec.say}
            language={language}
            shown={{ gaps: merged }}
            right={props.solution}
            paper={false}
            bare
          />
        }
        action={null}
      />
    );
  }

  const set = (id: string, value: string, at: Instant, modality: PressModality) => {
    if (!live || isGiven(id)) return;
    onset.current ??= { at, modality };
    change(id);
    clear();
    setAway(false);
    setValues((v) => ({ ...v, [id]: value }));
  };
  // A column's small cells may stay empty (families/slots/column.ts).
  const filled = data.gaps.every(
    (g) => optionalGap(data, g.id) || (merged[g.id] ?? "").trim() !== "",
  );
  const send = (at: Instant, modality: PressModality) => {
    if (!live) return;
    const gap = missingGaps(data, { gaps: valuesRef.current });
    if (gap !== null) return flag(gap);
    // The judge first, then the ask (Enter addendum 3.4): a right step with a fraction gap not
    // in lowest terms is asked for it more simply, its boxes unmarked.
    const nudge = props.around?.nudge?.({ gaps: { ...valuesRef.current } }) ?? null;
    if (nudge !== null) return flag({ reason: nudge, parts: [] });
    onCommit({
      value: { gaps: { ...valuesRef.current } },
      t1: onset.current?.at ?? at,
      modality: onset.current?.modality ?? modality,
    });
  };
  const check = press(clock, send);
  const onKey = (ev: ComposerEvent) => {
    // A hardware key typed into a text gap belongs to that field, not to the number gap.
    if (
      ev.type !== "enter" &&
      (ev.type === "backspace" || ev.source === "keyboard") &&
      typeof document !== "undefined" &&
      document.activeElement?.tagName === "INPUT"
    )
      return;
    if (ev.type === "enter") return send(clock.now(), "click");
    if (active === null || isGiven(active) || chosenInUse) return;
    const now = valuesRef.current[active] ?? "";
    const gap = data.gaps.find((g) => g.id === active);
    // A selected box (after a miss) is replaced by the next key and cleared by Backspace.
    const replace = selected === active;
    setSelected(null);
    if (isFraction(gap)) {
      const from = replace ? clearBox(now, box) : now;
      if (ev.type === "backspace" && replace) {
        if (from !== now) set(active, from, clock.now(), "click");
        return;
      }
      const next = typeInto(
        from,
        box,
        ev.type === "backspace" ? "backspace" : { digit: ev.digit },
        gap?.kind === Family.Enter && gap.whole === true,
      );
      setBox(next.box);
      if (next.text !== now)
        set(
          active,
          next.text,
          ev.type === "backspace" ? clock.now() : ev.at,
          ev.type === "backspace" ? "click" : ev.source,
        );
      return;
    }
    if (ev.type === "backspace")
      return set(active, replace ? "" : now.slice(0, -1), clock.now(), "click");
    // A slot (a column's cell) takes the new digit in place of its old one; the step keys then
    // move on to the next empty slot, as a child moves left along the sum (stepKeys.ts).
    if (gap !== undefined && (replace || isSlot(gap)))
      return set(active, ev.digit, ev.at, ev.source);
    const max =
      (gap?.kind === Family.Enter ? gap.max_length : undefined) ??
      (gap !== undefined && isDecimal(gap) ? MAX_DECIMAL : MAX_NUMBER);
    // A gap whose type fixes its length takes only keys that stay in its range (addendum 2.4: no 73 hours).
    if (now.length >= max || !takes(gap, now + ev.digit)) return;
    set(active, now + ev.digit, ev.at, ev.source);
  };
  // A decimal gap (dl-w3.70.7): the keypad grows a comma key, typed into the active gap when it
  // is a decimal one and holds no comma yet. A hardware comma or point types itself.
  // A fraction gap takes a hardware `/` as a move to its denominator (dl-w3.70.16).
  const decimalKeys =
    data.gaps.some(isDecimal) || data.gaps.some(isFraction)
      ? {
          signs: data.gaps.some(isDecimal) ? [DECIMAL_KEY] : [],
          signOf: (key: string) => (DECIMAL_SEPARATORS.includes(key) || key === "/" ? key : null),
          onSign: (sign: string, at: Instant, source: PressModality) => {
            if (
              typeof document !== "undefined" &&
              document.activeElement?.tagName === "INPUT" &&
              source === "keyboard"
            )
              return;
            const gap = data.gaps.find((g) => g.id === active);
            if (sign === "/") {
              if (isFraction(gap)) setBox("den");
              return;
            }
            if (
              active === null ||
              gap === undefined ||
              !isDecimal(gap) ||
              isGiven(active) ||
              chosenInUse
            )
              return;
            const now = valuesRef.current[active] ?? "";
            if (
              separatorCount(now) > 0 ||
              now.length >=
                ((gap.kind === Family.Enter ? gap.max_length : undefined) ?? MAX_DECIMAL)
            )
              return;
            set(active, now + sign, at, source);
          },
        }
      : undefined;
  // A text gap's slipped letters (addendum 3.6), until the gap is changed: the gap itself stays paper.
  const lettersOf = (id: string): ReadonlySet<number> =>
    missedLetters(missed(feedback) && !changed.has(id) ? feedback?.parts : undefined, id);
  const tone = (id: string): Tone => {
    const t = orMissing(
      praised(feedback) ? "green" : fieldTone(id, feedback, changed),
      id,
      missing,
    );
    return t === "amber" && lettersOf(id).size > 0 ? "idle" : t;
  };
  // The fields the step keys walk (stepKeys.ts), in fill order: every gap still open.
  const byId = new Map(data.gaps.map((g) => [g.id, g]));
  const keyFields: StepField[] = order.flatMap((id) => {
    const gap = byId.get(id);
    if (gap === undefined || isGiven(id)) return [];
    const text = gap.kind === Family.Enter && gap.input === "text";
    const maxLength =
      gap.kind === Family.Choose
        ? 1
        : (gap.max_length ?? (text ? MAX_TEXT : isDecimal(gap) ? MAX_DECIMAL : MAX_NUMBER));
    return [
      {
        id,
        kind: isSlot(gap) ? "slot" : "field",
        maxLength,
        value: values[id] ?? "",
        marked: tone(id) === "amber" || lettersOf(id).size > 0,
        ...(text ? { word: true, missedRun: missedRun(values[id] ?? "", lettersOf(id)) } : {}),
        ...(optionalGap(data, id) ? { optional: true } : {}),
        ...(gap.kind === Family.Enter && gap.range ? { range: gap.range } : {}),
      },
    ];
  });
  const keys: StepKeysInput = {
    fields: keyFields,
    clear: (id) => set(id, "", clock.now(), "keyboard"),
    select: (id) => {
      setSelected(id);
      // A fraction gap starts again at its first box, where the focus goes.
      if (id !== null && isFraction(byId.get(id))) setActive(id);
    },
    away: setAway,
  };
  // What every gap part reads (SlotGap.tsx).
  const play: GapPlay = {
    language,
    clock,
    live,
    values,
    given,
    praised: praised(feedback),
    helpFocus: help.focus,
    // While a chosen gap is in use no keypad gap is active, so only it has the focus border.
    active: chosenInUse ? null : active,
    box,
    selected,
    away,
    tone,
    letters: lettersOf,
    setActive: (id, at) => {
      // A tap on a keypad gap leaves the chosen gap that was in use after a miss.
      if (chosenInUse && menu === null) setSelected(null);
      setActive(id, at);
    },
    set,
    field: (id, el) => {
      if (el) fields.current.set(id, el);
      else fields.current.delete(id);
    },
    onTextFocus: (id) => polishGaps.includes(id) && setLettersFor(id),
    menu: live ? menu : null,
    setMenu,
  };

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-gaps"
      stem={<Stem say={spec.say} stem={data.stem} figure={data.figure} language={language} />}
      // The footer's Sprawdź is the one check, keypad or not (lesson frame rule 1, dl-uukj.29.26).
      action={{ ready: live && filled, press: check }}
      keys={keys}
      answer={
        <div
          data-keypad-gaps={numberGaps.length > 0 ? "" : undefined}
          className="flex flex-col gap-6"
        >
          <SlotsBody
            data={data}
            language={language}
            filled={(id) => (merged[id] ?? "").trim() !== ""}
            draw={(gap, n) => (
              <SlotGap gap={gap} label={gapName(data, language, gap, n)} play={play} />
            )}
          />
          {/* Checked too soon (addendum 3.3): one line 12 under the body, on every screen. */}
          <TooSoon reason={missing?.reason ?? null} language={language} className="-mt-3" />
          {lettersFor !== null && (
            // Flush under the line, so it reads as part of the gap it serves (dl-w3.68.30).
            <Tools kind="letters">
              <div className="-mt-4">
                <LetterRow
                  language={language}
                  clock={clock}
                  field={() => fields.current.get(lettersFor) ?? null}
                  text={values[lettersFor] ?? ""}
                  capitalStart={startsSentence(data.template, lettersFor)}
                  max={
                    lettersGap?.kind === Family.Enter
                      ? (lettersGap.max_length ?? MAX_TEXT)
                      : MAX_TEXT
                  }
                  locked={!live || isGiven(lettersFor)}
                  onInsert={(text, at, modality) => set(lettersFor, text, at, modality)}
                />
              </div>
            </Tools>
          )}
          {numberGaps.length > 0 && (
            <Tools kind="keypad">
              <Keypad
                language={language}
                clock={clock}
                signKeys={decimalKeys}
                onEvent={onKey}
                quiet={live && menu !== null}
              />
            </Tools>
          )}
        </div>
      }
    />
  );
}

export function SlotsView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) return <SlotsPlay {...props} />;
  const { shown, right } = answers(props);
  return (
    <SlotsStill
      data={props.spec.data}
      say={props.spec.say}
      language={props.language}
      shown={shown}
      right={right}
      paper={props.mode === ViewMode.Print}
    />
  );
}
