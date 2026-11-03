/**
 * "Lekcja gotowa" (dl-uukj.47.58; handoff moment 6, docs/worklog/dl-z5ja/2026-11-01-ux-handoff-
 * homework-to-lesson.md): under a turn that wrote the lesson, one card a parent reads in 2 seconds:
 * the title, how many questions, which version, and what the child sees first. Every fact is read
 * from the turn's own lesson revision, never from Jadwigo AI's words, so the card and the lesson
 * preview never disagree. Its expand button opens the lesson in a preview over the chat
 * (dl-1eieq.1), and its foot holds the lesson's actions: Daj lekcję, Drukuj, Zapisz na później.
 */

import { copy, type Language } from "@jadwigo/copy";
import type { ChatItem, RunView } from "@jadwigo/core";
import { BookOpenIcon, Maximize2Icon } from "lucide-react";
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
  /** The lesson's actions under the card (dl-uukj.47.55, dl-1eieq.1). */
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
      <div className="flex w-full items-start gap-3 p-3">
        <BookOpenIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-jw-ink-soft" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
        </div>
        {/* The one way into the lesson (decision 2026-11-03-the-lesson-opens-in-a-preview-modal-
            from-an-expand-button-on-the): the preview opens over the chat, never beside it. */}
        <button
          type="button"
          onClick={() => onOpen(object)}
          aria-label={say("chat_lesson_card_open_named", { title })}
          className="flex shrink-0 items-center gap-1.5 rounded-jw-small px-2 py-1 text-jw-page-small font-bold text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
          data-open-object={`${object.kind}:${object.id}`}
          data-expand
        >
          <Maximize2Icon aria-hidden className="size-4" />
          {say("chat_lesson_card_open")}
        </button>
      </div>
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
