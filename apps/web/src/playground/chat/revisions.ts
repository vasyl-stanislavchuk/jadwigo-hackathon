/**
 * Which steps an AI revision changed (dl-z5ja.30): the lesson the pane drew before against the one
 * it draws now, step by step id. The highlight and "Cofnij" read it. Pure, on the opaque lesson
 * file the fold keeps (`RunView.lesson.lesson_file`), so a reload diffs against nothing and
 * highlights nothing rather than guessing.
 */

import type { Turn } from "./conversation.ts";
import { lessonOf } from "./conversation.ts";
import { editView } from "./widgets/parse.ts";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Each step of a lesson file by its id, as JSON text: what one step's sameness is judged on. */
function stepsById(file: unknown): Map<string, string> {
  const steps = new Map<string, string>();
  const script = isFields(file) ? file["script"] : undefined;
  const parts = isFields(script) && Array.isArray(script["parts"]) ? script["parts"] : [];
  for (const part of parts) {
    const list = isFields(part) && Array.isArray(part["steps"]) ? part["steps"] : [];
    for (const step of list)
      if (isFields(step) && typeof step["id"] === "string")
        steps.set(step["id"], JSON.stringify(step));
  }
  return steps;
}

/** The ids of the steps `next` adds or changes against `previous`; none when there is no previous. */
export function changedSteps(previous: unknown, next: unknown): ReadonlySet<string> {
  if (previous === null || previous === undefined) return new Set();
  const before = stepsById(previous);
  const changed = new Set<string>();
  for (const [id, step] of stepsById(next)) if (before.get(id) !== step) changed.add(id);
  return changed;
}

/**
 * The steps the latest revision changed (dl-z5ja.30). When the turn's last call that wrote the
 * lesson is a finished lesson_edit with a view, its `changed_step_ids` say so (dl-z5ja.69), an
 * empty list for a no-op edit. Otherwise the lesson is diffed against the revision before it in
 * the turn (`RunView.previous_lesson`, dl-z5ja.68), else the turn before's lesson. Both come from
 * the log, so a reload marks what the live page marked.
 */
export function changedOf(turns: readonly Turn[]): ReadonlySet<string> {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const view = turns[i]?.view;
    if (!view?.lesson) continue;
    const writer = view.chat.findLast(
      (item) =>
        item.kind === "tool" &&
        item.state === "done" &&
        (item.verb === "lesson_edit" || item.verb === "lesson_draft"),
    );
    if (
      writer?.kind === "tool" &&
      writer.verb === "lesson_edit" &&
      writer.view?.kind === "lesson_edit"
    ) {
      const edit = editView(writer.view.data);
      if (edit !== null) return new Set(edit.changed_step_ids);
    }
    const before = view.previous_lesson ?? lessonOf(turns.slice(0, i));
    return changedSteps(before?.lesson_file ?? null, view.lesson.lesson_file);
  }
  return new Set();
}

/** What "Cofnij" takes back: the steps the latest revision changed, and the revision before it. */
export interface Undo {
  revision: number;
  question_ids: string[];
  /** The lesson's own language, which the undo steer is written in. */
  language: "pl" | "en";
}

/**
 * The one step "Cofnij" undoes (dl-z5ja.30): back to the revision before the latest, for the steps
 * it changed. Null when there is nothing before it or nothing changed.
 */
export function undoOf(turns: readonly Turn[]): Undo | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const view = turns[i]?.view;
    if (!view?.lesson) continue;
    const before = view.previous_lesson ?? lessonOf(turns.slice(0, i));
    const changed = [...changedOf(turns)];
    if (before === null || changed.length === 0) return null;
    return {
      revision: before.revision,
      question_ids: changed,
      language: view.lesson.lesson_file["language"] === "en" ? "en" : "pl",
    };
  }
  return null;
}
