/**
 * Made-up attempts of one assignment for the overview's tests: no real learner's data. Times are
 * data, never the clock.
 */

import {
  type AssignmentAttempt,
  AssignmentAttempts,
  AssignmentId,
  AttemptId,
  type AttemptResult,
  LearnerId,
  LessonQuestionId,
  PodId,
} from "@jadwigo/contracts";

const AT = "2026-10-28T14:02:06.274Z";
const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");
export const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
export const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");

/** Attempt ids and lesson question ids by a 1-digit number. */
export const attemptId = (n: number): AttemptId =>
  AttemptId.parse(`att_43007b83dp9w2tnfjxhha74cy${n}`);
export const questionId = (n: number): LessonQuestionId =>
  LessonQuestionId.parse(`lq_0ectzj2evqb95a3v1v6wewjzy${n}`);

/** A planned row of question `q` at `seq`, right on the first try unless `changes` say otherwise. */
export function result(
  attempt: number,
  seq: number,
  q: number,
  changes: Partial<AttemptResult> = {},
): AttemptResult {
  return {
    pod_id: POD,
    attempt_id: attemptId(attempt),
    seq,
    lesson_question_id: questionId(q),
    added: "planned",
    placed: null,
    added_for: null,
    say: `Ile to ${q} + ${q}?`,
    family: "enter",
    question_type: "production",
    tries: 1,
    first_try_correct: true,
    correct: true,
    mistake_classes: [],
    help_used: 0,
    skip_reason: null,
    time_ms: 12_000,
    ended: "correct",
    ...changes,
  };
}

/** A twin of question `q` at `seq`, added for the row at `addedFor`. */
export const twin = (
  attempt: number,
  seq: number,
  q: number,
  addedFor: number,
  changes: Partial<AttemptResult> = {},
): AttemptResult =>
  result(attempt, seq, q, { added: "twin", placed: "now", added_for: addedFor, ...changes });

export function played(
  n: number,
  results: AttemptResult[],
  changes: { name?: string | null; learner?: boolean; finished?: boolean; version?: number } = {},
): AssignmentAttempt {
  const finished = changes.finished ?? true;
  return {
    attempt: {
      id: attemptId(n),
      pod_id: POD,
      assignment_id: ASSIGNMENT,
      lesson_version_id: `lesv_0ectzj2evqb95a3v1v6wewjzy${changes.version ?? 1}`,
      learner_id: changes.learner === false ? null : LEARNER,
      player_name: null,
      mode: "real",
      status: finished ? "finished" : "in_progress",
      resume_at: null,
      started_at: AT,
      finished_at: finished ? AT : null,
    },
    name: changes.name === undefined ? null : changes.name,
    results,
  } as AssignmentAttempt;
}

/** The API's reply, parsed so a fixture that drifts from the contract fails here. */
export function overview(attempts: AssignmentAttempt[]): AssignmentAttempts {
  return AssignmentAttempts.parse({
    assignment: {
      id: ASSIGNMENT,
      pod_id: POD,
      lesson_id: "les_0ectzj2evqb95a3v1v6wewjzy3",
      lesson_version_id: null,
      audience: "anyone",
      identity: "none",
      after_not_sure: "twin_now",
      hold_verdicts: false,
      opens_at: null,
      closes_at: null,
      created_at: AT,
    },
    title: "Równe grupy",
    language: "pl",
    attempts,
  });
}
