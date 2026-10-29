/**
 * One question of a finished lesson, opened again (epic `dl-uukj.30`): the child's from the end
 * list, the parent's from the attempt's page, which puts its tries under it. The answer given is
 * drawn by the question's own family view in its solution mode, which marks each part; where the
 * answer was not right, the same view shows the right answer directly under it, never behind a
 * tap. What the key reveals (why, the worked lines) follows in a speech bubble. No score, no count
 * and never a bare "wrong" (decision jadwigo-learner-experience
 * 2026-10-29-at-a-lesson-s-end-the-child-can-open-any-question-on-the-list-an).
 */

import type { ReviewQuestion } from "@jadwigo/contracts";
import { type Category, copy, type Language } from "@jadwigo/copy";
import {
  type Clock,
  FamilyView,
  type Instant,
  LessonTheme,
  type PageFamilySpec,
  RichText,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { Button } from "@jadwigo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { ENDED_ICON, ENDED_WORD } from "./ended.ts";

const CATEGORY: Category = "child";

/** A still view has no timing to measure; a pinned clock keeps it the same on every draw. */
const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-29T00:00:00.000Z" }) };

/** The page's half of the question, as the family view takes it: never a key. */
function specOf(question: ReviewQuestion): PageFamilySpec {
  return {
    id: `q${question.seq}`,
    say: question.say,
    question_type: question.question_type,
    family: question.question.family,
    data: question.question.data,
  } as PageFamilySpec;
}

function Still({
  question,
  value,
  language,
}: {
  question: ReviewQuestion;
  value: unknown;
  language: Language;
}): ReactElement {
  return (
    <div className="kid-step min-w-0">
      <LessonTheme>
        <FamilyView
          mode={ViewMode.Solution}
          spec={specOf(question) as never}
          language={language}
          category={CATEGORY}
          clock={clock}
          value={value as never}
          solution={question.solution as never}
        />
      </LessonTheme>
    </div>
  );
}

/**
 * The review step.
 *
 * - `question`: the question as the review route returns it; the parent passes a
 *   `ParentReviewQuestion`, which extends it.
 * - `index`, `total`: its 0-based place in the list and the list's length, for the header.
 * - `language`: the child's language.
 * - `onPrev`, `onNext`: move to the neighbour; absent at either end, and then its arrow is not drawn.
 * - `onAll`: back to the whole list ("Wszystkie pytania").
 * - `children`: drawn under the solution block; the parent puts its tries there.
 */
export function ReviewStep({
  question,
  index,
  total,
  language,
  onPrev,
  onNext,
  onAll,
  children,
}: {
  question: ReviewQuestion;
  index: number;
  total: number;
  language: Language;
  onPrev?: () => void;
  onNext?: () => void;
  onAll: () => void;
  children?: ReactNode;
}): ReactElement {
  const { ended, answer, reveal } = question;
  const Icon = ENDED_ICON[ended];
  const right = ended === "correct";
  // An explain question is never asked in v0, and has no value to draw again (decision
  // 2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i).
  const drawn = question.question.family !== "explain";
  const lines = [
    ...(reveal.why === undefined ? [] : [reveal.why]),
    ...(reveal.worked_solution ?? []),
  ];
  return (
    <section
      data-review-step
      data-seq={question.seq}
      data-ended={ended}
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" data-review-all onClick={onAll}>
          {copy(language, "review_all")}
        </Button>
        <nav className="flex items-center gap-2">
          {onPrev !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-review-prev
              aria-label={copy(language, "review_prev")}
              onClick={onPrev}
            >
              <ChevronLeft aria-hidden />
            </Button>
          )}
          <h2 data-review-title className="text-xl font-semibold">
            {copy(language, "review_title", { n: index + 1, total })}
          </h2>
          {onNext !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-review-next
              aria-label={copy(language, "review_next")}
              onClick={onNext}
            >
              <ChevronRight aria-hidden />
            </Button>
          )}
        </nav>
      </header>

      <p className="flex flex-wrap items-center gap-2">
        <span
          data-review-ended
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold"
        >
          <Icon aria-hidden className="size-4" />
          {copy(language, ENDED_WORD[ended])}
        </span>
        {question.added === "twin" && (
          <span data-review-twin className="text-sm">
            {copy(language, "play_results_twin")}
          </span>
        )}
        {question.help_used > 0 && (
          <span data-review-help className="text-sm">
            {copy(language, "play_results_help", { n: question.help_used })}
          </span>
        )}
      </p>

      {answer === null ? (
        <p data-review-no-answer>{copy(language, "review_no_answer")}</p>
      ) : (
        drawn && (
          <div data-review-answer>
            <Still question={question} value={answer} language={language} />
          </div>
        )
      )}

      {!right && drawn && (
        <div data-review-solution className="flex flex-col gap-3">
          <p className="font-semibold">{copy(language, "review_right_answer")}</p>
          <Still question={question} value={question.solution} language={language} />
        </div>
      )}

      {lines.length > 0 && (
        <aside
          data-review-bubble
          className="flex flex-col gap-2 rounded-2xl rounded-tl-sm border bg-card p-4"
        >
          {right && <p className="font-semibold">{copy(language, "review_praise")}</p>}
          {lines.map((line) => (
            <p key={line} data-review-line>
              <RichText text={line} inline />
            </p>
          ))}
        </aside>
      )}

      {children}
    </section>
  );
}
