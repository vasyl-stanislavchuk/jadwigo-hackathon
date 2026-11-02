/**
 * The lesson on paper (handoff §5.6 "Wydrukuj", dl-z5ja.108.1.1; since dl-uukj.47.55 the lesson
 * card's Wydrukuj): the lesson's title and each question step in lesson-kit's print mode, which
 * shows no answer, numbered as the lesson column numbers them. It is drawn into the page's body and
 * seen only by the printer (LessonPrint.css, scoped to the body's `data-printing` while the sheet is
 * mounted), so printing needs no route of its own: `printLesson` asks the browser to print once the
 * sheet is in the page.
 */

import { type Category, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import {
  type Clock,
  FamilyView,
  type Instant,
  LessonTheme,
  pageSpec,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { type ReactElement, useEffect } from "react";
import { createPortal } from "react-dom";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft } from "../lesson/readDraft.ts";
import "./LessonPrint.css";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-11-01T00:00:00.000Z" }) };

/** The print sheet of `lesson`, or nothing while it does not read. */
export function LessonPrint({
  language,
  lesson,
}: {
  /** The parent's language, for a step the kit cannot draw. */
  language: Language;
  lesson: NonNullable<RunView["lesson"]>;
}): ReactElement | null {
  const read = readDraft(lesson.lesson_file);
  const reads = !("error" in read);
  // The print rule hides the page for the sheet only when there is a sheet: a lesson that does not
  // read prints the page as it is, never a blank one (steward, #747).
  useEffect(() => {
    if (!reads) return;
    document.body.setAttribute("data-printing", "");
    return () => document.body.removeAttribute("data-printing");
  }, [reads]);
  if ("error" in read) return null;
  const { file, skipped } = read;
  const lessonLanguage: Language = file.language === "en" ? "en" : "pl";
  const category: Category = file.category === "adult" ? "adult" : "child";
  const steps = lessonFileToSpecs(file, undefined, skipped).flatMap((p) => p.steps);
  return createPortal(
    <div data-print-sheet className="hidden print:block">
      <LessonTheme>
        <h1 className="mb-6 text-2xl font-bold">{file.title}</h1>
        <ol className="flex flex-col gap-8">
          {steps.map((step, i) => (
            <li key={step.step_id} data-print-step={step.step_id} className="break-inside-avoid">
              <p className="mb-2 font-bold tabular-nums">{i + 1}</p>
              {step.kind === "question" ? (
                <FamilyView
                  spec={pageSpec(step.spec) as never}
                  language={lessonLanguage}
                  category={category}
                  clock={clock}
                  mode={ViewMode.Print}
                />
              ) : (
                <p>{copy(language, "chat_lesson_step_hidden", { step: step.step_id }, "adult")}</p>
              )}
            </li>
          ))}
        </ol>
      </LessonTheme>
    </div>,
    document.body,
  );
}

/** Asks the browser to print, after the sheet has been drawn into the page. */
export function printLesson(print: () => void = () => window.print()): void {
  window.requestAnimationFrame(() => print());
}
