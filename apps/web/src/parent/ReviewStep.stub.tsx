/**
 * A STUB of the child-web lane's `src/review/ReviewStep.tsx` (dl-uukj.30.1), with its agreed props,
 * so the attempt page builds before that lane pushes. It draws only the title, the say line, the
 * three moves and the children. Deleted once the real step is merged in (wave plan
 * docs/worklog/dl-uukj.30/2026-10-29-wave-1.md).
 */

import type { ReviewQuestion } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import type { ReactElement, ReactNode } from "react";

export function ReviewStep(props: {
  question: ReviewQuestion;
  index: number;
  total: number;
  language: Language;
  onPrev?: () => void;
  onNext?: () => void;
  onAll: () => void;
  children?: ReactNode;
}): ReactElement {
  const { question, index, total, language, onPrev, onNext, onAll, children } = props;
  return (
    <section data-review-step={question.seq} className="flex w-full flex-col gap-4">
      <h2 className="text-2xl font-semibold">
        {copy(language, "review_title", { n: index + 1, total })}
      </h2>
      <p>{question.say}</p>
      {children}
      <nav className="flex gap-3">
        {onPrev && (
          <Button type="button" variant="outline" onClick={onPrev} data-review-prev>
            {copy(language, "review_prev")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onAll} data-review-all>
          {copy(language, "review_all")}
        </Button>
        {onNext && (
          <Button type="button" variant="outline" onClick={onNext} data-review-next>
            {copy(language, "review_next")}
          </Button>
        )}
      </nav>
    </section>
  );
}
