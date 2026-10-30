import type {
  AccountId,
  Added,
  Assignment,
  AssignmentAttempts,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  AttemptResult,
  Curriculum,
  Ended,
  ErrorType,
  Goal,
  GoalId,
  GoalStatus,
  Language,
  Learner,
  LearnerAttempts,
  LearnerId,
  LearnerReport,
  LearnerReportId,
  LearnerSkillEvidence,
  LearnerSkillMastery,
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
  ProposalDecision,
  ReportDigest,
  ReportNarrative,
  Skill,
  SkillId,
  Topic,
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
export type NewLearner = New<
  Learner,
  | "id"
  | "created_at"
  | "age_group"
  | "country"
  | "curriculum_id"
  | "school_grade"
  | "school_language"
>;
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

// The learner knowledge base (migration 20261031120000_learner_knowledge.sql, epic dl-e8ov.5)

/** A curriculum as the seed writes it: the store mints its id and stamps `created_at`. */
export type NewCurriculum = Omit<Curriculum, "id" | "pod_id" | "created_at">;

/** A curriculum's topic as the seed writes it: the store mints its id and stamps `created_at`. */
export type NewTopic = Omit<Topic, "id" | "pod_id" | "created_at">;

/** A catalogue skill as a seed or a pod writes it: the store stamps `created_at`. */
export type NewSkill = Omit<Skill, "pod_id" | "created_at">;

/** A goal with the codes of its skills, as the parent's routes read it. */
export interface GoalWithSkills {
  readonly goal: Goal;
  readonly skill_codes: SkillId[];
}

/** A goal as a parent adds one. Its skill codes are copied into the pod first (`ensureSkills`). */
export interface NewGoal {
  readonly name: string;
  readonly words?: string | null | undefined;
  readonly lesson_language?: Language | undefined;
  readonly skill_codes: readonly SkillId[];
}

/** What a goal's patch changes; `skill_codes` replaces its skills whole. */
export interface GoalChange {
  readonly status?: GoalStatus | undefined;
  readonly skill_codes?: readonly SkillId[] | undefined;
}

/** A mastery row as the fold makes it: the store adds the pod, the learner and `computed_at`. */
export type NewLearnerSkillMastery = Omit<
  LearnerSkillMastery,
  "pod_id" | "learner_id" | "computed_at"
>;

/** A report as code writes it: the digest, no narrative, no decisions yet. */
export interface NewLearnerReport {
  readonly learner_id: LearnerId;
  readonly period_starts_at: string;
  readonly period_ends_at: string;
  readonly inputs_hash: string;
  readonly reused: boolean;
  readonly digest: ReportDigest;
}

/** What a report's patch writes: the narrative once, and decisions appended; the store stamps `decided_at`. */
export interface ReportChange {
  readonly narrative?: ReportNarrative | undefined;
  readonly decisions?: readonly Omit<ProposalDecision, "decided_at">[] | undefined;
}

/** Everything one attempt has recorded: the evidence a snapshot is built from. */
export interface AttemptRecord {
  readonly attempt: Attempt;
  /** In `seq` order. */
  readonly questions: readonly AttemptQuestion[];
  /** In `(seq, try_no)` order. */
  readonly answers: readonly AttemptAnswer[];
}

/** `openAttempt`'s answer: the pod that holds an attempt, its record and its assignment. */
export interface OpenedAttempt {
  readonly pod: PodId;
  readonly record: AttemptRecord;
  readonly assignment: Assignment;
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
  /**
   * Runs `work` as one unit: on Postgres every Store call inside it shares one transaction, with
   * the role set once and the pod set each time it changes, and a throw out of `work` rolls all of
   * it back. A request is one unit, so it pays for one transaction, not one per call. A unit inside
   * a unit is the outer one. InMemoryStore runs `work` as it is: each call is already one unit
   * there, and nothing is rolled back.
   */
  unit<T>(work: () => Promise<T>): Promise<T>;

  /** The pod behind an assignment or an attempt id, for `authorize()`. Not scoped: it is how the scope is found. */
  findAssignmentPod(id: AssignmentId): Promise<PodId | undefined>;
  findAttemptPod(id: AttemptId): Promise<PodId | undefined>;
  /**
   * `authorize()`'s read of an attempt id, in one go: the pod that holds it, the attempt's record
   * and its assignment, or undefined when no pod holds the id. Not scoped, like the lookups.
   */
  openAttempt(id: AttemptId): Promise<OpenedAttempt | undefined>;

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
   * The lesson overview: an assignment with its lesson's title and language, and its real (never
   * preview) attempts `pod` reads, newest first, at most `LIMITS.attemptsPerAssignment`, each with
   * its `attempt_result` rows in `seq` order. The assignment's own pod reads every one; another
   * pod reads only those its learners claimed. `name` is the learner's first name when `pod` reads
   * the learner, else the typed `player_name`, else null. `NotFound` when `pod` reads neither the
   * assignment nor any attempt on it.
   */
  getAssignmentAttempts(pod: PodId, assignment: AssignmentId): Promise<AssignmentAttempts>;

  // The learner knowledge base (migration 20261031120000_learner_knowledge.sql). The store keeps
  // no course logic here either: the fold, the brief and the digest are packages/core's, run by
  // apps/api before it writes.

  /**
   * The pod that holds a learner, or undefined for an unknown id. Not scoped, like the other
   * lookups (`app.learner_pod`): a featured attempt is finished under Jadwigo's pod, and the
   * mastery rebuild after it runs under its learner's.
   */
  findLearnerPod(id: LearnerId): Promise<PodId | undefined>;
  /**
   * The catalogue `pod` reads, by code: its own rows, and the shared pod's (`FEATURED_POD_ID`,
   * the `shared_read` policy) whose code it has no row for. Never another pod's.
   */
  listSkills(pod: PodId): Promise<readonly Skill[]>;
  /**
   * Writes skills into `pod`, once per code: a code the pod holds returns the stored row, as
   * content does. The curriculum seed writes the shared catalogue into Jadwigo's pod with it.
   */
  putSkills(pod: PodId, skills: readonly NewSkill[]): Promise<readonly Skill[]>;
  /**
   * Writes a curriculum into `pod`, once per code and version (its key): a pair the pod holds
   * returns the stored row, as `putSkills` does. The curriculum seed writes the shared one into
   * Jadwigo's pod with it. Added by the store-api lane of wave dl-e8ov.5-1, the lead approving.
   */
  putCurriculum(pod: PodId, curriculum: NewCurriculum): Promise<Curriculum>;
  /**
   * Writes topics into `pod`, once per curriculum and code (their key), in the order given: a
   * topic the pod holds returns the stored row. A curriculum outside `pod` is `NotFound`.
   */
  putTopics(pod: PodId, topics: readonly NewTopic[]): Promise<readonly Topic[]>;
  /**
   * Makes sure `pod` has a row for each code, and returns them in the order given: a code the pod
   * holds stays as it is; one the shared catalogue holds is copied once (its kind, status, topic,
   * can-do lines, aliases and prerequisites, `source` kept); an unknown one becomes a `draft`.
   * The caller resolves aliases first (`resolveSkill` in packages/core).
   */
  ensureSkills(pod: PodId, codes: readonly SkillId[]): Promise<readonly Skill[]>;
  /**
   * The `learner_skill_evidence` rows of a learner of `pod`, ordered by `answered_at`, then
   * attempt, `seq`, `try_no` and skill code: one row per answer and skill code its question
   * carries, for real attempts only, a skip or a judged try (a try no judge marked gives none).
   * A claimed attempt played in another pod is read here too. A learner outside `pod` is `NotFound`.
   */
  getLearnerEvidence(pod: PodId, learner: LearnerId): Promise<readonly LearnerSkillEvidence[]>;
  /**
   * Replaces a learner's mastery rows whole, in one unit with the learner held, so 2 rebuilds at
   * once leave one of the 2 sets, never a mix. `computed_at` is now. Returns them by skill code.
   */
  replaceMastery(
    pod: PodId,
    learner: LearnerId,
    rows: readonly NewLearnerSkillMastery[],
  ): Promise<readonly LearnerSkillMastery[]>;
  /** A learner's mastery rows, by skill code. A learner outside `pod` is `NotFound`. */
  getMastery(pod: PodId, learner: LearnerId): Promise<readonly LearnerSkillMastery[]>;
  /**
   * A learner's goals with their skill codes (each once, by code), oldest first. A learner
   * outside `pod` is `NotFound`.
   */
  listGoals(pod: PodId, learner: LearnerId): Promise<readonly GoalWithSkills[]>;
  /**
   * Adds a goal to a learner of `pod` in one unit: its skill codes are made sure of first
   * (`ensureSkills`), then linked, each once. `status` is `active`, and
   * `lesson_language` is `pl` unless given.
   */
  addGoal(pod: PodId, learner: LearnerId, goal: NewGoal): Promise<GoalWithSkills>;
  /**
   * Changes a goal's status, and replaces its skills when `skill_codes` is given
   * (made sure of first, as `addGoal` does). A goal outside the learner or `pod` is `NotFound`.
   */
  updateGoal(
    pod: PodId,
    learner: LearnerId,
    goal: GoalId,
    change: GoalChange,
  ): Promise<GoalWithSkills>;
  /** Writes a report on a learner of `pod`: narrative null, no decisions. */
  putReport(pod: PodId, report: NewLearnerReport): Promise<LearnerReport>;
  /** A learner's reports, newest first, at most `LIMITS.reportsPerLearner`. */
  listReports(pod: PodId, learner: LearnerId): Promise<readonly LearnerReport[]>;
  /**
   * Writes a report's narrative once (the same narrative again returns the report; another is
   * `WriteOnce`) and appends the parent's decisions, each stamped `decided_at` now. A decision on a
   * proposal the digest does not have is `BadRequest`, checked before anything is written. A
   * report outside the learner or `pod` is `NotFound`.
   */
  updateReport(
    pod: PodId,
    learner: LearnerId,
    report: LearnerReportId,
    change: ReportChange,
  ): Promise<LearnerReport>;

  /**
   * The `attempt_result` view's rows, in `seq` order (access pattern 8): the parent's full rows.
   * The page gets `pageAttemptResult` of each, with `verdictsHeld` (`@jadwigo/contracts` wire).
   */
  getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]>;
}
