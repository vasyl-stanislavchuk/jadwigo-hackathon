/**
 * Part: the solution card (Choose addendum 1.2, decision dl-n501, dl-uukj.29.86). After "Jeszcze
 * nie wiem" the step shows its right answer in place, the help note folds away, and this card
 * stands under the answer where the note was: every line of the step's worked solution, numbered.
 *
 * - The box: the prompt card's paper inside a 2 px line of text ink, r16, padding 16 20, gap 10,
 *   the solution look of an option (foundation.css `[data-solution]`) at card size.
 * - The head: the eye in the soft ink and "Rozwiązanie" (`worked_solution`, Slots addendum 6), 18 px
 *   bold.
 * - The lines: 18 px / 1.45 in ink, each number in a 28 px column in the soft ink.
 * - Yellow stays help and ink stays solution: the card never takes the help note's colours.
 *
 * The lines come with the solution (families/help.ts solutionLines): Khan's colour commands taken
 * off, and a hint's pictures only under a line that refers to them. StepShell draws the card on a
 * moved-on step and scrolls the least that shows it whole. A step with no worked lines has none.
 */

import { copy } from "@jadwigo/copy";
import type { ReactNode } from "react";
import { useLessonLang } from "../stage/lessonLanguage.ts";
import type { Language, PageSolutionLine } from "../stage/types.ts";
import { Picture } from "./Picture.tsx";
import { RichText } from "./RichText.tsx";
import { STATUS } from "./status.ts";

/**
 * `body`: the step's body filled in and printed (Slots addendum 6), for a step whose last worked
 * line is that body, as Khan's table is ("Tak wygląda uzupełniona tabela:" and the table). The
 * family draws it, the answers in ink and no field boxes, and the card puts it under the last
 * line's words, which the caller has cut to them.
 */
export function SolutionCard({
  language,
  lines,
  body = null,
}: {
  language: Language;
  lines: readonly PageSolutionLine[];
  body?: ReactNode | undefined;
}): JSX.Element | null {
  // The worked lines are the lesson's text; the card's heading stays the page's (dl-uukj.39).
  const lessonLang = useLessonLang();
  if (lines.length === 0) return null;
  // The eye is the moved-on row's icon in the state table (docs/17 §2f rule 3).
  const Eye = STATUS.moved_on.icon;
  return (
    <section
      data-solution-card
      aria-labelledby="kid-solution-card-head"
      className="kid-solution-card"
    >
      <p id="kid-solution-card-head" data-solution-card-head>
        {Eye !== null && Eye !== "spinner" && (
          <Eye aria-hidden="true" className="kid-solution-eye" />
        )}
        <span>{copy(language, "worked_solution")}</span>
      </p>
      <ol data-solution-lines>
        {lines.map((line, i) => (
          <li key={i} data-solution-step>
            <span data-solution-n aria-hidden="true">{`${i + 1}.`}</span>
            <div data-solution-text {...lessonLang}>
              <RichText text={line.text} />
              {line.pictures?.map((p, j) => (
                <Picture key={`${p.src}|${j}`} {...p} />
              ))}
              {i === lines.length - 1 && body !== null && <div data-solution-body>{body}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
