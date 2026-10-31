/**
 * A finished question drawn again, read-only (epic `dl-uukj.30`): the question's own family view in
 * its solution mode, given a value (the child's answer or the right one), which marks each part. The
 * review step draws it full size; a card on the lesson's end list draws it compact (`dl-uukj.30.6`).
 */

import type { ReviewQuestion } from "@jadwigo/contracts";
import type { Category, Language } from "@jadwigo/copy";
import {
  FamilyView,
  LessonTheme,
  type PageFamilySpec,
  stillClock,
  ViewMode,
} from "@jadwigo/lesson-kit";
import type { ReactElement } from "react";
import { withMedia } from "../media.ts";

/**
 * The page's half of the question, as the family view takes it: never a key. The player's open
 * question has the same four fields, so PlayScreen draws its question from here too.
 */
export function specOf(
  question: Pick<ReviewQuestion, "seq" | "say" | "question_type" | "question">,
): PageFamilySpec {
  return {
    id: `q${question.seq}`,
    say: question.say,
    question_type: question.question_type,
    family: question.question.family,
    // A picture ref becomes its media URL before the kit sees a src (src/media.ts).
    data: withMedia(question.question.data),
  } as PageFamilySpec;
}

/** Whether a question has a value to draw again: an explain question is never asked in v0 (decision
 * 2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i). */
export function drawable(question: Pick<ReviewQuestion, "question">): boolean {
  return question.question.family !== "explain";
}

/**
 * - `value`: what to draw in the question: the child's answer or the solution.
 * - `compact`: smaller, for a card on the end list.
 */
export function Still({
  question,
  value,
  language,
  category,
  compact = false,
}: {
  question: ReviewQuestion;
  value: unknown;
  language: Language;
  category: Category;
  compact?: boolean;
}): ReactElement {
  return (
    <div className={compact ? "min-w-0 text-jw-small" : "min-w-0"}>
      <LessonTheme>
        <FamilyView
          mode={ViewMode.Solution}
          spec={specOf(question) as never}
          language={language}
          category={category}
          // A still view has no timing to measure: the pinned clock draws it the same every time.
          clock={stillClock}
          value={value as never}
          solution={question.solution as never}
        />
      </LessonTheme>
    </div>
  );
}
