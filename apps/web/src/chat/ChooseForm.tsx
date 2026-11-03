/**
 * The choose form (dl-uukj.47.35; research §15.3, "a clarifying form that replaces the composer";
 * owner, 2026-11-02): when the open turn's approval carries `choose`, it takes the composer's place,
 * one question at a time. Its look is the chat handoff's (dl-uukj.47.71 §4.5, s10): "Jadwigo pyta",
 * the question, option cards 40 tall (48 on a phone) with their key number and a muted "polecane",
 * the own-words field, and a ghost "Pomiń pytanie". Keys 1 to 9 pick; Esc skips a question that may
 * be skipped; Enter in the field answers in the parent's own words. Once the last question is answered the thread keeps a one-line recap of each.
 *
 * The answer goes to `onAnswer`. No route resolves an approval yet: the workspace wires it once
 * dl-uukj.47.48 lands (lead, 2026-11-02, option c).
 */

import type { ChooseQuestion, ChooseForm as Form } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Input } from "@jadwigo/ui";
import { UserIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
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
  const group = useRef<HTMLDivElement>(null);
  // Focus moves to the form when it takes the composer's place, and to each next question.
  useEffect(() => {
    group.current?.querySelector<HTMLButtonElement>("[data-option]")?.focus();
  }, []);
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    // Esc skips a question that may be skipped (§9), and is then not the turn's Stop.
    if (e.key === "Escape" && question.skippable) {
      e.preventDefault();
      onPick(null);
      return;
    }
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
    // biome-ignore lint/a11y/noStaticElementInteractions: the options inside are the buttons; the group only routes 1-9 and Esc to them
    <div ref={group} className="flex flex-col gap-2" onKeyDown={keys} data-choose-question>
      <p className="text-jw-page-body font-semibold text-jw-ink">{question.text}</p>
      {/* Option cards (DS Radio Cards' look): a press answers at once, so each is a button. */}
      <div role="group" aria-label={question.text} className="flex flex-col gap-1.5">
        {question.options.map((option, i) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onPick(option.label)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-jw-control border border-input bg-background px-3 text-left text-jw-page-body text-jw-ink transition-colors duration-jw-fast hover:bg-muted max-sm:min-h-12"
            data-option={i + 1}
            data-recommended={option.recommended === true}
          >
            <span
              aria-hidden
              className="inline-grid size-5 shrink-0 place-items-center rounded-jw-small border border-input text-jw-page-small text-jw-ink-soft tabular-nums"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{option.label}</span>
            {option.recommended === true && (
              <span className="shrink-0 text-jw-page-small text-muted-foreground">
                <span className="sr-only">{" · "}</span>
                {say("choose_recommended")}
              </span>
            )}
          </button>
        ))}
      </div>
      {question.custom_allowed && (
        // Enter answers in the parent's own words.
        <form onSubmit={answerOwn}>
          <Input
            kind="text"
            value={own}
            aria-label={say("choose_own")}
            placeholder={say("choose_own")}
            onChange={(e) => setOwn(e.target.value)}
            className="max-sm:min-h-12"
            data-choose-own
          />
        </form>
      )}
      {question.skippable && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => onPick(null)}
          data-choose-skip
        >
          {say("choose_skip")}
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
      className="flex flex-col gap-2 rounded-jw-box border-jw border-jw-line bg-background p-4"
      data-choose
    >
      <p className="flex items-center gap-1.5 text-jw-page-small text-muted-foreground">
        <UserIcon aria-hidden className="size-3.5" />
        {copy(language, "choose_label", {}, "adult")}
      </p>
      {question !== undefined && (
        <Question key={answers.length} question={question} language={language} onPick={pick} />
      )}
    </section>
  );
}
