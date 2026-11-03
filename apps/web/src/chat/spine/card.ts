/**
 * The lesson card's state (handoff S7, S16, §2 item 7): ready, needs fixing, being changed, or
 * superseded. Read from the turn's own log, never from Jadwigo AI's words, so the card and the
 * preview agree. A lesson is ready only when its last check passed, nothing rewrote it after the
 * check, and the preview has a question to show: 0 showable steps is "fix", never "0 zadań"
 * (`dl-uukj.47.69`). Unchecked is "fix" too, the same caution as `readyOf` in lessonWiring.ts.
 */

import type { RunEvent } from "@jadwigo/contracts/run";
import { type ChatItem, foldRun } from "@jadwigo/core";
import { lessonFacts, positionOf } from "./lessonFile.ts";
import { checkOf } from "./lines.ts";
import type { LessonCardState, Words } from "./types.ts";

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

/** The verbs whose finished call means Jadwigo AI wrote the lesson for the parent to look at. */
const WRITES: ReadonlySet<string> = new Set(["lesson_draft", "lesson_edit"]);

/** What only the whole conversation knows about one turn's card. */
export interface CardContext {
  /** The newest turn holding the lesson's latest revision: only it has a living card (S7). */
  living?: boolean;
  /** A later turn is open, so Jadwigo is making the next version. */
  changing?: boolean;
  /**
   * A newer revision came after this card's, with no card of its own (a parent's patch in a later
   * turn): the lesson changed after its check, so the card is never ready.
   */
  stale?: boolean;
}

const LEVEL_WORDS: Readonly<Record<string, Words>> = {
  error: { copyKey: "chat_check_level_error", values: {} },
  warn: { copyKey: "chat_check_level_warning", values: {} },
};

/**
 * One turn's card, or null when the turn wrote no lesson (none, or only the parent's own edit).
 * Without `context` the turn is taken as the conversation's newest, as a lone turn is.
 */
export function cardStateOf(
  events: readonly RunEvent[],
  context: CardContext = {},
): LessonCardState | null {
  const view = foldRun(events);
  const tools = view.chat.flatMap((i) => (i.kind === "tool" && i.state === "done" ? [i] : []));
  if (view.lesson === null || !tools.some((t) => WRITES.has(t.verb))) return null;
  const file = view.lesson.lesson_file;
  const facts = lessonFacts(file);
  const base = { lessonId: facts.id, version: view.lesson.revision, title: facts.title };
  if (context.living === false) return { ...base, kind: "superseded" };
  if (view.turn_open || context.changing === true)
    return {
      ...base,
      kind: "working",
      nextVersion: view.lesson.revision + 1,
      count: facts.count,
      first: facts.first,
    };

  const check = tools.findLast((t) => t.verb === "lesson_check");
  const read = check === undefined ? null : checkOf(check.output);
  const rewritten =
    check === undefined || context.stale === true || rewroteAfter(events, tools, check);
  const findings =
    read === null || rewritten
      ? []
      : read.findings.flatMap((f) => {
          const step = f.step_id === null ? null : positionOf(file, f.step_id);
          const words = LEVEL_WORDS[f.level];
          return step === null || words === undefined ? [] : [{ step, words }];
        });
  if (read === null || rewritten || !read.publishable || facts.count === 0)
    return { ...base, kind: "fix", count: facts.count, findings };
  return { ...base, kind: "ready", count: facts.count, first: facts.first };
}

/**
 * Whether the lesson changed after its last check: the AI wrote it again, or a revision came that
 * no tool call made (a parent's patch steer, dl-z5ja.111).
 */
function rewroteAfter(
  events: readonly RunEvent[],
  tools: readonly ToolItem[],
  check: ToolItem,
): boolean {
  if (tools.some((t) => WRITES.has(t.verb) && t.seq > check.seq)) return true;
  const calls = new Set(tools.map((t) => t.call_id));
  return events.some(
    (e) => e.type === "lesson_revision" && e.seq > check.seq && !calls.has(e.payload.call_id),
  );
}

/**
 * Every turn's card, in turn order (S7): only the newest turn holding the latest revision is living
 * (the newest card when the latest revision is a parent's patch, which earns no card),
 * every earlier card is superseded, and a living card is "working" while a later turn is open.
 */
export function cardStatesOf(runs: readonly (readonly RunEvent[])[]): (LessonCardState | null)[] {
  const views = runs.map((events) => foldRun(events));
  const latest = Math.max(0, ...views.map((v) => v.lesson?.revision ?? 0));
  const alone = runs.map((events) => cardStateOf(events));
  // A later revision with no card (the parent's own patch) leaves the newest card living.
  const exact = alone.findLastIndex((card) => card !== null && card.version === latest);
  const living = exact === -1 ? alone.findLastIndex((card) => card !== null) : exact;
  const openAt = views.findLastIndex((v) => v.turn_open);
  return runs.map((events, i) =>
    alone[i] === null
      ? null
      : cardStateOf(events, {
          living: i === living,
          changing: openAt > i,
          stale: i === living && exact === -1,
        }),
  );
}
