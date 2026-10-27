import type {
  Added,
  Assignment,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  AttemptResult,
  Ended,
  ErrorType,
  Learner,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  LessonVersionQuestion,
  Placed,
  Pod,
  PodId,
} from "@jadwigo/contracts";

/**
 * A rule the stored state refuses, named as the API names it (`packages/contracts/src/wire.ts`,
 * `ERROR_STATUS`), so a route turns it into `{error: {type, message}}` without translating.
 */
export class StoreError extends Error {
  constructor(
    readonly type: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

/** A record as a caller writes it: the store fills its id when absent, and its timestamps. */
type New<T, Filled extends keyof T> = Omit<T, Filled | "pod_id"> & Partial<Pick<T, Filled>>;

export type NewPod = Omit<Pod, "created_at">;
export type NewLearner = New<Learner, "id" | "created_at" | "age_group">;
export type NewLesson = New<Lesson, "id" | "created_at" | "status" | "reasoning" | "kind">;
/** Distributive over the family union, so `family`, `data` and `key` stay linked. */
export type NewLessonQuestion = LessonQuestion extends infer Q
  ? Q extends LessonQuestion
    ? New<Q, "id" | "created_at">
    : never
  : never;
export type NewAssignment = New<
  Assignment,
  | "id"
  | "created_at"
  | "lesson_version_id"
  | "after_not_sure"
  | "hold_verdicts"
  | "opens_at"
  | "closes_at"
>;

/** Publishing: the questions in order, planned first. Positions are given from 1 in this order. */
export interface NewLessonVersion {
  readonly id?: LessonVersionId;
  readonly lesson_id: LessonId;
  readonly questions: readonly {
    readonly lesson_question_id: LessonQuestionId;
    readonly role: LessonVersionQuestion["role"];
  }[];
}

/** A published version with its list, each row joined to its lesson question. */
export interface LessonVersionWithQuestions {
  readonly version: LessonVersion;
  readonly questions: readonly (LessonVersionQuestion & { readonly question: LessonQuestion })[];
}

export interface NewAttempt {
  readonly id?: AttemptId;
  readonly assignment_id: AssignmentId;
  readonly learner_id?: Attempt["learner_id"];
  readonly player_name?: Attempt["player_name"];
  readonly mode?: Attempt["mode"];
}

/** Asking a question: the store gives it the next `seq` and `asked_at`. */
export interface NewAttemptQuestion {
  readonly lesson_question_id: LessonQuestionId;
  readonly added: Added;
  readonly placed: Placed | null;
  readonly added_for: number | null;
}

/** A try or a skip as judged by the caller. The store copies `help_used` from the question. */
export type NewAttemptAnswer = Omit<AttemptAnswer, "pod_id" | "help_used">;

/** Everything one attempt has recorded: the evidence a snapshot is built from. */
export interface AttemptRecord {
  readonly attempt: Attempt;
  /** In `seq` order. */
  readonly questions: readonly AttemptQuestion[];
  /** In `(seq, try_no)` order. */
  readonly answers: readonly AttemptAnswer[];
}

/**
 * The seam every app reads and writes records through (`docs/research/core-data-model.md`,
 * access patterns 1 to 8). Every method but the 2 pod lookups is scoped to one pod, as row-level
 * security scopes the database. The store keeps the rules the database keeps (keys, write-once,
 * append-only) and no course logic: what to ask next is decided by its caller.
 *
 * Errors are `StoreError`s: `NotFound` for a record outside the pod, and the 409 types of
 * `ERROR_STATUS` for a write the stored state refuses. `WriteOnce` also covers a unique key
 * another row holds (a learner's handle in its pod) and an id another pod holds; the other
 * pod's row is never returned. A read that finds nothing under the pod's scope is `NotFound`,
 * except the 2 lookups and `getLatestLessonVersion`, which return undefined.
 *
 * A paused attempt refuses answers (`AttemptPaused`) but still allows `askQuestion`,
 * `releaseHelp` and `endAttemptQuestion`, as the database does: the server may finish its own
 * bookkeeping after the player leaves.
 */
export interface Store {
  /** The pod behind an assignment or an attempt id, for `authorize()`. Not scoped: it is how the scope is found. */
  findAssignmentPod(id: AssignmentId): Promise<PodId | undefined>;
  findAttemptPod(id: AttemptId): Promise<PodId | undefined>;

  // Content: written once, idempotent by id. Writing a stored id again returns the stored row,
  // even when the content given differs (on conflict do nothing); a lesson question alone
  // compares its `content_hash`. A stored id under another parent (a version id under another
  // lesson, an attempt id under another assignment) is `WriteOnce`, never the other record.

  putPod(pod: NewPod): Promise<Pod>;
  putLearner(pod: PodId, learner: NewLearner): Promise<Learner>;
  putLesson(pod: PodId, lesson: NewLesson): Promise<Lesson>;
  /**
   * Writes a lesson question once. The same id again with the same `content_hash` returns the
   * stored row; with another hash it is refused with `WriteOnce`.
   */
  putLessonQuestion(pod: PodId, question: NewLessonQuestion): Promise<LessonQuestion>;
  /**
   * Publishes the lesson's next version (1, 2, ...) with its list in one unit, `revises` the
   * latest before it, and marks the lesson published. A list with a planned question after a
   * spare, none planned, or one lesson question twice is refused with `BadRequest`, checked
   * before the questions are looked up (an unknown one is `NotFound`).
   */
  publishLessonVersion(pod: PodId, version: NewLessonVersion): Promise<LessonVersion>;
  getLessonVersion(pod: PodId, id: LessonVersionId): Promise<LessonVersionWithQuestions>;
  /** The latest published version of a lesson, or undefined when none is published. */
  getLatestLessonVersion(pod: PodId, lesson: LessonId): Promise<LessonVersion | undefined>;

  // Who it goes to

  putAssignment(pod: PodId, assignment: NewAssignment): Promise<Assignment>;
  getAssignment(pod: PodId, id: AssignmentId): Promise<Assignment>;

  // Evidence

  /**
   * Starts an attempt in one unit (access pattern 1): resolves the version once (the
   * assignment's, or the latest published), writes the attempt, and asks the planned question
   * at position 1 as `seq` 1. Refused with `AssignmentClosed` outside `opens_at` to `closes_at`,
   * and a `learner_id` with `BadRequest` unless the assignment's `identity` is `pick`.
   */
  startAttempt(pod: PodId, attempt: NewAttempt): Promise<AttemptRecord>;
  getAttempt(pod: PodId, id: AttemptId): Promise<AttemptRecord>;
  /**
   * Asks a question: writes it at the next `seq` (access pattern 5). Refused with
   * `QuestionNotOpen` while another question is open, `AttemptFinished` once finished.
   */
  askQuestion(
    pod: PodId,
    attempt: AttemptId,
    question: NewAttemptQuestion,
  ): Promise<AttemptQuestion>;
  /**
   * Appends a try or a skip (access pattern 3), idempotent by `event_id`:
   * - the same `event_id` and `body_hash` for the same try (`attempt_id`, `seq`, `try_no`,
   *   `kind`) returns the stored row, `replayed: true`;
   * - the same `event_id` with another body or for another try is `EventIdMismatch`;
   * - a try's `value` that is not its question's family's shape is `BadRequest` (a shape check
   *   only: whether the ids exist or the text is empty is the judge's, which marks it);
   * - `asked_at` and `answered_at` may carry an offset and are kept in UTC to the millisecond
   *   (`2026-09-01T08:00:00.000Z`); a time `SentAt` refuses (no zone, finer than a millisecond,
   *   a year outside 1 to 9999 in UTC), or an answer before its question was asked, is `BadRequest`;
   * - another `event_id` for a stored `(attempt_id, seq, try_no)` is `AnswerConflict`;
   * - a `try_no` that is not the question's next is `TryOutOfOrder`;
   * - an ended question is `QuestionNotOpen`; a paused attempt `AttemptPaused`; a finished one `AttemptFinished`.
   */
  appendAttemptAnswer(
    pod: PodId,
    answer: NewAttemptAnswer,
  ): Promise<{ readonly answer: AttemptAnswer; readonly replayed: boolean }>;
  /**
   * Releases one rung (access pattern 4) when `seen` is still the question's `help_released`; a
   * stale `seen` changes nothing and returns the question as stored, `released: false`. The
   * stale check comes first, so a retry after rung 4 ended the question gets the stored question.
   * At 4 nothing more is released (`released: false`); an ended question is `QuestionNotOpen`.
   */
  releaseHelp(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    seen: number,
  ): Promise<{ readonly question: AttemptQuestion; readonly released: boolean }>;
  /**
   * Ends an open question, once. Ending it again the same way returns it; another way is
   * `QuestionNotOpen`; a value outside `Ended` is `BadRequest`.
   */
  endAttemptQuestion(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    ended: Ended,
  ): Promise<AttemptQuestion>;
  /**
   * Pause (with the `seq` to come back to) and resume (access pattern 6). Without `resume_at`
   * the stored value stays. A finished attempt is `AttemptFinished`.
   */
  setAttemptStatus(
    pod: PodId,
    attempt: AttemptId,
    status: "paused" | "in_progress",
    resume_at?: number | null,
  ): Promise<Attempt>;
  /**
   * Finishes the attempt (access pattern 7). Refused with `QuestionNotOpen` while a question is
   * open, and with `AttemptFinished` once finished, as the `attempt_finished` trigger does.
   */
  finishAttempt(pod: PodId, attempt: AttemptId): Promise<Attempt>;
  /**
   * The `attempt_result` view's rows, in `seq` order (access pattern 8): the parent's full rows.
   * The page gets `pageAttemptResult` of each, with `verdictsHeld` (`@jadwigo/contracts` wire).
   */
  getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]>;
}
