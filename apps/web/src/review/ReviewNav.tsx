/**
 * The child's review navigator (dl-uukj.30.8), after Classtime's session sidebar: every question of
 * the finished lesson, with its number and its outcome icon, the open one marked, and a tap jumps to
 * another. On a wide screen it is a list beside the question with each question's prompt; on a phone
 * a row of numbered tiles above it that scrolls sideways, never a menu behind a button. It is a way
 * round the questions, not a score: no count and no percentage (decision jadwigo-learner-experience
 * 2026-11-01-end-list-cards-show-an-arrow-and-a-pressed-state-and-the-review).
 */

import type { ReviewQuestion } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useRef } from "react";
import { ENDED_ICON, ENDED_INK, ENDED_WORD } from "./outcome.ts";

/** The tile's edge and paper, by how the question ended: the kid green, the soft miss colour. */
const TILE: Record<ReviewQuestion["ended"], string> = {
  correct: "border-kid-correct bg-kid-correct-soft",
  missed: "border-kid-try-again bg-kid-try-again-soft",
  skipped: "border-kid-try-again bg-kid-try-again-soft",
};

export function ReviewNav({
  questions,
  seq,
  language,
  onOpen,
}: {
  questions: readonly ReviewQuestion[];
  /** The open question's seq. */
  seq: number;
  language: Language;
  onOpen: (seq: number) => void;
}): ReactElement {
  const current = useRef<HTMLButtonElement>(null);
  // On a phone the open question's tile scrolls into the row's view; nothing else moves.
  useEffect(() => {
    current.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [seq]);
  return (
    <nav
      data-review-nav
      aria-label={copy(language, "play_results_title")}
      className="w-full md:sticky md:top-6 md:w-64 md:shrink-0"
    >
      <ol className="flex gap-2 overflow-x-auto px-6 pt-4 pb-2 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pt-6">
        {questions.map((q, i) => {
          const Icon = ENDED_ICON[q.ended];
          const open = q.seq === seq;
          const word = copy(language, ENDED_WORD[q.ended]);
          return (
            <li key={q.seq} data-seq={q.seq} data-ended={q.ended} className="shrink-0">
              <button
                ref={open ? current : undefined}
                type="button"
                data-review-nav-item
                aria-current={open ? "step" : undefined}
                aria-label={`${i + 1}. ${q.say} ${word}`}
                onClick={() => onOpen(q.seq)}
                className={[
                  // A phone: a round tile, the number with its icon, the outcome's colours.
                  "flex min-h-kid-tap min-w-kid-tap items-center justify-center gap-1 rounded-full border-2 px-3 font-bold",
                  TILE[q.ended],
                  // A wide screen: a row, the icon in the outcome's ink, then the prompt.
                  "md:w-full md:justify-start md:gap-3 md:rounded-jw-small md:px-3 md:py-2 md:text-left",
                  // The open one: ringed on a phone; on a wide screen a muted row on the ink-blue edge.
                  open
                    ? "ring-3 ring-primary ring-offset-2 md:border-primary md:bg-muted md:ring-0 md:ring-offset-0"
                    : "md:border-transparent md:bg-transparent md:hover:bg-muted",
                ].join(" ")}
              >
                <Icon
                  aria-hidden
                  className={`size-4 shrink-0 ${ENDED_INK[q.ended]}`}
                  fill={q.ended === "correct" ? "currentColor" : "none"}
                />
                <span>{i + 1}</span>
                <span className="hidden min-w-0 truncate font-normal md:block">{q.say}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
