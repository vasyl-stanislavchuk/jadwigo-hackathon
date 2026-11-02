/**
 * What the lesson pane needs from a conversation's state (dl-z5ja.111, .138): the lesson shown,
 * the steps the last revision changed, Cofnij as a patch steer followed to its revision or its
 * refusal, what became of each patch steer, and a key that moves with each new revision. Lifted out
 * of ChatScreen's ChatView so the parent's lesson workspace (dl-z5ja.108) wires LessonPane the same
 * way.
 */

import { toolViewData } from "@jadwigo/contracts";
import type { RunView } from "@jadwigo/core";
import { useState } from "react";
import { type ConversationState, lessonOf, type Turn, turnsOf } from "./conversation.ts";
import { lessonFileToSpecs } from "./lesson/adapter.ts";
import { readDraft, titleOf } from "./lesson/readDraft.ts";
import { type LessonChange, type PatchOutcome, patchOutcome } from "./patches.ts";
import { changedOf, revertOf, undoOf } from "./revisions.ts";
import { undoSteer } from "./steerText.ts";

/** Which lesson the right pane draws, as a key that changes with each new revision of any turn. */
function lessonKey(turns: readonly Turn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (turn?.view.lesson) return `${turn.run.id}:${turn.view.lesson.revision}`;
  }
  return null;
}

/** The lesson's title in its own language and how many steps it has: the workspace's header and
 * footer read them. Empty and 0 before the first revision or while the draft does not read. */
export function lessonSummary(shown: RunView["lesson"]): { title: string; steps: number } {
  if (shown === null || shown === undefined) return { title: "", steps: 0 };
  const read = readDraft(shown.lesson_file);
  const title = titleOf(shown.lesson_file);
  if ("error" in read) return { title, steps: 0 };
  const steps = lessonFileToSpecs(read.file, undefined, read.skipped).flatMap((p) => p.steps);
  return { title, steps: steps.length };
}

/**
 * How many dashed rows say steps are still coming (handoff §3 "Ghost rows", dl-z5ja.108.1): while
 * the open turn's lesson_draft call runs, the count the model asked it for, else 1, since the page
 * knows a lesson is coming but not its size. lesson_draft writes the whole lesson in one revision,
 * so a draft that is not done yet has none of its steps shown. 0 at any other time.
 */
export function ghostsOf(turns: readonly Turn[]): number {
  const turn = turns[turns.length - 1];
  if (turn === undefined || !turn.view.turn_open) return 0;
  const draft = turn.view.chat.findLast(
    (item) => item.kind === "tool" && item.verb === "lesson_draft",
  );
  if (draft?.kind !== "tool" || (draft.state !== "pending" && draft.state !== "running")) return 0;
  const count = draft.input?.["count"];
  return typeof count === "number" && Number.isInteger(count) && count > 0 ? count : 1;
}

/**
 * Whether the lesson shown may be given (handoff §5.5, dl-z5ja.108.1.1): the latest lesson_check
 * said it is publishable, and nothing wrote the lesson after it, neither the AI (a lesson_draft or
 * lesson_edit done later) nor the parent (a patch steer, which writes a revision no tool call names).
 * False before any check. Conservative: when in doubt the lesson is checked again, never given unchecked.
 */
export function readyOf(turns: readonly Turn[]): boolean {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (!turn?.view.lesson) continue;
    const tools = turn.view.chat.flatMap((item) =>
      item.kind === "tool" && item.state === "done" ? [item] : [],
    );
    const check = tools.findLast((item) => item.verb === "lesson_check");
    if (check === undefined || check.view?.kind !== "lesson_check") return false;
    const data = toolViewData("lesson_check", check.view.data);
    if (data === null || !data.publishable) return false;
    const rewritten = tools.some(
      (item) =>
        (item.verb === "lesson_draft" || item.verb === "lesson_edit") && item.seq > check.seq,
    );
    const byParent =
      turn.writer !== undefined &&
      turn.writer !== null &&
      !tools.some((item) => item.call_id === turn.writer);
    return !rewritten && !byParent;
  }
  return false;
}

export function useLessonWiring(
  state: ConversationState,
  onEdit?: (text: string, question_ids: string[], change?: LessonChange) => unknown,
) {
  const turns = turnsOf(state);
  /** The last Cofnij's patch steer, followed to its revision or its refusal (dl-z5ja.111). */
  const [undoSent, setUndoSent] = useState<string | null>(null);
  /**
   * What became of a patch steer. Once the log holds the steer, the log says (a send that timed out
   * after the server wrote it still lands). Until then, a send that failed is refused, so Cofnij and
   * a step's editor stop waiting and hand the words back (dl-z5ja.111, .138).
   */
  const outcomeOf = (event_id: string): PatchOutcome => {
    const logged = state.runs.some((r) =>
      r.events.some((e) => e.type === "steer" && e.event_id === event_id),
    );
    if (!logged && state.failedSteers.includes(event_id)) return "refused";
    return patchOutcome(state.runs, event_id);
  };
  const shown = lessonOf(turns);
  const changed = changedOf(turns);
  const undo = undoOf(turns);
  const revert = revertOf(turns);
  /**
   * "Cofnij": a lesson_edit steer back to the revision before, carrying the patch that restores it,
   * which the runner applies with no model call (dl-z5ja.111). Where no patch can say it, the steer
   * asks the AI to take the change back in words (dl-z5ja.30, .42).
   */
  const onUndo =
    undo === null || onEdit === undefined
      ? undefined
      : () => {
          const text = undoSteer(undo.language, undo.question_ids, undo.revision);
          if (revert === null || shown === null) {
            onEdit(text, undo.question_ids);
            return;
          }
          // The revision Cofnij undoes from: the one the pane shows.
          const sent = onEdit(text, undo.question_ids, {
            patch: revert,
            base_revision: shown.revision,
          });
          setUndoSent(typeof sent === "string" ? sent : null);
        };
  return {
    turns,
    shown,
    changed,
    onUndo,
    undoRefused: undoSent !== null && outcomeOf(undoSent) === "refused",
    undoPending: undoSent !== null && outcomeOf(undoSent) === "pending",
    outcomeOf,
    key: lessonKey(turns),
    ghosts: ghostsOf(turns),
    ready: readyOf(turns),
  };
}
