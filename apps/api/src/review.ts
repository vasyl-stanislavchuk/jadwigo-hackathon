import {
  type Attempt,
  type AttemptAnswer,
  type AttemptId,
  type AttemptQuestion,
  type AttemptReview,
  ErrorType,
  type LearnerId,
  type ParentAttemptReview,
  type ReviewQuestion,
  type ReviewTry,
} from "@jadwigo/contracts";
import { pageMarks, solutionOf } from "@jadwigo/core";
import type { LessonVersionWithQuestions, Store } from "@jadwigo/store";
import { versionOf } from "./attempts.ts";
import type { Claims } from "./auth.ts";
import { authorize, authorizeMember } from "./authorize.ts";
import { lessonQuestion } from "./course.ts";
import { ApiError } from "./errors.ts";
import { pageFamilyQuestion, revealOf, verdictOf } from "./page.ts";

/**
 * `GET /api/v1/attempts/{id}/review`: every question of a finished attempt again, for the child's
 * end list: the last try's answer, a mark on each part, the solution and the reveal. Bound by the
 * attempt id as every attempt route is. Refused with `AttemptNotFinished` before the attempt
 * finishes, so a held verdict never shows mid-lesson and no solution gives an open question away.
 */
export async function getReview(store: Store, id: AttemptId): Promise<AttemptReview> {
  const scope = await authorize(store, { attempt: id });
  const { record } = scope;
  finished(record.attempt);
  const version = await versionOf(store, scope.pod, record);
  return {
    attempt: record.attempt,
    questions: record.questions.map((asked) => reviewQuestion(version, asked, record.answers)),
  };
}

/**
 * `GET /api/v1/learners/{id}/attempts/{attempt}/review`: a finished attempt of the caller's
 * learner, with every try and its `attempt_result` row. The attempt is found among the learner's
 * attempts, read under the caller's pod, so another pod's learner, or an attempt not claimed for
 * this learner, is 404. The attempt and its lesson version are then read under the attempt's own
 * pod, where it was played (decision jadwigo-hackathon 2026-10-29): the key stays on the server,
 * and the reply carries the solution, the marks and the reveal, never the key.
 */
export async function getParentReview(
  store: Store,
  claims: Claims,
  learner: LearnerId,
  id: AttemptId,
): Promise<ParentAttemptReview> {
  const { pod } = await authorizeMember(store, claims);
  const { attempts } = await store.getLearnerAttempts(pod, learner);
  const played = attempts.find((a) => a.attempt.id === id && a.attempt.learner_id === learner);
  if (played === undefined) throw new ApiError(ErrorType.enum.NotFound, "no such attempt");
  finished(played.attempt);
  const record = await store.getAttempt(played.attempt.pod_id, id);
  const version = await versionOf(store, played.attempt.pod_id, record);
  return {
    attempt: record.attempt,
    title: played.title,
    language: played.language,
    questions: record.questions.map((asked) => {
      const result = played.results.find((r) => r.seq === asked.seq);
      if (result === undefined) throw new Error(`attempt ${id} has no result at seq ${asked.seq}`);
      return {
        ...reviewQuestion(version, asked, record.answers),
        tries: record.answers
          .filter((a) => a.seq === asked.seq)
          .sort((x, y) => x.try_no - y.try_no)
          .map(reviewTry),
        result,
      };
    }),
  };
}

function finished(attempt: Attempt): void {
  if (attempt.status !== "finished")
    throw new ApiError(ErrorType.enum.AttemptNotFinished, "this attempt has not finished");
}

/** One asked question as a review shows it: the stored ending, since nothing is held any more. */
function reviewQuestion(
  version: LessonVersionWithQuestions,
  asked: AttemptQuestion,
  answers: readonly AttemptAnswer[],
): ReviewQuestion {
  const question = lessonQuestion(version, asked.lesson_question_id);
  const last = answers.findLast((a) => a.seq === asked.seq && a.kind === "try");
  if (asked.ended === null) throw new Error(`a finished attempt has seq ${asked.seq} open`);
  return {
    seq: asked.seq,
    added: asked.added,
    ended: asked.ended,
    help_used: asked.help_released,
    question_type: question.question_type,
    say: question.say,
    question: pageFamilyQuestion(question),
    answer: last?.value ?? null,
    parts: last ? pageMarks(question, last.value, verdictOf(last)) : null,
    solution: solutionOf(question),
    reveal: revealOf(question),
  };
}

/** The `attempt_answer` row's own fields the parent sees; never its event id or body hash. */
function reviewTry(answer: AttemptAnswer): ReviewTry {
  return {
    try_no: answer.try_no,
    kind: answer.kind,
    value: answer.value,
    correct: answer.correct,
    parts: answer.parts,
    mistake_class: answer.mistake_class,
    latency_ms: answer.latency_ms,
    help_used: answer.help_used,
    skip_reason: answer.skip_reason,
  };
}
