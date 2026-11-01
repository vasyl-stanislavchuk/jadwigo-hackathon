/**
 * The child's review at /play/<assignment>/review/<seq> (dl-uukj.30.1): the review step for that
 * question, with the arrows to its neighbours and "Wszystkie pytania" back to the end list, and the
 * navigator of every question beside it on a wide screen, above it on a phone (dl-uukj.30.8,
 * ReviewNav.tsx). A seq the attempt has no question at goes back to the list.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Button, Spinner } from "@jadwigo/ui";
import { type ReactElement, useEffect } from "react";
import { Column } from "../play/KidPage.tsx";
import type { Review } from "../play/usePlayer.ts";
import { ReviewNav } from "./ReviewNav.tsx";
import { ReviewStep } from "./ReviewStep.tsx";

export function ChildReview({
  load,
  seq,
  language,
  onOpen,
  onAll,
}: {
  load: Review;
  seq: number;
  language: Language;
  /** Open another question's step, by its seq. */
  onOpen: (seq: number) => void;
  /** Back to the end list; `replace` when the step was never there to go back to. */
  onAll: (options?: { replace: boolean }) => void;
}): ReactElement | null {
  const questions = load.kind === "ready" ? load.review.questions : [];
  const index = questions.findIndex((q) => q.seq === seq);
  const missing = load.kind === "ready" && index === -1;
  useEffect(() => {
    if (missing) onAll({ replace: true });
  }, [missing, onAll]);

  if (load.kind === "loading") {
    return (
      <Column>
        <Spinner label={copy(language, "loading")} />
      </Column>
    );
  }
  if (load.kind === "failed") {
    return (
      <Column>
        <p data-failed>{copy(language, "load_failed")}</p>
        <Button
          type="button"
          variant="outline"
          size="control"
          data-review-all
          onClick={() => onAll()}
        >
          {copy(language, "review_all")}
        </Button>
      </Column>
    );
  }
  const question = questions[index];
  if (question === undefined) return null;
  const prev = questions[index - 1];
  const next = questions[index + 1];
  return (
    <div
      data-child-review
      className="mx-auto flex w-full max-w-5xl flex-col md:flex-row md:items-start md:gap-4 md:px-6"
    >
      <ReviewNav questions={questions} seq={question.seq} language={language} onOpen={onOpen} />
      <div className="min-w-0 flex-1">
        <ReviewStep
          key={question.seq}
          question={question}
          index={index}
          total={questions.length}
          language={language}
          {...(prev === undefined ? {} : { onPrev: () => onOpen(prev.seq) })}
          {...(next === undefined ? {} : { onNext: () => onOpen(next.seq) })}
          onAll={() => onAll()}
        />
      </div>
    </div>
  );
}
