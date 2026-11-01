/**
 * The lesson's end list as cards (dl-uukj.30.1): each question asked, in order, with its number,
 * what was asked, a soft icon and the kind word for how it ended, and whether it was a similar
 * question added on the way and how much help it took. A card opens that question's review step: a
 * chevron at its right edge says so on any screen, and hover or a press lifts it and turns its edge
 * the ink blue (dl-uukj.30.8).
 * Once the review has loaded, each card also draws the child's answer and, where it was not right,
 * the right answer beside it (dl-uukj.30.6, decision jadwigo-learner-experience
 * 2026-10-31-the-lesson-s-end-draws-each-answer-on-its-card-and-a-kind-summar). No score and no
 * count (decision 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended).
 */

import type { AttemptReview, PageAttemptResult, ReviewQuestion } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Card, CardContent, Link } from "@jadwigo/ui";
import { ChevronRight } from "lucide-react";
import type { ReactElement } from "react";
import { NavLink } from "../nav/NavLink.tsx";
import { ENDED_ICON, ENDED_INK, ENDED_WORD } from "./outcome.ts";
import { drawable, Still } from "./Still.tsx";

export function ReviewList({
  rows,
  review = null,
  language,
  linkOf,
}: {
  rows: readonly PageAttemptResult[];
  /** The finished attempt's questions again, when they have loaded: each card draws its answer. */
  review?: AttemptReview | null;
  language: Language;
  /** Where a card leads: its question's review step. */
  linkOf: (seq: number) => string;
}): ReactElement {
  const bySeq = new Map((review?.questions ?? []).map((q) => [q.seq, q]));
  return (
    <ol data-review-list className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const ended = row.ended ?? "open";
        const Icon = ENDED_ICON[ended];
        const question = bySeq.get(row.seq);
        return (
          <li
            key={row.seq}
            data-seq={row.seq}
            data-ended={ended}
            data-added={row.added}
            data-help-used={row.help_used}
          >
            {/* The card is one target: the link's box stretches over it (after:inset-0). */}
            <Card
              size="compact"
              className="relative transition-[transform,box-shadow] duration-150 has-[a:hover]:-translate-y-0.5 has-[a:hover]:ring-2 has-[a:hover]:ring-primary has-[a:hover]:shadow-md has-[a:active]:translate-y-0 has-[a:active]:scale-[0.99] has-[a:active]:ring-2 has-[a:active]:ring-primary has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary"
            >
              <CardContent className="flex-row items-start gap-4">
                <span data-review-number className="text-jw-instruction font-bold">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link asChild className="font-semibold no-underline after:absolute after:inset-0">
                    <NavLink href={linkOf(row.seq)} data-review-card>
                      {row.say}
                    </NavLink>
                  </Link>
                  <span className={`inline-flex items-center gap-2 font-bold ${ENDED_INK[ended]}`}>
                    <Icon
                      aria-hidden
                      className="size-4"
                      fill={ended === "correct" ? "currentColor" : "none"}
                    />
                    {copy(language, ENDED_WORD[ended])}
                  </span>
                  {row.added === "twin" && (
                    <span className="text-jw-small">{copy(language, "play_results_twin")}</span>
                  )}
                  {row.help_used > 0 && (
                    <span className="text-jw-small">
                      {copy(language, "play_results_help", { n: row.help_used })}
                    </span>
                  )}
                  {question !== undefined && <CardAnswer question={question} language={language} />}
                </div>
                {/* Always drawn, so a phone with no hover still shows the card opens something. */}
                <ChevronRight
                  aria-hidden
                  data-card-chevron
                  className="size-6 shrink-0 self-center text-primary"
                />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The child's answer on the card, drawn by the question's own family view in its solution mode:
 * where the answer was not right, the view itself shows the right one beside it (Enter's "Poprawna
 * odpowiedź", Choose's green option, Sequence's right order). With no answer, the right answer
 * alone, under its own label (the view draws "Poprawna odpowiedź" when there is no answer, never
 * "Twoja odpowiedź"). The card already says what was asked, so the view's own instruction line and
 * prompt card are hidden.
 */
function CardAnswer({
  question,
  language,
}: {
  question: ReviewQuestion;
  language: Language;
}): ReactElement | null {
  if (!drawable(question)) return null;
  return (
    <div
      data-card-answer
      className="flex flex-col gap-2 border-t border-jw-line pt-3 [&_[data-instruction]]:hidden [&_[data-prompt-card]]:hidden"
    >
      {question.answer === null && <p data-card-no-answer>{copy(language, "review_no_answer")}</p>}
      <Still
        question={question}
        value={question.answer}
        language={language}
        category="child"
        compact
      />
    </div>
  );
}
