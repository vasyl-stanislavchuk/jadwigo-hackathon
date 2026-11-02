/**
 * "Lekcja gotowa" (dl-uukj.47.58; handoff moment 6, docs/worklog/dl-z5ja/2026-11-01-ux-handoff-
 * homework-to-lesson.md): under a turn that wrote the lesson, one card a parent reads in 2 seconds:
 * the title, how many questions, which version, and what the child sees first. Every fact is read
 * from the turn's own lesson revision, never from Jadwigo AI's words, so the card and the lesson
 * column never disagree. A click opens the lesson beside the chat.
 *
 * Its foot is left for the lesson's actions (Daj lekcję, Zapisz na później, Wydrukuj), which
 * dl-uukj.47.55 adds.
 */

import { copy, type Language } from "@jadwigo/copy";
import type { ChatItem, RunView } from "@jadwigo/core";
import { BookOpenIcon, ChevronRightIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft, titleOf } from "../lesson/readDraft.ts";
import type { ObjectRef } from "./ref.ts";

type LessonAt = NonNullable<RunView["lesson"]>;

/** What the card says about one revision of the lesson. */
export interface LessonFacts {
  title: string;
  revision: number;
  /** How many question steps the lesson holds. */
  steps: number;
  /** The first question's words, or null when the lesson has none that read. */
  first: string | null;
}

/** The card's facts from a revision's lesson file: empty counts while the draft does not read. */
export function lessonFacts(lesson: LessonAt): LessonFacts {
  const title = titleOf(lesson.lesson_file);
  const read = readDraft(lesson.lesson_file);
  if ("error" in read) return { title, revision: lesson.revision, steps: 0, first: null };
  const questions = lessonFileToSpecs(read.file, undefined, read.skipped)
    .flatMap((p) => p.steps)
    .flatMap((s) => (s.kind === "question" ? [s] : []));
  const say = questions.find((q) => q.spec.say.trim() !== "")?.spec.say.trim() ?? null;
  return { title, revision: lesson.revision, steps: questions.length, first: say };
}

/** The verbs whose finished call means the turn wrote the lesson for the parent to look at. */
const WROTE: ReadonlySet<string> = new Set(["lesson_draft", "lesson_edit"]);

/**
 * Whether a finished turn earns the card: it holds a lesson revision that Jadwigo AI's lesson_draft
 * or lesson_edit wrote. A turn that only carried the parent's own edit from the column has none.
 */
export function wroteLesson(view: RunView): boolean {
  return (
    view.lesson !== null &&
    view.chat.some(
      (item: ChatItem) => item.kind === "tool" && WROTE.has(item.verb) && item.state === "done",
    )
  );
}

export function LessonCard({
  lesson,
  object,
  language,
  onOpen,
  actions,
}: {
  lesson: LessonAt;
  /** The lesson as a thing to open: its conversation. */
  object: ObjectRef;
  language: Language;
  onOpen: (object: ObjectRef) => void;
  /** The lesson's actions under the card (dl-uukj.47.55); nothing yet. */
  actions?: ReactNode;
}): ReactElement {
  const say = (key: Parameters<typeof copy>[1], vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const facts = lessonFacts(lesson);
  const title = facts.title === "" ? say("parent_new_lesson") : facts.title;
  return (
    <section
      aria-label={say("chat_lesson_card")}
      className="flex flex-col rounded-jw-small border-jw border-jw-line bg-jw-card"
      data-object-card="lesson"
      data-revision={facts.revision}
    >
      <button
        type="button"
        onClick={() => onOpen(object)}
        aria-label={say("chat_lesson_card_open_named", { title })}
        className="group flex w-full items-start gap-3 rounded-jw-small p-3 text-left hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
        data-open-object={`${object.kind}:${object.id}`}
      >
        <BookOpenIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-jw-ink-soft" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-jw-page-small text-jw-ink-soft">{say("chat_lesson_card")}</span>
          <span className="truncate font-bold text-jw-ink" data-card-title>
            {title}
          </span>
          <span className="text-jw-page-small text-jw-ink-soft" data-card-facts>
            {say("chat_lesson_card_steps", { n: facts.steps })}
            {" · "}
            {say("chat_lesson_revision", { n: facts.revision })}
          </span>
          {facts.first !== null && (
            <span className="truncate text-jw-page-small text-jw-ink" data-card-first>
              {say("chat_lesson_card_first", { say: facts.first })}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 self-center text-jw-page-small font-bold text-jw-ink">
          {say("chat_lesson_card_open")}
          <ChevronRightIcon
            aria-hidden
            className="size-4 transition-transform duration-jw-fast group-hover:translate-x-0.5"
          />
        </span>
      </button>
      {actions !== undefined && (
        <div
          className="flex flex-wrap gap-2 border-t-jw border-jw-line px-3 py-2"
          data-card-actions
        >
          {actions}
        </div>
      )}
    </section>
  );
}
