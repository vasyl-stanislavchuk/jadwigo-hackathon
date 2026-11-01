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
import { RichText } from "@jadwigo/lesson-kit";
import { Badge, Button, Card, CardContent, Heading } from "@jadwigo/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { ENDED_ICON, ENDED_WORD } from "./outcome.ts";
import { drawable, drawsRightBeside, Still } from "./Still.tsx";

/**
 * The review step.
 *
 * - `question`: the question as the review route returns it; the parent passes a
 *   `ParentReviewQuestion`, which extends it.
 * - `index`, `total`: its 0-based place in the list and the list's length, for the header.
 * - `language`: the reader's language.
 * - `category`: who reads it, `child` unless the parent's page says `adult`; every line and the
 *   family view read that register (dl-uukj.32 wave 2 step 0).
 * - `onPrev`, `onNext`: move to the neighbour; absent at either end, and then its arrow is not drawn.
 * - `onAll`: back to the whole list ("Wszystkie pytania").
 * - `badge`: how it went, in place of the child's badge (the child's icon and word); the parent's
 *   page passes its own outcome, in the parent's icon set.
 * - `children`: drawn under the solution block; the parent puts its tries there.
 */
export function ReviewStep({
  question,
  index,
  total,
  language,
  category = "child",
  onPrev,
  onNext,
  onAll,
  badge,
  children,
}: {
  question: ReviewQuestion;
  index: number;
  total: number;
  language: Language;
  category?: Category;
  onPrev?: () => void;
  onNext?: () => void;
  onAll: () => void;
  badge?: ReactNode;
  children?: ReactNode;
}): ReactElement {
  const { ended, answer, reveal } = question;
  const Icon = ENDED_ICON[ended];
  const right = ended === "correct";
  const drawn = drawable(question);
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
        <Button type="button" variant="outline" size="control" data-review-all onClick={onAll}>
          {copy(language, "review_all", {}, category)}
        </Button>
        <nav className="flex items-center gap-2">
          {onPrev !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="control"
              className="px-0"
              data-review-prev
              aria-label={copy(language, "review_prev", {}, category)}
              onClick={onPrev}
            >
              <ChevronLeft aria-hidden />
            </Button>
          )}
          <Heading level={2} data-review-title>
            {copy(language, "review_title", { n: index + 1, total }, category)}
          </Heading>
          {onNext !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="control"
              className="px-0"
              data-review-next
              aria-label={copy(language, "review_next", {}, category)}
              onClick={onNext}
            >
              <ChevronRight aria-hidden />
            </Button>
          )}
        </nav>
      </header>

      <p className="flex flex-wrap items-center gap-2">
        {badge ?? (
          <Badge variant="outline" data-review-ended>
            <Icon aria-hidden />
            {copy(language, ENDED_WORD[ended], {}, category)}
          </Badge>
        )}
        {question.added === "twin" && (
          <span data-review-twin className="text-jw-small">
            {copy(language, "play_results_twin", {}, category)}
          </span>
        )}
        {question.help_used > 0 && (
          <span data-review-help className="text-jw-small">
            {copy(language, "play_results_help", { n: question.help_used }, category)}
          </span>
        )}
      </p>

      {answer === null ? (
        <p data-review-no-answer>{copy(language, "review_no_answer", {}, category)}</p>
      ) : (
        drawn && (
          <div data-review-answer>
            <Still question={question} value={answer} language={language} category={category} />
          </div>
        )
      )}

      {/* The right answer once (dl-uukj.30.7): beside the answer when the view draws it there, else
          on its own, given no answer so the view never labels it as the child's. */}
      {!right && drawn && (answer === null || !drawsRightBeside(question)) && (
        <div data-review-solution className="flex flex-col gap-3">
          <p className="font-semibold">{copy(language, "review_right_answer", {}, category)}</p>
          <Still
            question={question}
            value={drawsRightBeside(question) ? null : question.solution}
            language={language}
            category={category}
          />
        </div>
      )}

      {lines.length > 0 && (
        // A speech bubble: the card with its top-left corner tucked in, toward the question.
        <Card size="compact" role="note" data-review-bubble className="rounded-tl-jw-small">
          <CardContent className="gap-2">
            {right && (
              <p className="font-semibold">{copy(language, "review_praise", {}, category)}</p>
            )}
            {lines.map((line) => (
              <p key={line} data-review-line>
                <RichText text={line} inline />
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {children}
    </section>
  );
}
