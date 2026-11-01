/**
 * The lesson pane of `/playground/chat` (dl-z5ja.17): the latest `lesson_revision`, read with the
 * builder's `readDraft` and built with `lessonFileToSpecs` (the only two things this page takes
 * from `src/playground/lesson`), each question step drawn as the child would see it, in preview.
 * A step the kit cannot draw is a line saying so; the rest of the lesson still shows.
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
import type { ReactElement } from "react";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft } from "../lesson/draft.ts";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-11-01T00:00:00.000Z" }) };

export function LessonPane({
  language,
  lesson,
}: {
  /** The parent's language, for the pane's own words. */
  language: Language;
  lesson: RunView["lesson"];
}): ReactElement {
  const say = (key: Parameters<typeof copy>[1], vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  return (
    <section aria-label={say("chat_lesson_title")} className="flex min-h-0 flex-col gap-4">
      <h2 className="text-base font-medium">{say("chat_lesson_title")}</h2>
      {lesson === null ? (
        <p data-row="lesson-empty" className="text-muted-foreground">
          {say("chat_lesson_empty")}
        </p>
      ) : (
        <Revision lesson={lesson} say={say} />
      )}
    </section>
  );
}

function Revision({
  lesson,
  say,
}: {
  lesson: NonNullable<RunView["lesson"]>;
  say: (key: Parameters<typeof copy>[1], vars?: Record<string, string | number>) => string;
}): ReactElement {
  const read = readDraft(lesson.lesson_file);
  if ("error" in read)
    return (
      <p role="alert" data-revision={lesson.revision} className="text-muted-foreground">
        {say("chat_lesson_unreadable")}
      </p>
    );
  const { file, skipped } = read;
  const lessonLanguage: Language = file.language === "en" ? "en" : "pl";
  const category: Category = file.category === "adult" ? "adult" : "child";
  const steps = lessonFileToSpecs(file, undefined, skipped).flatMap((p) => p.steps);
  return (
    <div data-revision={lesson.revision} className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-baseline gap-2">
        <h3 className="text-lg font-medium">{file.title}</h3>
        <span className="text-muted-foreground text-xs">
          {say("chat_lesson_revision", { n: lesson.revision })}
        </span>
      </div>
      <ol className="flex flex-col gap-4">
        {steps.map((step) =>
          step.kind === "question" ? (
            <li
              key={step.step_id}
              aria-label={say("chat_lesson_step", { step: step.step_id })}
              data-step={step.step_id}
              className="rounded-md border p-3"
            >
              <LessonTheme>
                <FamilyView
                  spec={pageSpec(step.spec) as never}
                  language={lessonLanguage}
                  category={category}
                  clock={clock}
                  mode={ViewMode.Preview}
                  answerKey={step.spec.key as never}
                  showKey={false}
                />
              </LessonTheme>
            </li>
          ) : (
            <li
              key={step.step_id}
              data-step={step.step_id}
              className="text-muted-foreground text-sm"
            >
              {say("chat_lesson_step_hidden", { step: step.step_id })}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
