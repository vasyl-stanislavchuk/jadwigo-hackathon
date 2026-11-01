/**
 * The Choose view (dl-w3.37.12): every Choose question type, from true or false to A to E and pick all
 * that apply, on the one ChoiceGroup part. An option is text with TeX, a number, yes or no, a dot
 * array, a picture or a row of pictures (dl-w3.25); a picture with its size keeps its box, so the
 * options never move as pictures arrive.
 *
 * Play (paper-behaviour README §3.3): a tap picks and Sprawdź checks; nothing checks by itself. A
 * tap on the picked option leaves it picked with one answer and switches it with several. On a
 * keyboard the options wear the badges 1 to 4 and those keys pick, the arrows move the pick, and
 * Enter checks; with nothing picked, Enter and Sprawdź take the focus to the first option and check
 * nothing. t1 is the first pick of the attempt. After a miss the tried option keeps its mark and its
 * "tried" word, and the band stays, until the learner picks another: then the old mark fades, the
 * band folds and Sprawdź is ready. With several options only the distractors picked are marked, and
 * a miss that was only a missed option marks the whole set (the marks rule). The focus comes back to
 * the pick after every check. A boost appears after the first miss and the worked solution once the
 * server releases it (ruling 56).
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useEffect, useRef, useState } from "react";
import {
  ChoiceGroup,
  type ChoiceItem,
  type ChoiceLayout,
  ChoiceStatic,
  focusOption,
  keepFocusThroughPress,
} from "../../parts/ChoiceGroup.tsx";
import { InlineTokens } from "../../parts/InlineTokens.tsx";
import { notationText } from "../../parts/notation.ts";
import { Picture } from "../../parts/Picture.tsx";
import { RichText } from "../../parts/RichText.tsx";
import { StepShell } from "../../parts/StepShell.tsx";
import { missed, partTone, praised, useChanged, wholeMark, wholeTone } from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { useScreensLang } from "../../stage/lessonLanguage.ts";
import { type PressModality, press } from "../../stage/press.ts";
import type { Language } from "../../stage/types.ts";
import type { Family } from "../names.ts";
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
import {
  type ChooseData,
  type ChooseOption,
  type ChooseValue,
  PICK,
  pinNoneLast,
  toggleMany,
} from "./model.ts";

type F = typeof Family.Choose;

function OptionContent({
  option,
  language,
}: {
  option: ChooseOption;
  language: Language;
}): JSX.Element {
  const c = option.content;
  // "yes", "no" and an array's size are the screens' words, under the lesson's lang (dl-uukj.41).
  const screensLang = useScreensLang(language);
  switch (c.kind) {
    case "text":
      // One element: the option's host stacks its content and its note in a column, so bare runs
      // ("has $2$ bunches") would each become a flex item on a line of their own (dl-a38n.27).
      return (
        <span>
          <RichText inline text={c.text} />
        </span>
      );
    case "number":
      return <span className="tabular-nums">{notationText(String(c.number), language)}</span>;
    case "bool":
      return <span {...screensLang}>{copy(language, c.bool ? "yes" : "no")}</span>;
    case "array":
      return (
        <span
          role="img"
          aria-label={copy(language, "dims", { rows: c.rows, cols: c.cols })}
          {...screensLang}
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${c.cols}, auto)` }}
        >
          {Array.from({ length: c.rows * c.cols }, (_, i) => (
            <span key={i} className="size-2 rounded-full bg-current" />
          ))}
        </span>
      );
    case "image":
      // With its size known the box is reserved before the picture loads, so nothing moves
      // under the finger; a picture with no size is drawn as it arrives.
      return c.width && c.height ? (
        <Picture src={c.image} alt={c.alt} width={c.width} height={c.height} labels={c.labels} />
      ) : (
        <img src={c.image} alt={c.alt} className="max-h-40 rounded-lg object-contain" />
      );
    case "pictures":
      return (
        <span className="flex flex-wrap items-center gap-2">
          {c.pictures.map((p, i) => (
            <Picture
              key={i}
              src={p.src}
              alt={p.alt}
              width={p.width}
              height={p.height}
              labels={p.labels}
            />
          ))}
        </span>
      );
    case "none":
      return <span>{copy(language, "none_of_these")}</span>;
  }
}

function items(
  props: { spec: ViewProps<F>["spec"]; language: Language },
  tone: (id: string) => ChoiceItem["tone"],
  note: (id: string) => string | undefined,
  /** The screens' lang for the notes and the solution label (useScreensLang), or none. */
  screensLang: { lang?: Language } = {},
): ChoiceItem[] {
  return pinNoneLast(props.spec.data.options).map((o) => ({
    id: o.id,
    letter: o.letter,
    array: o.content.kind === "array",
    pictures: o.content.kind === "image" || o.content.kind === "pictures",
    content: <OptionContent option={o} language={props.language} />,
    tone: tone(o.id),
    note: note(o.id),
    ...(screensLang.lang === undefined ? {} : { wordsLang: screensLang.lang }),
  }));
}

/**
 * The step's line with the pick in place (model.ts `line`, Slots addendum section 1): the comparison
 * over its bars, or the sentence with its one word to choose. The place keeps the widest option's
 * footprint, every option held unseen in it, so the line never moves when a tile is tapped. A line
 * that is only maths (a comparison) is drawn at the maths size, centred, as Enter's maths line is.
 */
function PickLine({
  data,
  picked,
  language,
  whole = false,
}: {
  data: ChooseData;
  picked: string | null;
  language: Language;
  whole?: boolean | undefined;
}): JSX.Element | null {
  if (data.line === undefined) return null;
  const option = data.options.find((o) => o.id === picked) ?? null;
  const maths = ONLY_MATHS.test(data.line.replace(`{${PICK}}`, ""));
  const slot = () => (
    // A right pick reads whole (dl-w3.68.2): the word in green ink, dotted underline, no box,
    // in the same footprint, so nothing moves.
    <span
      data-pick-slot={option?.id ?? ""}
      data-pick-right={whole && option !== null ? "" : undefined}
      className={cn(
        "relative inline-grid min-h-[var(--kid-tap-min)] min-w-[2.5ch] place-items-center rounded-lg border-2 px-2 align-middle",
        option === null
          ? "border-dashed border-border"
          : whole
            ? "border-transparent text-kid-correct-ink"
            : "border-border bg-card",
      )}
    >
      {data.options.map((o) => (
        <span
          key={o.id}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
        >
          <OptionContent option={o} language={language} />
        </span>
      ))}
      <span
        className={cn(
          "col-start-1 row-start-1 whitespace-nowrap",
          whole &&
            "underline decoration-kid-correct decoration-dotted decoration-2 underline-offset-8",
        )}
      >
        {option !== null ? <OptionContent option={option} language={language} /> : null}
      </span>
    </span>
  );
  return (
    <RichText
      text={data.line}
      slots={slot}
      slotIds={PICK_IDS}
      className={
        maths
          ? "text-center text-[length:var(--kid-math-size)] font-bold leading-[2.75]"
          : "text-[length:var(--kid-answer-size)] font-semibold leading-[2.75]"
      }
    />
  );
}
const PICK_IDS: ReadonlySet<string> = new Set([PICK]);
/** Nothing but TeX spans and spaces. */
const ONLY_MATHS = /^\s*(\$[^$]+\$\s*)+$/;

/** Inline (mark_numbers, dl-w3.61.2): the stem's text is the answer, so the stem above it keeps
 * only its pictures and figure, and the text is drawn once, with its tokens, as the answer. */
const isInline = (data: ChooseData): boolean => data.layout === "inline";
const stemAbove = (data: ChooseData): ChooseData["stem"] =>
  isInline(data) && data.stem
    ? { ...data.stem, text: undefined, text_replaces_say: undefined }
    : data.stem;
const optionText = (o: ChooseOption): string =>
  o.content.kind === "text"
    ? o.content.text
    : o.content.kind === "number"
      ? String(o.content.number)
      : o.id;

/** The options inert, with the learner's picks and the right ones marked. */
function ChooseStill({
  props,
  shown,
  right,
  paper,
  bare = false,
}: {
  props: ViewProps<F>;
  shown: ChooseValue | null;
  right: ChooseValue | null;
  paper: boolean;
  bare?: boolean | undefined;
}): JSX.Element {
  const { spec, language } = props;
  const screensLang = useScreensLang(language);
  const picked = (id: string) => shown?.chosen.includes(id) ?? false;
  const isRight = (id: string) => right?.chosen.includes(id) ?? false;
  return (
    <div className="kid-family-choose flex flex-col gap-6">
      {!bare && (
        <Stem
          say={spec.say}
          stem={stemAbove(spec.data)}
          language={language}
          paper={paper}
          line={
            spec.data.line !== undefined ? (
              <PickLine
                data={spec.data}
                picked={shown?.chosen[0] ?? right?.chosen[0] ?? null}
                language={language}
              />
            ) : undefined
          }
        />
      )}
      {isInline(spec.data) ? (
        <InlineTokens
          text={spec.data.stem?.text ?? ""}
          label={spec.say}
          tokens={spec.data.options.map((o) => ({
            id: o.id,
            label: optionText(o),
            tone:
              paper || right === null
                ? "idle"
                : isRight(o.id)
                  ? "green"
                  : picked(o.id)
                    ? "try_again"
                    : "idle",
          }))}
          chosen={shown?.chosen ?? []}
          words={spec.data.tokens === "words"}
          locked
        />
      ) : (
        <ChoiceStatic
          label={spec.say}
          layout={spec.data.layout as ChoiceLayout}
          chosen={shown?.chosen ?? []}
          paper={paper}
          // The solution after a miss keeps the badges the step wore (dl-uukj.29.86).
          numberKeys={bare && right !== null}
          items={
            // In a step that ended without a right answer the right option shows the
            // solution and the child's pick keeps its mark (lesson frame README §3).
            bare && right !== null
              ? items(
                  props,
                  (id) => (!isRight(id) && picked(id) ? "try_again" : "idle"),
                  () => undefined,
                  screensLang,
                ).map((i) =>
                  isRight(i.id) ? { ...i, solution: copy(language, "ds_solution_label") } : i,
                )
              : items(
                  props,
                  (id) =>
                    right === null
                      ? "idle"
                      : isRight(id)
                        ? "green"
                        : picked(id)
                          ? "try_again"
                          : "idle",
                  (id) =>
                    right !== null && isRight(id)
                      ? copy(language, "answer_right")
                      : picked(id) && right !== null
                        ? copy(language, "answer_yours")
                        : undefined,
                  screensLang,
                )
          }
        />
      )}
    </div>
  );
}

function ChoosePlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const screensLang = useScreensLang(language);
  const data = spec.data;
  const [chosen, setChosen] = useState<string[]>(() => props.initialValue?.chosen ?? []);
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const area = useRef<HTMLDivElement>(null);
  // The option last picked or switched: the focus comes back to it after a check, even one made
  // by a click on Sprawdź (§3.3).
  const lastPick = useRef<string | null>(null);
  // A step drawn with its verdict already in (a review, a restore) takes no focus: only a verdict
  // that arrives does, once the step is live again after it.
  const opened = useRef(feedback);
  useEffect(() => {
    if (!live || feedback === null || feedback === opened.current) return;
    const back =
      lastPick.current !== null && chosen.includes(lastPick.current) ? lastPick.current : chosen[0];
    if (back !== undefined) focusOption(area.current, back);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, live]);
  // A new attempt keeps the picks (the miss rule) and re-arms t1.
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);
  // The help ladder (families/help.ts): rung 1 outlines options, rung 2 takes distractors away.
  // A taken option stays in its place and is unpicked, so nothing moves under the finger.
  const { focus, given } = helpIn(
    props,
    spec.data.options.map((o) => o.id),
  );
  const removed = new Set((given as { removed?: string[] } | null)?.removed ?? []);
  const removedKey = [...removed].sort().join(",");
  useEffect(() => {
    if (removedKey === "") return;
    const gone = new Set(removedKey.split(","));
    setChosen((c) => (c.some((id) => gone.has(id)) ? c.filter((id) => !gone.has(id)) : c));
  }, [removedKey]);

  // The same stem in play and in the solution, so the options under it never move (addendum 4).
  const stem = (
    <div className="flex flex-col gap-4">
      <Stem
        say={spec.say}
        stem={stemAbove(data)}
        language={language}
        line={
          data.line !== undefined ? (
            <PickLine
              data={data}
              picked={chosen[0] ?? null}
              language={language}
              whole={praised(feedback)}
            />
          ) : undefined
        }
      />
      {data.select === "many" && !isInline(data) && (
        <p className="text-lg" {...screensLang}>
          {copy(language, "choose_all")}
        </p>
      )}
    </div>
  );
  // The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f rule 2).
  if (showingSolution(props))
    return (
      <StepShell
        {...shellOf(props)}
        className="kid-family-choose"
        moveOn={null}
        stem={stem}
        answer={
          <ChooseStill props={props} shown={{ chosen }} right={props.solution} paper={false} bare />
        }
        action={null}
      />
    );

  const toggle = (id: string, at: Instant, modality: PressModality) => {
    if (!live || removed.has(id)) return;
    lastPick.current = id;
    onset.current ??= { at, modality };
    if (data.select === "one") {
      // The picked one stays picked, and changes nothing (§3.3).
      if (chosen[0] === id) return;
      // The pick moves: the old pick's mark goes with it.
      if (chosen[0] !== undefined) change(chosen[0]);
      change(id);
      setChosen([id]);
      return;
    }
    change(id);
    setChosen((c) => toggleMany(data.options, c, id));
  };
  const check = press(clock, (at, modality) => {
    if (!live) return;
    if (modality === "click") keepFocusThroughPress();
    // Nothing picked: the focus goes to the first option, and nothing is checked or said (§3.3).
    if (chosen.length === 0) return void focusOption(area.current);
    onCommit({
      value: { chosen },
      t1: onset.current?.at ?? at,
      modality: onset.current?.modality ?? modality,
    });
  });
  const tone = (id: string) =>
    praised(feedback) ? (chosen.includes(id) ? "green" : "idle") : partTone(id, feedback, changed);
  const tried = (id: string) =>
    missed(feedback) && !changed.has(id) && feedback?.parts?.some((p) => p.id === id && !p.correct)
      ? copy(language, "tried_option")
      : undefined;
  const whole = data.select === "many" ? wholeTone(feedback, changed) : "idle";

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-choose"
      edited={changed.size > 0}
      stem={stem}
      answer={
        <div ref={area} {...wholeMark(whole)}>
          {isInline(data) ? (
            <InlineTokens
              text={data.stem?.text ?? ""}
              label={spec.say}
              tokens={data.options.map((o) => ({
                id: o.id,
                label: optionText(o),
                tone: tone(o.id),
                focus: focus.has(o.id),
                removed: removed.has(o.id),
              }))}
              chosen={chosen}
              words={data.tokens === "words"}
              locked={!live}
              clock={clock}
              onToggle={toggle}
            />
          ) : (
            <ChoiceGroup
              label={spec.say}
              items={items(props, tone, tried, screensLang).map((i) => ({
                ...i,
                focus: focus.has(i.id),
                removed: removed.has(i.id),
              }))}
              select={data.select}
              layout={data.layout as ChoiceLayout}
              chosen={chosen}
              locked={!live}
              clock={clock}
              onToggle={toggle}
              numberKeys
            />
          )}
        </div>
      }
      action={{ ready: live && chosen.length > 0, press: check }}
      hint={attemptNo > 1 ? (data.boost ?? null) : null}
    />
  );
}

export function ChooseView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) return <ChoosePlay {...props} />;
  const { shown, right } = answers(props);
  return (
    <ChooseStill props={props} shown={shown} right={right} paper={props.mode === ViewMode.Print} />
  );
}
