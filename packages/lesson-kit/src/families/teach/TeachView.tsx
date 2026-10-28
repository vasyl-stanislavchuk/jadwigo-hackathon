/**
 * The teaching step's view (teach/model.ts): the frame with the step's words and pictures, nothing to
 * answer, and Dalej in the footer (dl-uukj.29.39).
 */

import { type LessonProgress, StepShell } from "../../parts/StepShell.tsx";
import type { Clock, Instant } from "../../stage/clock.ts";
import { press } from "../../stage/press.ts";
import type { Category, Language } from "../../stage/types.ts";
import { Stem } from "../Stem.tsx";
import type { TeachStep } from "./model.ts";

interface TeachViewProps {
  step: TeachStep;
  language: Language;
  category: Category;
  clock: Clock;
  live: boolean;
  onNext(at: Instant, modality: "click" | "keyboard"): void;
  /** In a lesson: the top bar's step bar. */
  progress?: LessonProgress | null | undefined;
}

export function TeachView({
  step,
  language,
  category,
  clock,
  live,
  onNext,
  progress = null,
}: TeachViewProps): JSX.Element {
  // A line said and shown the same is drawn once, in the card (dl-uukj.29.45).
  const teach =
    step.teach.text?.trim() === step.say.trim()
      ? { ...step.teach, text_replaces_say: true }
      : step.teach;
  return (
    <StepShell
      className="kid-teach"
      language={language}
      category={category}
      feedback={null}
      stem={<Stem say={step.say} stem={teach} language={language} />}
      answer={null}
      action={null}
      next={{ press: press(clock, (at, modality) => live && onNext(at, modality)) }}
      progress={progress}
    />
  );
}
