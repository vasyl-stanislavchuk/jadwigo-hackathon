/**
 * The Explain view (dl-w3.37.14, built for the playground in dl-w3.51.11): the learner explains a
 * reason in their own words. Typed today; voice is the tutor's and strictly additive, so this field
 * stays whatever the step's `input` says. Check commits the text exactly as typed.
 *
 * The tutor judges it against criteria written before the task; code only records the judgement.
 * The learner never sees the criteria, and there is no solution to show. The soft minimum
 * (model.ts): an empty field is incomplete, a short one gets one gentle ask for more, and the next
 * press commits as written. After a miss the text stays to add to; each criterion's mark is a dot
 * under the field (green met, amber not yet), with no words from the key, and the dots clear on
 * the first change. A miss that marked nothing turns the field amber instead.
 *
 * Review lists the criteria with their marks, for a parent. A preview shows them only when asked.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useEffect, useRef, useState } from "react";
import { RichText } from "../../parts/RichText.tsx";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import {
  missed,
  partTone,
  praised,
  TONE_CLASS,
  type Tone,
  useChanged,
  wholeTone,
} from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import { missingText } from "../complete.ts";
import type { Family } from "../names.ts";
import { Stem } from "../Stem.tsx";
import { type PlayProps, shellOf, ViewMode, type ViewProps } from "../view.ts";
import type { Criterion } from "./model.ts";
import { isShort } from "./model.ts";

type F = typeof Family.Explain;

const FIELD =
  "min-h-40 w-full rounded-xl border-2 p-4 text-[length:var(--kid-answer-size)] leading-relaxed";
const NONE = new Set<string>();

/** One dot per criterion: a mark without its words (the key never reaches the page). */
function Pieces({
  ids,
  tone,
  label,
}: {
  ids: string[];
  tone(id: string): Tone;
  label: string;
}): JSX.Element {
  return (
    <ul aria-label={label} data-pieces className="flex gap-3">
      {ids.map((id) => {
        const t = tone(id);
        return (
          <li
            key={id}
            data-part={id}
            data-tone={t}
            className={cn(
              "size-5 rounded-full border-2",
              t === "idle" ? "border-border" : TONE_CLASS[t],
            )}
          />
        );
      })}
    </ul>
  );
}

function ExplainPlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const [text, setText] = useState(() => props.initialValue?.text ?? "");
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const asked = useRef(false);
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingText(props.initialValue?.text ?? "");
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    onset.current = null;
    asked.current = false;
  }, [attemptNo]);
  const short = isShort(spec.data, text);
  const tone: Tone = orMissing(
    praised(feedback) ? "green" : wholeTone(feedback, changed),
    null,
    missing,
  );
  const marked =
    feedback !== null && missed(feedback) && "parts" in feedback
      ? (feedback.parts ?? []).map((p) => p.id)
      : [];
  const check = press(clock, (at, modality) => {
    if (!live) return;
    const gap = missingText(text);
    if (gap !== null) return flag(gap);
    // The soft minimum: one ask for a little more, then the learner's word stands.
    if (short && !asked.current) {
      asked.current = true;
      return flag({ reason: "explain_more", parts: [] });
    }
    onCommit({
      value: { text },
      t1: onset.current?.at ?? at,
      modality: onset.current?.modality ?? modality,
    });
  });
  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-explain"
      incomplete={missing?.reason ?? null}
      stem={
        <div className="flex flex-col gap-4">
          <Stem say={spec.say} stem={spec.data.stem} language={language} />
          {spec.data.prompt && <RichText text={spec.data.prompt} className="text-lg" />}
        </div>
      }
      action={{ ready: live && text.trim() !== "" && !short, press: check }}
      answer={
        <div className="flex flex-col gap-3">
          <textarea
            aria-label={copy(language, "explain_field")}
            data-tone={tone}
            className={cn(FIELD, tone === "idle" ? "border-border" : TONE_CLASS[tone])}
            value={text}
            readOnly={!live}
            rows={4}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              onset.current ??= { at: clock.now(), modality: "keyboard" };
              change("text");
              clear();
              setText(e.target.value);
            }}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-lg">{copy(language, "explain_hint")}</p>
            {marked.length > 0 && (
              <Pieces
                ids={marked}
                tone={(id) => (changed.size > 0 ? "idle" : partTone(id, feedback, NONE))}
                label={copy(language, "explain_pieces")}
              />
            )}
          </div>
        </div>
      }
    />
  );
}

/** The criteria with a mark each, for a parent's review or an author's preview. */
function CriteriaList({
  criteria,
  parts,
}: {
  criteria: Criterion[];
  parts: { id: string; correct: boolean }[] | null;
}): JSX.Element {
  return (
    <ol data-criteria className="flex flex-col gap-2 text-base">
      {criteria.map((c) => {
        const part = parts?.find((p) => p.id === c.id) ?? null;
        const tone: Tone = part === null ? "idle" : part.correct ? "green" : "amber";
        return (
          <li
            key={c.id}
            data-part={c.id}
            data-tone={tone}
            className={cn(
              "flex items-start gap-3 rounded-lg border-2 px-3 py-2",
              tone === "idle" ? "border-border" : TONE_CLASS[tone],
            )}
          >
            <span className="flex flex-col">
              <span>{c.text}</span>
              <span className="text-muted-foreground text-xs">{c.cite}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ExplainView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) return <ExplainPlay {...props} />;
  const text =
    props.mode === ViewMode.Review || props.mode === ViewMode.Solution
      ? (props.value?.text ?? "")
      : "";
  const criteria =
    props.mode === ViewMode.Review
      ? props.answerKey.criteria
      : props.mode === ViewMode.Preview && props.showKey
        ? (props.answerKey?.criteria ?? null)
        : null;
  const parts = props.mode === ViewMode.Review ? props.verdict.parts : null;
  return (
    <div className="kid-family-explain flex flex-col gap-6">
      <Stem
        say={props.spec.say}
        stem={props.spec.data.stem}
        language={props.language}
        paper={props.mode === ViewMode.Print}
      />
      {props.spec.data.prompt && <RichText text={props.spec.data.prompt} className="text-lg" />}
      <div className={cn(FIELD, "border-border whitespace-pre-wrap")} data-explain-text>
        {text}
      </div>
      {criteria && <CriteriaList criteria={criteria} parts={parts} />}
    </div>
  );
}
