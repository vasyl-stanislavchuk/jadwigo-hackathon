import type {
  AccountId,
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
  Language,
  Learner,
  LearnerAttempts,
  LearnerId,
  LearnerSnapshot,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionExample,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  LessonVersionQuestion,
  Me,
  Placed,
  Pod,
  PodId,
  Uuid,
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

/**
 * A playground example as the seed writes it: its question and twin already stored. The store
 * mints its id, since a replace writes every row anew.
 */
export type NewLessonQuestionExample = Omit<LessonQuestionExample, "id" | "pod_id" | "created_at">;

/** A playground example joined to its question and twin. */
export interface ExampleWithQuestions {
  readonly example: LessonQuestionExample;
  readonly question: LessonQuestion;
  readonly twin: LessonQuestion | null;
}

/** An assignment anyone may play now, with the lesson it plays. */
export interface OpenAssignment {
  readonly assignment: Assignment;
  readonly lesson: Lesson;
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

/**
 * The `help_twin` skip `releaseHelp` writes with the last rung. The store fills in the rest: the
 * attempt and `seq`, `kind: "skip"`, and the question's next `try_no` unless one is given.
 */
export type HelpTwin = Pick<
  NewAttemptAnswer,
  "event_id" | "latency_ms" | "asked_at" | "answered_at" | "body_hash"
> & { readonly try_no?: number };

/** Who a signed-in user is: the pod its member row is in, and its account there. */
export interface MemberScope {
  readonly pod: PodId;
  readonly account: AccountId;
}

/** A child as a parent adds one: the store makes its `handle`, unique in the pod, from `first_name`. */
export interface NewLearnerWithGoals {
  readonly first_name: string;
  readonly age_group?: string | null | undefined;
  /** Goal names, in order. */
  readonly goals?: readonly string[] | undefined;
}

/** A claim: the caller's learner and account take an attempt that may sit in another pod. */
export interface NewClaim {
  readonly attempt: AttemptId;
  readonly learner: LearnerId;
  readonly account: AccountId;
}

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
  /**
   * The pod's assignments anyone may play now: `audience` is `anyone`, the lesson is published,
   * and now is inside `opens_at` to `closes_at` (a null end is open), each with its lesson, oldest
   * first. Scoped to the pod like every other read, so another pod's are never listed.
   */
  listOpenAssignments(pod: PodId): Promise<readonly OpenAssignment[]>;

  // The playground's written examples: not write-once, replaced whole by the seed (dl-w3.75)

  /**
   * Replaces the pod's examples in `language` with `examples`, in one unit, and returns them as
   * stored. Each names a lesson question the pod holds (else `NotFound`); the batch is refused
   * with `BadRequest` when an example is in another language, a slug repeats within its question
   * type, a question repeats, a twin's `twin_of` is not its example's question, or a scenario's
   * value is not its question's family's.
   */
  replaceExamples(
    pod: PodId,
    language: Language,
    examples: readonly NewLessonQuestionExample[],
  ): Promise<readonly LessonQuestionExample[]>;
  /** The pod's examples in `language` with their questions, by question type, position, then slug. */
  listExamples(pod: PodId, language: Language): Promise<readonly ExampleWithQuestions[]>;

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
   *
   * With `seq`, it asks only when that is the attempt's next `seq`, checked in the same unit as
   * the write; otherwise another question was asked since the caller read the attempt, and it is
   * `QuestionNotOpen` with nothing written. So of 2 asks at once with the same `seq`, one lands.
   */
  askQuestion(
    pod: PodId,
    attempt: AttemptId,
    question: NewAttemptQuestion,
    options?: { readonly seq?: number },
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
   *
   * With `end`, the question ends that way in the same unit, as `endAttemptQuestion` would end
   * it after the append (its `missed` rule counts this try). The check that the question is open
   * and the end hold the question for the whole unit, so of 2 appends at once for one question,
   * one with `end`, the other is `QuestionNotOpen` or lands before it, never after; nothing of a
   * refused append is written. A replay returns the stored row and ends nothing.
   */
  appendAttemptAnswer(
    pod: PodId,
    answer: NewAttemptAnswer,
    options?: { readonly end?: Ended },
  ): Promise<{ readonly answer: AttemptAnswer; readonly replayed: boolean }>;
  /**
   * Releases one rung (access pattern 4) when `seen` is still the question's `help_released`; a
   * stale `seen` changes nothing and returns the question as stored, `released: false`. The
   * stale check comes first, so a retry after rung 4 ended the question gets the stored question.
   * At 4 nothing more is released (`released: false`); an ended question is `QuestionNotOpen`.
   *
   * With `twin` (the caller passes it only for the last rung, whose help is the worked answer),
   * the release also appends the `help_twin` skip at the question's next `try_no` and ends the
   * question `skipped`, in one unit with the question held: a try sent at the same time lands
   * before it or is `QuestionNotOpen`, so the answer never shows on an open question. The skip
   * is checked as an answer's fields are (a given `try_no` that is not the next is
   * `TryOutOfOrder`, a stored `event_id` is `EventIdMismatch`, a bad time `BadRequest`), but a
   * paused attempt allows it, as it allows any release; a refusal writes nothing. A retry with the
   * same `seen` finds it stale and returns the question. The 4th release, from `help_released` 3,
   * can only be the last rung, so without `twin` it is `BadRequest` and writes nothing.
   */
  releaseHelp(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    seen: number,
    options?: { readonly twin?: HelpTwin },
  ): Promise<{ readonly question: AttemptQuestion; readonly released: boolean }>;
  /**
   * Ends an open question, once. Ending it again the same way returns it; another way is
   * `QuestionNotOpen`; a value outside `Ended` is `BadRequest`. `missed` is `BadRequest` unless
   * the attempt's assignment holds verdicts and the question has a wrong try and no right one:
   * while verdicts are held the caller ends a question after its first wrong try, so a 2nd try
   * can't give the verdict away (`Ended` in `@jadwigo/contracts` has the table).
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
  // People (migration 20261029120000_parent_login.sql, docs/research/parent-login.md)

  /**
   * The member a token's `sub` names: its pod and account, or undefined before the first sign-in
   * made one. Not scoped: it is how a signed-in caller's scope is found (`app.member_pod`).
   */
  findMember(sub: Uuid): Promise<MemberScope | undefined>;
  /**
   * The first sign-in, idempotent per `sub`: a new pod (named `home`, in `language`), its account
   * and a `parent` member, in one unit. When `sub` has a member already, or a racing call made one,
   * it writes nothing and returns that one.
   */
  createAccount(sub: Uuid, language: Language): Promise<MemberScope>;
  /** `GET /api/v1/me`: the pod, the account, its member row, and the learners with goals, oldest first. */
  getMe(pod: PodId, account: AccountId): Promise<Me>;
  /**
   * Adds a learner and its goals in one unit. The handle is the first name made plain (lower
   * case, letters and digits), with `-2`, `-3` and so on when the pod holds it already.
   */
  addLearner(pod: PodId, learner: NewLearnerWithGoals): Promise<LearnerSnapshot>;
  /**
   * Claims an attempt, wherever it was played, for a learner of `pod` (`app.claim_attempt`): sets
   * its learner, `claimed_by` and `claimed_at` and nothing else; answers are never touched, and a
   * finished attempt may be claimed. A learner or account outside `pod`, or no such attempt, is
   * `NotFound`; the same learner and account again returns the stored attempt (a replay); any
   * other attempt with a learner is `AttemptClaimed`; a preview attempt is `AttemptPreview`.
   */
  claimAttempt(pod: PodId, claim: NewClaim): Promise<Attempt>;
  /**
   * A learner of `pod` with its attempts, newest first, each with its lesson's title and language
   * and its `attempt_result` rows. A claimed attempt in another pod is read here, read-only.
   */
  getLearnerAttempts(pod: PodId, learner: LearnerId): Promise<LearnerAttempts>;

  /**
   * The `attempt_result` view's rows, in `seq` order (access pattern 8): the parent's full rows.
   * The page gets `pageAttemptResult` of each, with `verdictsHeld` (`@jadwigo/contracts` wire).
   */
  getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]>;
}
