import {
  type Assignment,
  type AttemptAnswer,
  type AttemptQuestion,
  type AttemptSnapshot,
  type LessonQuestion,
  type PageAttemptQuestion,
  type PageFamilyQuestion,
  type PagePlannedQuestion,
  pageEnded,
  type ReleasedHelp,
  type Reveal,
  type Verdict,
  verdictsHeld,
} from "@jadwigo/contracts";
import { lastMissOf, NO_MISS, release, rungFor } from "@jadwigo/core";
import type { AttemptRecord, LessonVersionWithQuestions } from "@jadwigo/store";
import { lessonQuestion } from "./course.ts";

type Rung = Parameters<typeof release>[1];

/**
 * The rungs a question's ladder has written, in order. `help_released` counts the rungs released,
 * so the n-th one released is the n-th written: a rung the author did not write is skipped.
 */
export function rungsWritten(question: LessonQuestion): Rung[] {
  const out: Rung[] = [];
  for (let r = rungFor(question, 0, true); r !== null; r = rungFor(question, r, true)) out.push(r);
  return out;
}

/** A stored try's verdict, as core reads it. */
export function verdictOf(answer: AttemptAnswer): Verdict {
  return {
    correct: answer.correct === true,
    mistake_class: answer.mistake_class,
    parts: answer.parts ?? [],
  };
}

/** The rungs released so far, each as it was released: after the last miss made before it. */
export function releasedHelp(
  question: LessonQuestion,
  asked: AttemptQuestion,
  answers: readonly AttemptAnswer[],
): ReleasedHelp[] {
  return rungsWritten(question)
    .slice(0, asked.help_released)
    .map((rung, k) => {
      const miss = answers.findLast(
        (a) => a.kind === "try" && a.correct === false && a.help_used <= k,
      );
      return release(question, rung, miss ? lastMissOf(question, verdictOf(miss)) : NO_MISS);
    });
}

/** The page's half of a lesson question: its family and data, never its key. */
export function pageFamilyQuestion(question: LessonQuestion): PageFamilyQuestion {
  return { family: question.family, data: question.data } as PageFamilyQuestion;
}

export function pageQuestion(
  version: LessonVersionWithQuestions,
  asked: AttemptQuestion,
  answers: readonly AttemptAnswer[],
  held: boolean,
): PageAttemptQuestion {
  const question = lessonQuestion(version, asked.lesson_question_id);
  const own = answers.filter((a) => a.seq === asked.seq);
  return {
    seq: asked.seq,
    lesson_question_id: asked.lesson_question_id,
    question_type: question.question_type,
    say: question.say,
    question: pageFamilyQuestion(question),
    added: asked.added,
    placed: asked.placed,
    added_for: asked.added_for,
    help_released: asked.help_released,
    help: releasedHelp(question, asked, own),
    tries: own.length,
    ended: pageEnded(asked.ended, held),
    asked_at: asked.asked_at,
  };
}

/**
 * The version's planned questions in `position` order (the store's order), read from the version the attempt started
 * on, so start, reload and resume give the page the same plan. Explain questions stay off: v0 never
 * asks one (decision 2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i),
 * and a bar counting one would never reach the end.
 */
function planOf(version: LessonVersionWithQuestions): PagePlannedQuestion[] {
  return version.questions
    .filter((v) => v.role === "planned" && v.question.family !== "explain")
    .map((v) => ({
      position: v.position,
      lesson_question_id: v.lesson_question_id,
      question_type: v.question.question_type,
      say: v.question.say,
      question: pageFamilyQuestion(v.question),
    }));
}

/** `GET /api/v1/attempts/{id}`: the plan and everything asked so far, the open question last. */
export function snapshot(
  assignment: Pick<Assignment, "hold_verdicts">,
  version: LessonVersionWithQuestions,
  record: AttemptRecord,
): AttemptSnapshot {
  const held = verdictsHeld(assignment, record.attempt);
  const open = record.questions.find((q) => q.ended === null);
  return {
    attempt: record.attempt,
    plan: planOf(version),
    questions: record.questions.map((q) => pageQuestion(version, q, record.answers, held)),
    open_seq: record.attempt.status === "finished" ? null : (open?.seq ?? null),
    last_event_id: record.answers.at(-1)?.event_id ?? null,
  };
}

/** What a right try reveals from the key, once it can no longer give the answer away. */
export function revealOf(question: LessonQuestion): Reveal {
  const key = question.key as { why?: unknown; worked_solution?: unknown };
  const reveal: Reveal = {};
  if (typeof key.why === "string") reveal.why = key.why;
  if (Array.isArray(key.worked_solution)) reveal.worked_solution = key.worked_solution.map(String);
  return reveal;
}
