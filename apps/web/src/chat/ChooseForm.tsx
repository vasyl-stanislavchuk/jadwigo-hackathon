/**
 * The choose form (dl-uukj.47.35; research §15.3, "a clarifying form that replaces the composer";
 * owner, 2026-11-02): when the open turn's approval carries `choose`, it takes the composer's place,
 * one question at a time. Options are buttons, the recommended one first and marked; keys 1 to 9
 * pick; the parent may answer in their own words when the question allows; "Pomiń pytanie" leaves
 * it unanswered. Once the last question is answered the thread keeps a one-line recap of each.
 *
 * The answer goes to `onAnswer`. No route resolves an approval yet: the workspace wires it once
 * dl-uukj.47.48 lands (lead, 2026-11-02, option c).
 */

import type { ChooseQuestion, ChooseForm as Form } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, cn, Input } from "@jadwigo/ui";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

/** One answer per question, in order: its words, or null when skipped. */
export type ChooseAnswers = readonly (string | null)[];

/** The recap lines of an answered form: "question · answer", or "question · pominięte". */
export function recapOf(form: Form, answers: ChooseAnswers, language: Language): string[] {
  return form.questions.map((q, i) => {
    const answer = answers[i] ?? null;
    return answer === null
      ? copy(language, "chat_choose_skipped", { question: q.text }, "adult")
      : copy(language, "chat_choose_recap", { question: q.text, answer }, "adult");
  });
}

function Question({
  question,
  language,
  onPick,
}: {
  question: ChooseQuestion;
  language: Language;
  onPick: (answer: string | null) => void;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const [own, setOwn] = useState("");
  const ownId = useId();
  const group = useRef<HTMLDivElement>(null);
  // Focus moves to the form when it takes the composer's place, and to each next question.
  useEffect(() => {
    group.current?.querySelector<HTMLButtonElement>("[data-option]")?.focus();
  }, []);
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement) return;
    const n = Number(e.key);
    const option = Number.isInteger(n) && n >= 1 ? question.options[n - 1] : undefined;
    if (option !== undefined) {
      e.preventDefault();
      onPick(option.label);
    }
  };
  const answerOwn = (e: FormEvent) => {
    e.preventDefault();
    const words = own.trim();
    if (words !== "") onPick(words);
  };
  return (
    // The number keys pick from anywhere in the form: a keyboard shortcut on its group.
    // biome-ignore lint/a11y/noStaticElementInteractions: the options inside are the buttons; the group only routes 1-9 to them
    <div ref={group} className="flex flex-col gap-2" onKeyDown={keys} data-choose-question>
      <p className="font-bold text-jw-ink">{question.text}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option, i) => (
          <Button
            key={option.label}
            variant="outline"
            size="sm"
            onClick={() => onPick(option.label)}
            className={cn(
              option.recommended === true &&
                "border-selected-edge bg-selected text-selected-foreground",
            )}
            data-option={i + 1}
            data-recommended={option.recommended === true}
          >
            <span aria-hidden className="text-jw-ink-soft tabular-nums">
              {i + 1}
            </span>
            {option.label}
            {option.recommended === true && (
              <span className="text-jw-page-small">{` · ${say("chat_choose_recommended")}`}</span>
            )}
          </Button>
        ))}
      </div>
      {question.custom_allowed && (
        <form onSubmit={answerOwn} className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-jw-page-body">
            <label htmlFor={ownId} className="text-muted-foreground">
              {say("chat_choose_own")}
            </label>
            <Input
              id={ownId}
              kind="text"
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              data-choose-own
            />
          </div>
          <Button type="submit" variant="outline" size="control" className="self-end">
            {say("chat_choose_answer")}
          </Button>
        </form>
      )}
      {question.skippable && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onPick(null)}
          data-choose-skip
        >
          {say("chat_choose_skip")}
        </Button>
      )}
    </div>
  );
}

export function ChooseForm({
  form,
  language,
  onAnswer,
}: {
  form: Form;
  language: Language;
  /** Every question answered or skipped, in order. */
  onAnswer: (answers: ChooseAnswers) => void;
}): ReactElement {
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const question = form.questions[answers.length];
  const pick = (answer: string | null) => {
    const next = [...answers, answer];
    if (next.length === form.questions.length) onAnswer(next);
    else setAnswers(next);
  };
  return (
    <section
      aria-label={question?.text ?? ""}
      className="flex flex-col gap-2 rounded-jw-control border-jw border-jw-line bg-jw-card p-3"
      data-choose
    >
      {question !== undefined && (
        <Question key={answers.length} question={question} language={language} onPick={pick} />
      )}
    </section>
  );
}
