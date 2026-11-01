/**
 * The lesson pane of `/playground/chat` (dl-z5ja.17): the latest `lesson_revision`, read with the
 * builder's `readDraft` and built with `lessonFileToSpecs` (the only two things this page takes
 * from `src/playground/lesson`), each question step drawn as the child would see it, in preview.
 * A step the kit cannot draw is a line saying so; the rest of the lesson still shows.
 */

import type { LessonPatch } from "@jadwigo/contracts/run";
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
import { type FormEvent, type ReactElement, useState } from "react";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft } from "../lesson/draft.ts";
import { wordsOf, wordsPatch } from "./patches.ts";
import { editSteer, wordsSteer } from "./steerText.ts";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-11-01T00:00:00.000Z" }) };

export function LessonPane({
  language,
  lesson,
  changed = new Set(),
  onUndo,
  onEdit,
}: {
  /** The parent's language, for the pane's own words. */
  language: Language;
  lesson: RunView["lesson"];
  /** The steps the last AI revision changed (`revisions.ts`), highlighted (dl-z5ja.30). */
  changed?: ReadonlySet<string>;
  /** Takes back the last AI revision; "Cofnij" shows only when it is given. */
  onUndo?: (() => void) | undefined;
  /**
   * Sends a parent's edit of one step, in the lesson's own language: their why for the AI, and
   * their own words for the step as a `patch` the runner applies with no model call (dl-z5ja.111).
   */
  onEdit?: ((text: string, question_ids: string[], patch?: LessonPatch) => void) | undefined;
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
        <Revision lesson={lesson} say={say} changed={changed} onUndo={onUndo} onEdit={onEdit} />
      )}
    </section>
  );
}

function Revision({
  lesson,
  say,
  changed,
  onUndo,
  onEdit,
}: {
  lesson: NonNullable<RunView["lesson"]>;
  say: (key: Parameters<typeof copy>[1], vars?: Record<string, string | number>) => string;
  changed: ReadonlySet<string>;
  onUndo: (() => void) | undefined;
  onEdit: ((text: string, question_ids: string[], patch?: LessonPatch) => void) | undefined;
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
        {changed.size > 0 && onUndo && (
          <button
            type="button"
            data-undo
            onClick={onUndo}
            className="ml-auto rounded-md border px-2 py-0.5 text-sm"
          >
            {say("chat_undo")}
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-4">
        {steps.map((step) =>
          step.kind === "question" ? (
            <li
              key={step.step_id}
              aria-label={say("chat_lesson_step", { step: step.step_id })}
              data-step={step.step_id}
              data-changed={changed.has(step.step_id) || undefined}
              className={
                changed.has(step.step_id)
                  ? "rounded-md border-2 border-primary p-3"
                  : "rounded-md border p-3"
              }
            >
              {changed.has(step.step_id) && <Changed say={say} />}
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
              {onEdit && (
                <StepEdit
                  step={step.step_id}
                  say={say}
                  words={wordsOf(lesson.lesson_file, step.step_id, lessonLanguage)}
                  steer={(why, words) => {
                    const id = step.step_id;
                    const patch = wordsPatch(lesson.lesson_file, id, lessonLanguage, words);
                    if (patch === null) {
                      onEdit(editSteer(lessonLanguage, id, why), [id]);
                      return false;
                    }
                    const text =
                      why === ""
                        ? wordsSteer(lessonLanguage, id)
                        : editSteer(lessonLanguage, id, why);
                    onEdit(text, [id], patch);
                    return true;
                  }}
                />
              )}
            </li>
          ) : (
            <li
              key={step.step_id}
              data-step={step.step_id}
              data-changed={changed.has(step.step_id) || undefined}
              className="text-muted-foreground text-sm"
            >
              {changed.has(step.step_id) && <Changed say={say} />}
              {say("chat_lesson_step_hidden", { step: step.step_id })}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

/** The mark on a step the last AI revision changed: words, not only a coloured edge. */
function Changed({ say }: { say: (key: Parameters<typeof copy>[1]) => string }): ReactElement {
  return (
    <p data-changed-mark className="text-primary mb-2 text-xs font-medium">
      {say("chat_revision_by_ai")}
    </p>
  );
}

/**
 * A parent's own edit of one step (dl-z5ja.30, .111): the step's words, which the parent may change
 * themselves and which land as a patch with no model call, and what to change and why, in their
 * words, which go to the AI as a steer naming the step. `steer` answers whether a patch went.
 */
function StepEdit({
  step,
  say,
  words: current,
  steer,
}: {
  step: string;
  say: (key: Parameters<typeof copy>[1]) => string;
  /** What the step says to the child now, in the lesson's language. */
  words: string;
  steer(why: string, words: string): boolean;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [words, setWords] = useState(current);
  const [sent, setSent] = useState<"ai" | "lesson" | null>(null);
  if (!open)
    return (
      <div className="mt-2 flex items-center gap-2 text-sm">
        <button
          type="button"
          data-edit-step={step}
          onClick={() => {
            setOpen(true);
            setWords(current);
            setSent(null);
          }}
          className="rounded-md border px-2 py-0.5"
        >
          {say("chat_edit_step")}
        </button>
        {sent === "ai" && <span data-edit-sent>{say("chat_edit_sent")}</span>}
        {sent === "lesson" && <span data-edit-sent="lesson">{say("chat_edit_saved")}</span>}
      </div>
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const reason = why.trim();
    const own = words.trim();
    const changed = own !== "" && own !== current.trim();
    if (reason === "" && !changed) return;
    const patched = steer(reason, changed ? own : current);
    setWhy("");
    setOpen(false);
    setSent(patched ? "lesson" : "ai");
  };
  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1">
        {say("chat_edit_words")}
        <textarea
          value={words}
          rows={2}
          className="rounded-md border px-2 py-1"
          onChange={(e) => setWords(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        {say("chat_edit_prompt")}
        <textarea
          value={why}
          rows={2}
          className="rounded-md border px-2 py-1"
          onChange={(e) => setWhy(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md border px-2 py-0.5">
          {say("chat_edit_send")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-0.5">
          {say("chat_edit_cancel")}
        </button>
      </div>
    </form>
  );
}
