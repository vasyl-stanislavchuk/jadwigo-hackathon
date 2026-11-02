/**
 * A lesson-building turn's plan (dl-hin8.19, lead's option (a) of 2026-11-02): the workflow's 3
 * stages, find questions · draft the lesson · check it, as one `plan` event the chat draws as a
 * checklist (dl-uukj.47.31). The model names no plan of its own, so the runner writes the
 * workflow's: when the turn's first tool call is `question_search` or `lesson_draft`, it is building
 * a lesson; any other first call (an edit, a read, a learner verb) is a short turn and has none.
 * Each stage then moves pending → in_progress → done or failed as its verb's `tool_call` and
 * `tool_result` land, and every move is a whole new `plan` event, which the fold keeps the last of.
 *
 * The 3 lines are what the parent reads, in the run's language, in the nominal voice of the chat's
 * tool lines. They live here beside the engine's other lines it writes itself (files.ts), since
 * this package imports no copy. Pure: the runner appends what these answer.
 */

import type { Language } from "@jadwigo/contracts";
import type { PlanEntry, PlanStatus, RunEvent, VerbName } from "@jadwigo/contracts/run";

/** The 3 stages in order, in each language the engine writes. */
const STAGES: Readonly<Record<Language, readonly [string, string, string]>> = {
  pl: ["Szukanie zadań w banku", "Układanie lekcji", "Sprawdzanie lekcji"],
  en: ["Finding questions in the bank", "Drafting the lesson", "Checking the lesson"],
};

/** Which stage a verb works on; a verb outside the 3 moves nothing. */
const STAGE_OF: Partial<Record<VerbName, 0 | 1 | 2>> = {
  question_search: 0,
  lesson_draft: 1,
  lesson_check: 2,
};

/** The verbs a lesson-building turn starts with. */
const STARTS: ReadonlySet<VerbName> = new Set(["question_search", "lesson_draft"]);

/** The run's plan as it stands in `log`: the last `plan` event's entries, or null before one. */
export function planIn(log: readonly RunEvent[]): PlanEntry[] | null {
  const last = log.findLast((e) => e.type === "plan");
  return last?.type === "plan" ? last.payload.entries.map((e) => ({ ...e })) : null;
}

/**
 * The plan a turn starts with, all pending, or null: only when this is the turn's first batch of
 * tool calls (no `tool_call` in `log` yet, no plan yet) and its first call starts a lesson.
 */
export function startPlan(
  log: readonly RunEvent[],
  firstVerb: VerbName | undefined,
  language: Language,
): PlanEntry[] | null {
  if (firstVerb === undefined || !STARTS.has(firstVerb)) return null;
  if (planIn(log) !== null || log.some((e) => e.type === "tool_call")) return null;
  return STAGES[language].map((text) => ({ text, status: "pending" }));
}

/**
 * `entries` with `verb`'s stage moved to `status`, or null when nothing changes (no plan, a verb
 * outside the 3, the stage already there). A draft drawn before any search searched the bank
 * itself (lesson_draft draws its questions from it), so the search stage is done by then.
 */
export function movePlan(
  entries: readonly PlanEntry[] | null,
  verb: VerbName,
  status: PlanStatus,
): PlanEntry[] | null {
  const stage = STAGE_OF[verb];
  if (entries === null || stage === undefined) return null;
  const next = entries.map((e) => ({ ...e }));
  const at = next[stage];
  if (at === undefined) return null;
  at.status = status;
  const search = next[0];
  if (stage === 1 && search !== undefined && search.status === "pending") search.status = "done";
  const same = next.every((e, i) => e.status === entries[i]?.status);
  return same ? null : next;
}
