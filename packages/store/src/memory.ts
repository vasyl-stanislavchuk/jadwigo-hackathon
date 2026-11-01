import {
  Account,
  AccountId,
  Assignment,
  type AssignmentAttempts,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  type AttemptResult,
  Curriculum,
  CurriculumId,
  Ended,
  ErrorType,
  FEATURED_POD_ID,
  Goal,
  GoalId,
  ID_PREFIXES,
  type IdPrefix,
  idOf,
  type Language,
  Learner,
  type LearnerAttempts,
  LearnerId,
  LearnerReport,
  LearnerReportId,
  type LearnerSkillEvidence,
  LearnerSkillMastery,
  type LearnerSnapshot,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionExample,
  LessonQuestionExampleId,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  type LessonVersionQuestion,
  LIMITS,
  type Me,
  Member,
  MemberId,
  Pod,
  PodId,
  type ProposalDecision,
  SentAt,
  Skill,
  type SkillId,
  Topic,
  TopicId,
  type Uuid,
  valueFor,
} from "@jadwigo/contracts";
import {
  Conversation,
  type ConversationId,
  type NewRunEvent,
  Run,
  RunEvent,
  type RunId,
  RunInbox,
  type RunStatus,
  type RunWorkflow,
} from "@jadwigo/contracts/run";
import { byTypeThenPosition, checkExamples } from "./example.ts";
import { handleFor } from "./handle.ts";
import { attemptResults } from "./result.ts";
import type {
  Fenced,
  MessageUsage,
  NewConversation,
  NewRun,
  NewRunInbox,
  RunChange,
  UsageSince,
} from "./run.ts";
import {
  type AttemptRecord,
  type ExampleWithQuestions,
  type GoalChange,
  type GoalWithSkills,
  type HelpTwin,
  type LessonVersionWithQuestions,
  type MemberScope,
  type NewAssignment,
  type NewAttempt,
  type NewAttemptAnswer,
  type NewAttemptQuestion,
  type NewClaim,
  type NewCurriculum,
  type NewGoal,
  type NewLearner,
  type NewLearnerReport,
  type NewLearnerSkillMastery,
  type NewLearnerWithGoals,
  type NewLesson,
  type NewLessonQuestion,
  type NewLessonQuestionExample,
  type NewLessonVersion,
  type NewPod,
  type NewSkill,
  type NewTopic,
  type OpenAssignment,
  type OpenedAttempt,
  type ReportChange,
  type Store,
  StoreError,
} from "./store.ts";

/** A run in one of these has ended: the sweep never reads it again. */
const ENDED: ReadonlySet<RunStatus> = new Set(["completed", "failed", "cancelled"]);

/** A Zod schema as this file uses it: parse, and say why not. */
interface Schema<T> {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { message: string } };
}

/** A record the stored state accepts, or `BadRequest`, as a database check refuses a row. */
function parse<T>(schema: Schema<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new StoreError(ErrorType.enum.BadRequest, `${what} is not valid`);
  return result.data;
}

/** The 4th release can only be the last rung, whose worked answer must end the question with it. */
function lastRungNeedsTwin(): StoreError {
  return new StoreError(
    ErrorType.enum.BadRequest,
    "the last rung is released with its help twin skip",
  );
}

/**
 * A sent time as the store keeps it: in UTC, to the millisecond. Only a time `SentAt` takes is
 * converted, so a time with no zone is never read in the host's zone, and a finer one is never
 * truncated before the order check.
 */
function utc(at: string): string {
  if (!SentAt.safeParse(at).success) {
    throw new StoreError(
      ErrorType.enum.BadRequest,
      `${JSON.stringify(at)} is not a sent time (SentAt)`,
    );
  }
  return new Date(Date.parse(at)).toISOString();
}

/** A fresh id for a record, a v4 uuid written as the wire id. */
function mint<T>(schema: Schema<T>, prefix: IdPrefix): T {
  return parse(schema, idOf(prefix, crypto.randomUUID()), "a minted id");
}

/** An inbox row's key: its pod and its event_id, which is unique per pod (dl-z5ja.86). */
function inboxKey(pod: PodId, event_id: string): string {
  return `${pod}:${event_id}`;
}

function notFound(what: string): StoreError {
  return new StoreError(ErrorType.enum.NotFound, `${what} was not found`);
}

/** Frozen on the way in, so a caller holding a returned record cannot change the stored one. */
function frozen<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const inner of Object.values(value)) frozen(inner);
    Object.freeze(value);
  }
  return value;
}

/**
 * The `Store` in memory, for unit tests and local play. It keeps the rules the migration keeps
 * (`supabase/migrations/20261027120000_core_v0.sql`): keys, write-once content, append-only
 * evidence, and a record in another pod read as `NotFound`, as row-level security hides it.
 */
export class InMemoryStore implements Store {
  readonly #now: () => Date;
  readonly #pods = new Map<string, Pod>();
  readonly #learners = new Map<string, Learner>();
  readonly #accounts = new Map<string, Account>();
  readonly #members = new Map<string, Member>();
  readonly #goals = new Map<string, Goal>();
  readonly #lessons = new Map<string, Lesson>();
  readonly #versions = new Map<string, LessonVersion>();
  /** By version id, in `position` order. */
  readonly #lists = new Map<string, LessonVersionQuestion[]>();
  readonly #questions = new Map<string, LessonQuestion>();
  readonly #examples = new Map<string, LessonQuestionExample>();
  readonly #assignments = new Map<string, Assignment>();
  readonly #attempts = new Map<string, Attempt>();
  /** By attempt id, in `seq` order. */
  readonly #asked = new Map<string, AttemptQuestion[]>();
  /** By event id: the key a replay is matched on, across every pod. */
  readonly #answers = new Map<string, AttemptAnswer>();
  /** By `<pod> <code> <version>`: a curriculum's key. */
  readonly #curricula = new Map<string, Curriculum>();
  /** By `<curriculum id> <code>`: a topic's key. */
  readonly #topics = new Map<string, Topic>();
  /** By `<pod> <code>`: a skill is keyed by its pod and code. */
  readonly #skills = new Map<string, Skill>();
  /** By goal id: its skill codes, in the order linked. */
  readonly #goalSkills = new Map<string, SkillId[]>();
  /** By learner id: the mastery cache, by skill code. */
  readonly #mastery = new Map<string, LearnerSkillMastery[]>();
  /** By id, in the order written. */
  readonly #reports = new Map<string, LearnerReport>();
  readonly #conversations = new Map<string, Conversation>();
  /** By id, in the order created. */
  readonly #runs = new Map<string, Run>();
  /** By run id, in `seq` order. */
  readonly #runEvents = new Map<string, RunEvent[]>();
  /**
   * By `inboxKey(pod, event_id)`, in the order written: the key a resent message is matched on.
   * An event_id is unique per pod (dl-z5ja.86).
   */
  readonly #inbox = new Map<string, RunInbox>();

  constructor(options: { now?: () => Date } = {}) {
    this.#now = options.now ?? (() => new Date());
  }

  #at(): string {
    return this.#now().toISOString();
  }

  /** The record behind an id when it is in the pod; another pod's is as absent as a missing one. */
  #inPod<T extends { pod_id: PodId }>(
    map: Map<string, T>,
    pod: PodId,
    id: string,
    what: string,
  ): T {
    const row = map.get(id);
    if (!row || row.pod_id !== pod) throw notFound(what);
    return row;
  }

  /** An id another pod holds cannot be written here, and its record is never returned. */
  #taken<T extends { pod_id: PodId }>(map: Map<string, T>, pod: PodId, id: string): T | undefined {
    const row = map.get(id);
    if (row && row.pod_id !== pod)
      throw new StoreError(ErrorType.enum.WriteOnce, "that id is already taken");
    return row;
  }

  #pod(pod: PodId): Pod {
    const row = this.#pods.get(pod);
    if (!row) throw notFound("the pod");
    return row;
  }

  async findAssignmentPod(id: AssignmentId): Promise<PodId | undefined> {
    return this.#assignments.get(id)?.pod_id;
  }

  async findAttemptPod(id: AttemptId): Promise<PodId | undefined> {
    return this.#attempts.get(id)?.pod_id;
  }

  async unit<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }

  async openAttempt(id: AttemptId): Promise<OpenedAttempt | undefined> {
    const pod = await this.findAttemptPod(id);
    if (pod === undefined) return undefined;
    const record = await this.getAttempt(pod, id);
    return { pod, record, assignment: await this.getAssignment(pod, record.attempt.assignment_id) };
  }

  async putPod(pod: NewPod): Promise<Pod> {
    const stored = this.#pods.get(pod.id);
    if (stored) return stored;
    const row = frozen(
      parse(Pod, { ...pod, created_at: this.#at(), ai_consent_at: null }, "the pod"),
    );
    this.#pods.set(row.id, row);
    return row;
  }

  async putLearner(pod: PodId, learner: NewLearner): Promise<Learner> {
    this.#pod(pod);
    const id = learner.id ?? mint(LearnerId, ID_PREFIXES.learner);
    const stored = this.#taken(this.#learners, pod, id);
    if (stored) return stored;
    const row = frozen(
      parse(
        Learner,
        {
          age_group: null,
          country: null,
          curriculum_id: null,
          school_grade: null,
          school_language: null,
          created_at: this.#at(),
          ...learner,
          id,
          pod_id: pod,
        },
        "the learner",
      ),
    );
    for (const other of this.#learners.values()) {
      if (other.pod_id === pod && other.handle === row.handle) {
        throw new StoreError(
          ErrorType.enum.WriteOnce,
          "another learner in the pod has that handle",
        );
      }
    }
    this.#learners.set(row.id, row);
    return row;
  }

  async putLesson(pod: PodId, lesson: NewLesson): Promise<Lesson> {
    this.#pod(pod);
    const id = lesson.id ?? mint(LessonId, ID_PREFIXES.lesson);
    const stored = this.#taken(this.#lessons, pod, id);
    if (stored) return stored;
    const row = frozen(
      parse(
        Lesson,
        {
          kind: "practice",
          status: "draft",
          reasoning: null,
          created_at: this.#at(),
          ...lesson,
          id,
          pod_id: pod,
        },
        "the lesson",
      ),
    );
    this.#lessons.set(row.id, row);
    return row;
  }

  async putLessonQuestion(pod: PodId, question: NewLessonQuestion): Promise<LessonQuestion> {
    this.#pod(pod);
    const id = question.id ?? mint(LessonQuestionId, ID_PREFIXES.lesson_question);
    const stored = this.#taken(this.#questions, pod, id);
    if (stored) {
      if (stored.content_hash === question.content_hash) return stored;
      throw new StoreError(
        ErrorType.enum.WriteOnce,
        "a lesson question is written once; an edit is a new one",
      );
    }
    const row = frozen(
      parse(
        LessonQuestion,
        { created_at: this.#at(), ...question, id, pod_id: pod },
        "the lesson question",
      ),
    );
    if (row.twin_of !== null) this.#inPod(this.#questions, pod, row.twin_of, "the twin's question");
    this.#questions.set(row.id, row);
    return row;
  }

  async publishLessonVersion(pod: PodId, version: NewLessonVersion): Promise<LessonVersion> {
    const lesson = this.#inPod(this.#lessons, pod, version.lesson_id, "the lesson");
    if (version.id) {
      const stored = this.#taken(this.#versions, pod, version.id);
      if (stored && stored.lesson_id !== lesson.id) {
        throw new StoreError(ErrorType.enum.WriteOnce, "this version id belongs to another lesson");
      }
      if (stored) return stored;
    }
    const roles = version.questions.map((q) => q.role);
    if (!roles.includes("planned")) {
      throw new StoreError(ErrorType.enum.BadRequest, "a version plans at least one question");
    }
    if (roles.indexOf("spare") !== -1 && roles.lastIndexOf("planned") > roles.indexOf("spare")) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "the planned questions come before the spares",
      );
    }
    const listed = version.questions.map((q) => q.lesson_question_id);
    if (new Set(listed).size !== listed.length) {
      throw new StoreError(ErrorType.enum.BadRequest, "a version lists each lesson question once");
    }
    for (const id of listed) this.#inPod(this.#questions, pod, id, "a lesson question on the list");
    // Read and write with no await between, so 2 publishes can't both take the same number.
    const latest = this.#latest(pod, lesson.id);
    const row = frozen(
      parse(
        LessonVersion,
        {
          id: version.id ?? mint(LessonVersionId, ID_PREFIXES.lesson_version),
          pod_id: pod,
          lesson_id: lesson.id,
          version: (latest?.version ?? 0) + 1,
          revises: latest?.id ?? null,
          published_at: this.#at(),
        },
        "the lesson version",
      ),
    );
    const list = version.questions.map((q, i) =>
      frozen({
        lesson_version_id: row.id,
        position: i + 1,
        pod_id: pod,
        lesson_question_id: q.lesson_question_id,
        role: q.role,
      }),
    );
    this.#versions.set(row.id, row);
    this.#lists.set(row.id, list);
    this.#lessons.set(lesson.id, frozen({ ...lesson, status: "published" }));
    return row;
  }

  async getLessonVersion(pod: PodId, id: LessonVersionId): Promise<LessonVersionWithQuestions> {
    const version = this.#inPod(this.#versions, pod, id, "the lesson version");
    const questions = (this.#lists.get(id) ?? []).map((row) => ({
      ...row,
      question: this.#inPod(this.#questions, pod, row.lesson_question_id, "a listed question"),
    }));
    const { language } = this.#inPod(this.#lessons, pod, version.lesson_id, "the lesson");
    return { version, language, questions };
  }

  async getLatestLessonVersion(pod: PodId, lesson: LessonId): Promise<LessonVersion | undefined> {
    return this.#latest(pod, lesson);
  }

  #latest(pod: PodId, lesson: LessonId): LessonVersion | undefined {
    let latest: LessonVersion | undefined;
    for (const v of this.#versions.values()) {
      if (v.pod_id === pod && v.lesson_id === lesson && v.published_at !== null) {
        if (!latest || v.version > latest.version) latest = v;
      }
    }
    return latest;
  }

  async putAssignment(pod: PodId, assignment: NewAssignment): Promise<Assignment> {
    this.#inPod(this.#lessons, pod, assignment.lesson_id, "the lesson");
    const id = assignment.id ?? mint(AssignmentId, ID_PREFIXES.assignment);
    const stored = this.#taken(this.#assignments, pod, id);
    if (stored) return stored;
    const row = frozen(
      parse(
        Assignment,
        {
          lesson_version_id: null,
          after_not_sure: "next",
          hold_verdicts: false,
          opens_at: null,
          closes_at: null,
          created_at: this.#at(),
          ...assignment,
          id,
          pod_id: pod,
        },
        "the assignment",
      ),
    );
    if (row.lesson_version_id !== null) {
      this.#inPod(this.#versions, pod, row.lesson_version_id, "the lesson version");
    }
    if (row.opens_at !== null && row.closes_at !== null && row.closes_at <= row.opens_at) {
      throw new StoreError(ErrorType.enum.BadRequest, "an assignment closes after it opens");
    }
    this.#assignments.set(row.id, row);
    return row;
  }

  async getAssignment(pod: PodId, id: AssignmentId): Promise<Assignment> {
    return this.#inPod(this.#assignments, pod, id, "the assignment");
  }

  async listOpenAssignments(pod: PodId): Promise<readonly OpenAssignment[]> {
    const now = this.#now().getTime();
    return [...this.#assignments.values()]
      .filter(
        (a) =>
          a.pod_id === pod &&
          a.audience === "anyone" &&
          (a.opens_at === null || now >= Date.parse(a.opens_at)) &&
          (a.closes_at === null || now < Date.parse(a.closes_at)),
      )
      .map((assignment) => ({ assignment, lesson: this.#lessons.get(assignment.lesson_id) }))
      .filter((o): o is OpenAssignment => o.lesson?.status === "published")
      .sort(
        (a, b) =>
          a.assignment.created_at.localeCompare(b.assignment.created_at) ||
          (a.assignment.id < b.assignment.id ? -1 : a.assignment.id > b.assignment.id ? 1 : 0),
      );
  }

  async replaceExamples(
    pod: PodId,
    language: Language,
    examples: readonly NewLessonQuestionExample[],
  ): Promise<readonly LessonQuestionExample[]> {
    this.#pod(pod);
    checkExamples(language, examples, (id) => {
      const question = this.#questions.get(id);
      return question?.pod_id === pod ? question : undefined;
    });
    const rows = examples.map((example) =>
      frozen(
        parse(
          LessonQuestionExample,
          {
            ...example,
            id: mint(LessonQuestionExampleId, ID_PREFIXES.lesson_question_example),
            pod_id: pod,
            created_at: this.#at(),
          },
          "the example",
        ),
      ),
    );
    for (const [id, row] of this.#examples) {
      if (row.pod_id === pod && row.language === language) this.#examples.delete(id);
    }
    for (const row of rows) this.#examples.set(row.id, row);
    return rows;
  }

  async listExamples(pod: PodId, language: Language): Promise<readonly ExampleWithQuestions[]> {
    return [...this.#examples.values()]
      .filter((e) => e.pod_id === pod && e.language === language)
      .map((example) => ({
        example,
        question: this.#inPod(this.#questions, pod, example.lesson_question_id, "the question"),
        twin:
          example.twin === null
            ? null
            : this.#inPod(this.#questions, pod, example.twin, "the twin's question"),
      }))
      .sort(byTypeThenPosition);
  }

  async startAttempt(pod: PodId, attempt: NewAttempt): Promise<AttemptRecord> {
    const assignment = this.#inPod(this.#assignments, pod, attempt.assignment_id, "the assignment");
    const taken = attempt.id && this.#taken(this.#attempts, pod, attempt.id);
    if (taken && taken.assignment_id !== assignment.id) {
      throw new StoreError(
        ErrorType.enum.WriteOnce,
        "this attempt id belongs to another assignment",
      );
    }
    if (taken) return this.getAttempt(pod, taken.id);
    if (attempt.learner_id && assignment.identity !== "pick") {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "a learner is named only when the assignment picks one",
      );
    }
    const now = this.#now().getTime();
    if (
      (assignment.opens_at !== null && now < Date.parse(assignment.opens_at)) ||
      (assignment.closes_at !== null && now >= Date.parse(assignment.closes_at))
    ) {
      throw new StoreError(ErrorType.enum.AssignmentClosed, "this assignment is not open now");
    }
    const version =
      assignment.lesson_version_id !== null
        ? this.#inPod(this.#versions, pod, assignment.lesson_version_id, "the lesson version")
        : this.#latest(pod, assignment.lesson_id);
    if (!version) throw notFound("a published version of the lesson");
    const first = this.#lists.get(version.id)?.[0];
    if (first?.role !== "planned") throw notFound("the version's first question");
    if (attempt.learner_id) this.#inPod(this.#learners, pod, attempt.learner_id, "the learner");
    const at = this.#at();
    const row = frozen(
      parse(
        Attempt,
        {
          id: attempt.id ?? mint(AttemptId, ID_PREFIXES.attempt),
          pod_id: pod,
          assignment_id: assignment.id,
          lesson_version_id: version.id,
          learner_id: attempt.learner_id ?? null,
          player_name: attempt.player_name ?? null,
          mode: attempt.mode ?? "real",
          status: "in_progress",
          resume_at: null,
          started_at: at,
          finished_at: null,
          claimed_by: null,
          claimed_at: null,
          moved_by: null,
          moved_at: null,
        },
        "the attempt",
      ),
    );
    this.#attempts.set(row.id, row);
    this.#asked.set(row.id, [
      this.#newQuestion(pod, row.id, 1, {
        lesson_question_id: first.lesson_question_id,
        added: "planned",
        placed: null,
        added_for: null,
      }),
    ]);
    return this.getAttempt(pod, row.id);
  }

  #newQuestion(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    question: NewAttemptQuestion,
  ): AttemptQuestion {
    return frozen(
      parse(
        AttemptQuestion,
        {
          ...question,
          attempt_id: attempt,
          seq,
          pod_id: pod,
          help_released: 0,
          ended: null,
          asked_at: this.#at(),
        },
        "the attempt question",
      ),
    );
  }

  async getAttempt(pod: PodId, id: AttemptId): Promise<AttemptRecord> {
    const attempt = this.#inPod(this.#attempts, pod, id, "the attempt");
    const answers = [...this.#answers.values()]
      .filter((a) => a.attempt_id === id)
      .sort((a, b) => a.seq - b.seq || a.try_no - b.try_no);
    return { attempt, questions: [...(this.#asked.get(id) ?? [])], answers };
  }

  /** The attempt and its questions, refusing a finished attempt. */
  #playing(pod: PodId, id: AttemptId): { attempt: Attempt; asked: AttemptQuestion[] } {
    const attempt = this.#inPod(this.#attempts, pod, id, "the attempt");
    if (attempt.status === "finished") {
      throw new StoreError(ErrorType.enum.AttemptFinished, "this attempt is finished");
    }
    return { attempt, asked: this.#asked.get(id) ?? [] };
  }

  #asking(pod: PodId, attempt: AttemptId, seq: number): AttemptQuestion {
    this.#inPod(this.#attempts, pod, attempt, "the attempt");
    const question = this.#asked.get(attempt)?.find((q) => q.seq === seq);
    if (!question) throw notFound("the question");
    return question;
  }

  #replace(question: AttemptQuestion): AttemptQuestion {
    const row = frozen(parse(AttemptQuestion, question, "the attempt question"));
    const asked = this.#asked.get(row.attempt_id) ?? [];
    this.#asked.set(
      row.attempt_id,
      asked.map((q) => (q.seq === row.seq ? row : q)),
    );
    return row;
  }

  async askQuestion(
    pod: PodId,
    attempt: AttemptId,
    question: NewAttemptQuestion,
    options: { readonly seq?: number } = {},
  ): Promise<AttemptQuestion> {
    // No await from here to the write, as the attempt lock holds it in PostgresStore.
    const { asked } = this.#playing(pod, attempt);
    if (asked.some((q) => q.ended === null)) {
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question is still open");
    }
    if (options.seq !== undefined && options.seq !== asked.length + 1) {
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question took this seq");
    }
    this.#inPod(this.#questions, pod, question.lesson_question_id, "the lesson question");
    const seq = asked.length + 1;
    const planned = question.added === "planned";
    if (
      planned !== (question.placed === null) ||
      planned !== (question.added_for === null) ||
      (question.added_for !== null && !asked.some((q) => q.seq === question.added_for))
    ) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "an added question names where it went and what for",
      );
    }
    const row = this.#newQuestion(pod, attempt, seq, question);
    this.#asked.set(attempt, [...asked, row]);
    return row;
  }

  async appendAttemptAnswer(
    pod: PodId,
    answer: NewAttemptAnswer,
    options: { readonly end?: Ended } = {},
  ): Promise<{ readonly answer: AttemptAnswer; readonly replayed: boolean }> {
    // No await from here to the write: the check that the question is open, the append and the
    // end are one unit, as the locked transaction is in PostgresStore.
    if (options.end !== undefined) parse(Ended, options.end, "how the question ended");
    const stored = this.#answers.get(answer.event_id);
    if (stored) {
      if (
        stored.pod_id === pod &&
        stored.body_hash === answer.body_hash &&
        stored.attempt_id === answer.attempt_id &&
        stored.seq === answer.seq &&
        stored.try_no === answer.try_no &&
        stored.kind === answer.kind
      ) {
        return { answer: stored, replayed: true };
      }
      throw new StoreError(
        ErrorType.enum.EventIdMismatch,
        "this event was already sent with another body",
      );
    }
    const { attempt } = this.#playing(pod, answer.attempt_id);
    if (attempt.status === "paused")
      throw new StoreError(ErrorType.enum.AttemptPaused, "this attempt is paused");
    const question = this.#asking(pod, answer.attempt_id, answer.seq);
    if (question.ended !== null)
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
    const rows = [...this.#answers.values()].filter(
      (a) => a.attempt_id === answer.attempt_id && a.seq === answer.seq,
    );
    if (rows.some((a) => a.try_no === answer.try_no)) {
      throw new StoreError(ErrorType.enum.AnswerConflict, "this try was already answered");
    }
    if (answer.try_no !== rows.length + 1) {
      throw new StoreError(ErrorType.enum.TryOutOfOrder, "this is not the question's next try");
    }
    const row = frozen(
      parse(
        AttemptAnswer,
        {
          ...answer,
          asked_at: utc(answer.asked_at),
          answered_at: utc(answer.answered_at),
          pod_id: pod,
          help_used: question.help_released,
        },
        "the answer",
      ),
    );
    if (Date.parse(row.answered_at) < Date.parse(row.asked_at)) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "an answer is given after its question is asked",
      );
    }
    if (
      (row.kind === "skip") !== (row.skip_reason !== null) ||
      (row.kind === "try") !== (row.value !== null) ||
      (row.kind === "skip" && row.correct !== null)
    ) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "a try carries a value and a skip its reason",
      );
    }
    const { family } = this.#inPod(
      this.#questions,
      pod,
      question.lesson_question_id,
      "the lesson question",
    );
    if (row.kind === "try" && !valueFor(family).safeParse(row.value).success) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        `the value is not a value of the ${family} family`,
      );
    }
    if (options.end === "missed") this.#mayMiss(pod, answer.attempt_id, answer.seq, row);
    this.#answers.set(row.event_id, row);
    if (options.end !== undefined) this.#replace({ ...question, ended: options.end });
    return { answer: row, replayed: false };
  }

  async releaseHelp(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    seen: number,
    options: { readonly twin?: HelpTwin } = {},
  ): Promise<{ readonly question: AttemptQuestion; readonly released: boolean }> {
    // No await from here to the writes: the release, the skip and the end are one unit.
    const question = this.#asking(pod, attempt, seq);
    if (seen !== question.help_released) return { question, released: false };
    if (question.ended !== null)
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
    if (question.help_released >= 4) return { question, released: false };
    const help_released = question.help_released + 1;
    if (help_released === 4 && !options.twin) throw lastRungNeedsTwin();
    if (!options.twin) {
      return { question: this.#replace({ ...question, help_released }), released: true };
    }
    const twin = options.twin;
    if (this.#answers.has(twin.event_id)) {
      throw new StoreError(ErrorType.enum.EventIdMismatch, "this event was already sent");
    }
    const next =
      [...this.#answers.values()].filter((a) => a.attempt_id === attempt && a.seq === seq).length +
      1;
    if ((twin.try_no ?? next) !== next) {
      throw new StoreError(ErrorType.enum.TryOutOfOrder, "this is not the question's next try");
    }
    const skip = frozen(
      parse(
        AttemptAnswer,
        {
          ...twin,
          asked_at: utc(twin.asked_at),
          answered_at: utc(twin.answered_at),
          pod_id: pod,
          attempt_id: attempt,
          seq,
          try_no: next,
          kind: "skip",
          value: null,
          skip_reason: "help_twin",
          help_used: help_released,
          correct: null,
          mistake_class: null,
          parts: null,
          judged_by: null,
        },
        "the help twin skip",
      ),
    );
    if (Date.parse(skip.answered_at) < Date.parse(skip.asked_at)) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "an answer is given after its question is asked",
      );
    }
    this.#answers.set(skip.event_id, skip);
    const row = this.#replace({ ...question, help_released, ended: "skipped" });
    return { question: row, released: true };
  }

  async endAttemptQuestion(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    ended: Ended,
  ): Promise<AttemptQuestion> {
    const question = this.#asking(pod, attempt, seq);
    parse(Ended, ended, "how the question ended");
    if (question.ended === ended) return question;
    if (question.ended !== null)
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
    if (ended === "missed") this.#mayMiss(pod, attempt, seq);
    return this.#replace({ ...question, ended });
  }

  /**
   * `missed` only while verdicts are held, after a wrong try and no right one, as the
   * `attempt_question_missed` trigger refuses it (migration 20261027210000_ended_missed.sql).
   */
  #mayMiss(pod: PodId, attempt: AttemptId, seq: number, appending?: AttemptAnswer): void {
    const { assignment_id } = this.#inPod(this.#attempts, pod, attempt, "the attempt");
    if (!this.#inPod(this.#assignments, pod, assignment_id, "the assignment").hold_verdicts) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "a question ends missed only while its assignment holds verdicts",
      );
    }
    const tries = [...this.#answers.values(), ...(appending ? [appending] : [])].filter(
      (a) => a.attempt_id === attempt && a.seq === seq && a.kind === "try",
    );
    if (!tries.some((a) => a.correct === false) || tries.some((a) => a.correct === true)) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "a question ends missed only after a wrong try and no right one",
      );
    }
  }

  async setAttemptStatus(
    pod: PodId,
    attempt: AttemptId,
    status: "paused" | "in_progress",
    resume_at?: number | null,
  ): Promise<Attempt> {
    const { attempt: stored } = this.#playing(pod, attempt);
    const row = frozen(
      parse(
        Attempt,
        { ...stored, status, resume_at: resume_at === undefined ? stored.resume_at : resume_at },
        "the attempt",
      ),
    );
    this.#attempts.set(row.id, row);
    return row;
  }

  async finishAttempt(pod: PodId, attempt: AttemptId): Promise<Attempt> {
    const { attempt: stored, asked } = this.#playing(pod, attempt);
    if (asked.some((q) => q.ended === null)) {
      throw new StoreError(ErrorType.enum.QuestionNotOpen, "a question is still open");
    }
    const row = frozen({ ...stored, status: "finished" as const, finished_at: this.#at() });
    this.#attempts.set(row.id, row);
    return row;
  }

  async getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]> {
    const { questions, answers } = await this.getAttempt(pod, attempt);
    return attemptResults(questions, answers, (id) => this.#questions.get(id));
  }

  async findMember(sub: Uuid): Promise<MemberScope | undefined> {
    return this.#member(sub);
  }

  #member(sub: Uuid): MemberScope | undefined {
    const account = [...this.#accounts.values()].find((a) => a.sub === sub);
    if (!account) return undefined;
    // The oldest member row, as app.member_pod orders them.
    const member = [...this.#members.values()]
      .filter((m) => m.account_id === account.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || (a.id < b.id ? -1 : 1))[0];
    return member && { pod: member.pod_id, account: account.id };
  }

  async createAccount(sub: Uuid, language: Language): Promise<MemberScope> {
    // No await until the account is in: 2 sign-ins at once make one.
    const found = this.#member(sub);
    if (found) return found;
    const at = this.#at();
    const pod = frozen(
      parse(
        Pod,
        {
          id: mint(PodId, ID_PREFIXES.pod),
          name: "home",
          language,
          created_at: at,
          ai_consent_at: null,
        },
        "the pod",
      ),
    );
    this.#pods.set(pod.id, pod);
    const account = frozen(
      parse(
        Account,
        { id: mint(AccountId, ID_PREFIXES.account), pod_id: pod.id, sub, created_at: at },
        "the account",
      ),
    );
    const member = frozen(
      parse(
        Member,
        {
          id: mint(MemberId, ID_PREFIXES.member),
          pod_id: pod.id,
          account_id: account.id,
          role: "parent",
          created_at: at,
        },
        "the member",
      ),
    );
    this.#accounts.set(account.id, account);
    this.#members.set(member.id, member);
    return { pod: pod.id, account: account.id };
  }

  async getMe(pod: PodId, account: AccountId): Promise<Me> {
    const row = this.#inPod(this.#accounts, pod, account, "the account");
    const member = [...this.#members.values()].find(
      (m) => m.pod_id === pod && m.account_id === row.id,
    );
    if (!member) throw notFound("the member");
    const learners = [...this.#learners.values()]
      .filter((l) => l.pod_id === pod)
      .sort(byAge)
      .map((learner) => this.#snapshot(learner));
    return { account: row, member, pod: this.#pod(pod), learners };
  }

  async getPod(pod: PodId): Promise<Pod> {
    return this.#pod(pod);
  }

  async setAiConsent(pod: PodId, consented: boolean): Promise<Pod> {
    const row = this.#pod(pod);
    const ai_consent_at = consented ? (row.ai_consent_at ?? this.#at()) : null;
    const next = frozen({ ...row, ai_consent_at });
    this.#pods.set(pod, next);
    return next;
  }

  #snapshot(learner: Learner): LearnerSnapshot {
    const goals = [...this.#goals.values()].filter((g) => g.learner_id === learner.id).sort(byAge);
    return { learner, goals };
  }

  async addLearner(pod: PodId, learner: NewLearnerWithGoals): Promise<LearnerSnapshot> {
    this.#pod(pod);
    const taken = new Set(
      [...this.#learners.values()].filter((l) => l.pod_id === pod).map((l) => l.handle),
    );
    const row = await this.putLearner(pod, {
      handle: handleFor(learner.first_name, taken),
      first_name: learner.first_name,
      age_group: learner.age_group ?? null,
    });
    for (const name of learner.goals ?? []) {
      const goal = frozen(
        parse(
          Goal,
          {
            id: mint(GoalId, ID_PREFIXES.goal),
            pod_id: pod,
            learner_id: row.id,
            name,
            words: null,
            lesson_language: "pl",
            status: "active",
            created_at: this.#at(),
          },
          "the goal",
        ),
      );
      this.#goals.set(goal.id, goal);
    }
    return this.#snapshot(row);
  }

  async claimAttempt(pod: PodId, claim: NewClaim): Promise<Attempt> {
    const learner = this.#learners.get(claim.learner);
    const member = [...this.#members.values()].find(
      (m) => m.pod_id === pod && m.account_id === claim.account,
    );
    if (learner?.pod_id !== pod || !member) throw notFound("the learner in the caller's pod");
    // The attempt may be in any pod: a featured lesson's is in Jadwigo's.
    const attempt = this.#attempts.get(claim.attempt);
    if (!attempt) throw notFound("the attempt");
    if (attempt.learner_id === claim.learner && attempt.claimed_by === claim.account)
      return attempt;
    if (attempt.learner_id !== null || (attempt.claimed_by ?? null) !== null) {
      throw new StoreError(ErrorType.enum.AttemptClaimed, "this attempt already has a learner");
    }
    if (attempt.mode === "preview") {
      throw new StoreError(ErrorType.enum.AttemptPreview, "a preview attempt is never claimed");
    }
    const row = frozen({
      ...attempt,
      learner_id: learner.id,
      claimed_by: claim.account,
      claimed_at: this.#at(),
    });
    this.#attempts.set(row.id, row);
    return row;
  }

  async getLearnerAttempts(pod: PodId, learner: LearnerId): Promise<LearnerAttempts> {
    const row = this.#inPod(this.#learners, pod, learner, "the learner");
    const attempts = [...this.#attempts.values()]
      .filter((a) => a.learner_id === row.id)
      .sort((a, b) => b.started_at.localeCompare(a.started_at) || (a.id < b.id ? 1 : -1))
      .map((attempt) => {
        const version = this.#versions.get(attempt.lesson_version_id);
        const lesson = version && this.#lessons.get(version.lesson_id);
        if (!lesson) throw notFound("the attempt's lesson");
        const results = this.#results(attempt.id);
        return { attempt, title: lesson.title, language: lesson.language, results };
      });
    return { learner: row, attempts };
  }

  async getAssignmentAttempts(pod: PodId, id: AssignmentId): Promise<AssignmentAttempts> {
    // Row-level security by hand: pod_scope reads the pod's own attempts, claimed_read those its
    // learners claimed, and the assignment and its lesson come with either.
    const learnerOf = (attempt: Attempt) => {
      const learner =
        attempt.learner_id === null ? undefined : this.#learners.get(attempt.learner_id);
      return learner?.pod_id === pod ? learner : undefined;
    };
    const visible = [...this.#attempts.values()].filter(
      (a) => a.assignment_id === id && (a.pod_id === pod || learnerOf(a) !== undefined),
    );
    const assignment = this.#assignments.get(id);
    if (!assignment || (assignment.pod_id !== pod && visible.length === 0))
      throw notFound("the assignment");
    const lesson = this.#lessons.get(assignment.lesson_id);
    if (!lesson) throw notFound("the assignment's lesson");
    const attempts = visible
      .filter((a) => a.mode === "real")
      .sort((a, b) => b.started_at.localeCompare(a.started_at) || (a.id < b.id ? 1 : -1))
      .slice(0, LIMITS.attemptsPerAssignment)
      .map((attempt) => ({
        attempt,
        name: learnerOf(attempt)?.first_name ?? attempt.player_name,
        results: this.#results(attempt.id),
      }));
    return { assignment, title: lesson.title, language: lesson.language, attempts };
  }

  // The learner knowledge base

  async findLearnerPod(id: LearnerId): Promise<PodId | undefined> {
    return this.#learners.get(id)?.pod_id;
  }

  async listSkills(pod: PodId): Promise<readonly Skill[]> {
    this.#pod(pod);
    const byCode = new Map<string, Skill>();
    for (const skill of this.#skills.values()) {
      if (skill.pod_id === FEATURED_POD_ID && !byCode.has(skill.code))
        byCode.set(skill.code, skill);
      if (skill.pod_id === pod) byCode.set(skill.code, skill);
    }
    return [...byCode.values()].sort((a, b) => (a.code < b.code ? -1 : 1));
  }

  async putCurriculum(pod: PodId, curriculum: NewCurriculum): Promise<Curriculum> {
    this.#pod(pod);
    const key = `${pod} ${curriculum.code} ${curriculum.version}`;
    const stored = this.#curricula.get(key);
    if (stored) return stored;
    const row = frozen(
      parse(
        Curriculum,
        {
          ...curriculum,
          id: mint(CurriculumId, ID_PREFIXES.curriculum),
          pod_id: pod,
          created_at: this.#at(),
        },
        "the curriculum",
      ),
    );
    this.#curricula.set(key, row);
    return row;
  }

  async putTopics(pod: PodId, topics: readonly NewTopic[]): Promise<readonly Topic[]> {
    this.#pod(pod);
    const curricula = new Set(
      [...this.#curricula.values()].filter((c) => c.pod_id === pod).map((c) => c.id),
    );
    for (const topic of topics) {
      if (!curricula.has(topic.curriculum_id)) throw notFound("the curriculum");
    }
    return topics.map((topic) => {
      const key = `${topic.curriculum_id} ${topic.code}`;
      const stored = this.#topics.get(key);
      if (stored) return stored;
      const row = frozen(
        parse(
          Topic,
          { ...topic, id: mint(TopicId, ID_PREFIXES.topic), pod_id: pod, created_at: this.#at() },
          "the topic",
        ),
      );
      this.#topics.set(key, row);
      return row;
    });
  }

  async putSkills(pod: PodId, skills: readonly NewSkill[]): Promise<readonly Skill[]> {
    this.#pod(pod);
    const rows = skills.map((skill) => {
      const stored = this.#skills.get(`${pod} ${skill.code}`);
      return (
        stored ??
        frozen(parse(Skill, { ...skill, pod_id: pod, created_at: this.#at() }, "the skill"))
      );
    });
    for (const row of rows) this.#skills.set(`${pod} ${row.code}`, row);
    return rows;
  }

  async ensureSkills(pod: PodId, codes: readonly SkillId[]): Promise<readonly Skill[]> {
    this.#pod(pod);
    const rows = codes.map((code) => {
      const stored = this.#skills.get(`${pod} ${code}`);
      if (stored) return stored;
      const shared = this.#skills.get(`${FEATURED_POD_ID} ${code}`);
      const row = frozen(
        parse(
          Skill,
          {
            ...(shared ?? {
              code,
              topic_id: null,
              kind: "accuracy",
              status: "draft",
              can_do: null,
              aliases: [],
              prerequisites: [],
              source: "pod",
            }),
            pod_id: pod,
            created_at: this.#at(),
          },
          "the skill",
        ),
      );
      this.#skills.set(`${pod} ${code}`, row);
      return row;
    });
    return rows;
  }

  async getLearnerEvidence(
    pod: PodId,
    learner: LearnerId,
  ): Promise<readonly LearnerSkillEvidence[]> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    // Row-level security by hand: the learner is the pod's, so the pod reads each of its attempts,
    // its own or one it claimed (claimed_read), and app.asked_skills lets it read their skill codes.
    const rows: LearnerSkillEvidence[] = [];
    for (const attempt of this.#attempts.values()) {
      if (attempt.learner_id !== learner || attempt.mode !== "real") continue;
      const assignment = this.#assignments.get(attempt.assignment_id);
      const version = this.#versions.get(attempt.lesson_version_id);
      const lesson = version && this.#lessons.get(version.lesson_id);
      if (!assignment || !lesson) throw notFound("the attempt's lesson");
      const asked = this.#asked.get(attempt.id) ?? [];
      for (const answer of this.#answers.values()) {
        if (answer.attempt_id !== attempt.id) continue;
        if (answer.kind !== "skip" && answer.correct === null) continue;
        const question = asked.find((q) => q.seq === answer.seq);
        const skillIds = question && this.#questions.get(question.lesson_question_id)?.skill_ids;
        for (const skill_code of skillIds ?? []) {
          rows.push({
            pod_id: attempt.pod_id,
            learner_id: learner,
            attempt_id: attempt.id,
            seq: answer.seq,
            try_no: answer.try_no,
            kind: answer.kind,
            skill_code,
            answered_at: answer.answered_at,
            correct: answer.correct,
            help_used: answer.help_used,
            latency_ms: answer.latency_ms,
            mistake_class: answer.mistake_class,
            added: question?.added ?? "planned",
            lesson_kind: lesson.kind,
            hold_verdicts: assignment.hold_verdicts,
          });
        }
      }
    }
    return rows.sort(
      (a, b) =>
        a.answered_at.localeCompare(b.answered_at) ||
        (a.attempt_id < b.attempt_id ? -1 : a.attempt_id > b.attempt_id ? 1 : 0) ||
        a.seq - b.seq ||
        a.try_no - b.try_no ||
        (a.skill_code < b.skill_code ? -1 : a.skill_code > b.skill_code ? 1 : 0),
    );
  }

  async replaceMastery(
    pod: PodId,
    learner: LearnerId,
    rows: readonly NewLearnerSkillMastery[],
  ): Promise<readonly LearnerSkillMastery[]> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    const computed_at = this.#at();
    const written = rows
      .map((row) =>
        frozen(
          parse(
            LearnerSkillMastery,
            { ...row, pod_id: pod, learner_id: learner, computed_at },
            "a mastery row",
          ),
        ),
      )
      .sort((a, b) => (a.skill_code < b.skill_code ? -1 : 1));
    if (new Set(written.map((r) => r.skill_code)).size !== written.length) {
      throw new StoreError(ErrorType.enum.BadRequest, "a skill code repeats in the mastery rows");
    }
    this.#mastery.set(learner, written);
    return written;
  }

  async lockLearner(pod: PodId, learner: LearnerId): Promise<void> {
    // Each call here is already one unit, and nothing runs between them: the check is all.
    this.#inPod(this.#learners, pod, learner, "the learner");
  }

  async getMastery(pod: PodId, learner: LearnerId): Promise<readonly LearnerSkillMastery[]> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    return [...(this.#mastery.get(learner) ?? [])];
  }

  async listGoals(pod: PodId, learner: LearnerId): Promise<readonly GoalWithSkills[]> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    return [...this.#goals.values()]
      .filter((g) => g.learner_id === learner)
      .sort(byAge)
      .map((goal) => this.#withSkills(goal));
  }

  #withSkills(goal: Goal): GoalWithSkills {
    return { goal, skill_codes: [...(this.#goalSkills.get(goal.id) ?? [])].sort() };
  }

  async addGoal(pod: PodId, learner: LearnerId, goal: NewGoal): Promise<GoalWithSkills> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    const row = frozen(
      parse(
        Goal,
        {
          id: mint(GoalId, ID_PREFIXES.goal),
          pod_id: pod,
          learner_id: learner,
          name: goal.name,
          words: goal.words ?? null,
          lesson_language: goal.lesson_language ?? "pl",
          status: "active",
          created_at: this.#at(),
        },
        "the goal",
      ),
    );
    const codes = [...new Set(goal.skill_codes)];
    await this.ensureSkills(pod, codes);
    this.#goals.set(row.id, row);
    this.#goalSkills.set(row.id, codes);
    return this.#withSkills(row);
  }

  async updateGoal(
    pod: PodId,
    learner: LearnerId,
    goal: GoalId,
    change: GoalChange,
  ): Promise<GoalWithSkills> {
    const stored = this.#inPod(this.#goals, pod, goal, "the goal");
    if (stored.learner_id !== learner) throw notFound("the goal");
    const row = frozen(
      parse(
        Goal,
        {
          ...stored,
          ...(change.status === undefined ? {} : { status: change.status }),
        },
        "the goal",
      ),
    );
    if (change.skill_codes !== undefined) {
      const codes = [...new Set(change.skill_codes)];
      await this.ensureSkills(pod, codes);
      this.#goalSkills.set(row.id, codes);
    }
    this.#goals.set(row.id, row);
    return this.#withSkills(row);
  }

  async putReport(pod: PodId, report: NewLearnerReport): Promise<LearnerReport> {
    this.#inPod(this.#learners, pod, report.learner_id, "the learner");
    if (Date.parse(report.period_ends_at) < Date.parse(report.period_starts_at)) {
      throw new StoreError(ErrorType.enum.BadRequest, "a report's period ends before it starts");
    }
    const row = frozen(
      parse(
        LearnerReport,
        {
          ...report,
          id: mint(LearnerReportId, ID_PREFIXES.learner_report),
          pod_id: pod,
          narrative: null,
          decisions: [],
          created_at: this.#at(),
        },
        "the report",
      ),
    );
    this.#reports.set(row.id, row);
    return row;
  }

  async listReports(pod: PodId, learner: LearnerId): Promise<readonly LearnerReport[]> {
    this.#inPod(this.#learners, pod, learner, "the learner");
    // Newest first; 2 written at the same instant, the later written first.
    return [...this.#reports.values()]
      .filter((r) => r.learner_id === learner)
      .reverse()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, LIMITS.reportsPerLearner);
  }

  async updateReport(
    pod: PodId,
    learner: LearnerId,
    report: LearnerReportId,
    change: ReportChange,
  ): Promise<LearnerReport> {
    const stored = this.#inPod(this.#reports, pod, report, "the report");
    if (stored.learner_id !== learner) throw notFound("the report");
    const proposals = new Set(stored.digest.proposals.map((p) => p.id));
    for (const decision of change.decisions ?? []) {
      if (!proposals.has(decision.proposal_id)) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          `the report has no proposal ${decision.proposal_id}`,
        );
      }
    }
    let narrative = stored.narrative;
    if (change.narrative !== undefined) {
      if (narrative !== null && JSON.stringify(narrative) !== JSON.stringify(change.narrative)) {
        throw new StoreError(ErrorType.enum.WriteOnce, "this report already has its narrative");
      }
      narrative = change.narrative;
    }
    const decided_at = this.#at();
    const decisions: ProposalDecision[] = [
      ...stored.decisions,
      ...(change.decisions ?? []).map((d) => ({ ...d, decided_at })),
    ];
    const row = frozen(parse(LearnerReport, { ...stored, narrative, decisions }, "the report"));
    this.#reports.set(row.id, row);
    return row;
  }

  /** An attempt's `attempt_result` rows, in `seq` order. */
  #results(attempt: AttemptId): AttemptResult[] {
    const answers = [...this.#answers.values()]
      .filter((a) => a.attempt_id === attempt)
      .sort((a, b) => a.seq - b.seq || a.try_no - b.try_no);
    return [
      ...attemptResults(this.#asked.get(attempt) ?? [], answers, (id) => this.#questions.get(id)),
    ];
  }

  // The engine's records (dl-z5ja.12 step 0, filled by dl-z5ja.14).

  async findRunPod(id: RunId): Promise<PodId | undefined> {
    return this.#runs.get(id)?.pod_id;
  }

  async listRunsDue(now: string): Promise<readonly { pod: PodId; run: Run }[]> {
    const at = Date.parse(now);
    const due = (deadline: string | null) => deadline !== null && Date.parse(deadline) <= at;
    return [...this.#runs.values()]
      .filter((r) => !ENDED.has(r.status) && (due(r.idle_deadline_at) || due(r.max_deadline_at)))
      .map((run) => ({ pod: run.pod_id, run }));
  }

  async spentUsd(workflows: readonly RunWorkflow[], since: string): Promise<number> {
    const from = Date.parse(utc(since));
    let total = 0;
    for (const run of this.#runs.values()) {
      if (!workflows.includes(run.workflow)) continue;
      for (const event of this.#runEvents.get(run.id) ?? [])
        if (event.type === "model_response" && Date.parse(event.created_at) >= from)
          total += event.payload.cost_usd;
    }
    return total;
  }

  async createConversation(pod: PodId, conversation: NewConversation): Promise<Conversation> {
    this.#pod(pod);
    const stored = this.#taken(this.#conversations, pod, conversation.id);
    if (stored) return stored;
    const row = frozen(
      parse(
        Conversation,
        { ...conversation, pod_id: pod, created_at: this.#at(), archived_at: null },
        "the conversation",
      ),
    );
    this.#conversations.set(row.id, row);
    return row;
  }

  async getConversation(pod: PodId, conversation: ConversationId): Promise<Conversation> {
    return this.#inPod(this.#conversations, pod, conversation, "the conversation");
  }

  async listConversations(
    pod: PodId,
    { includeArchived = false }: { readonly includeArchived?: boolean } = {},
  ): Promise<readonly Conversation[]> {
    return [...this.#conversations.values()]
      .filter((c) => c.pod_id === pod && (includeArchived || c.archived_at === null))
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || (a.id < b.id ? 1 : -1));
  }

  async archiveConversation(
    pod: PodId,
    conversation: ConversationId,
    at: string,
  ): Promise<Conversation> {
    const stored = this.#inPod(this.#conversations, pod, conversation, "the conversation");
    if (stored.archived_at !== null) return stored;
    const row = frozen(
      parse(Conversation, { ...stored, archived_at: utc(at) }, "the conversation"),
    );
    this.#conversations.set(row.id, row);
    return row;
  }

  async createRun(pod: PodId, run: NewRun): Promise<Run> {
    this.#pod(pod);
    const stored = this.#taken(this.#runs, pod, run.id);
    if (stored) return stored;
    if (run.conversation_id !== null) {
      this.#inPod(this.#conversations, pod, run.conversation_id, "the conversation");
    }
    if (run.resumes !== null) {
      this.#inPod(this.#runs, pod, run.resumes, "the run it resumes");
    }
    const row = frozen(
      parse(
        Run,
        {
          ...run,
          pod_id: pod,
          status: "queued",
          attempt: 1,
          cancel_requested_at: null,
          spent_usd: 0,
          created_at: this.#at(),
          completed_at: null,
        },
        "the run",
      ),
    );
    this.#runs.set(row.id, row);
    this.#runEvents.set(row.id, []);
    return row;
  }

  async listRuns(pod: PodId, conversation: ConversationId): Promise<readonly Run[]> {
    this.#inPod(this.#conversations, pod, conversation, "the conversation");
    // The map keeps creation order, and the sort is stable: runs at one instant stay in it.
    return [...this.#runs.values()].filter((r) => r.conversation_id === conversation).sort(byAge);
  }

  async getRun(pod: PodId, run: RunId): Promise<Run> {
    return this.#inPod(this.#runs, pod, run, "the run");
  }

  async updateRun(
    pod: PodId,
    run: RunId,
    attempt: number,
    change: RunChange,
  ): Promise<Fenced<Run>> {
    const stored = this.#inPod(this.#runs, pod, run, "the run");
    if (stored.attempt !== attempt) return { stale: true, value: stored };
    const row = frozen(parse(Run, { ...stored, ...change }, "the run"));
    this.#runs.set(row.id, row);
    return { stale: false, value: row };
  }

  async appendRunEvents(
    pod: PodId,
    run: RunId,
    attempt: number,
    events: readonly NewRunEvent[],
  ): Promise<Fenced<readonly RunEvent[]>> {
    const stored = this.#inPod(this.#runs, pod, run, "the run");
    if (events.some((e) => e.run_id !== run)) {
      throw new StoreError(ErrorType.enum.BadRequest, "an event belongs to another run");
    }
    if (stored.attempt !== attempt) return { stale: true, value: [] };
    const log = this.#runEvents.get(run) ?? [];
    const held = new Map(log.map((e) => [e.event_id, e]));
    // Every row is checked before any is kept, so a refused batch appends nothing.
    const created_at = this.#at();
    const fresh: RunEvent[] = [];
    const answer = events.map((event) => {
      const kept = held.get(event.event_id);
      if (kept) return kept;
      const row = frozen(
        parse(RunEvent, { ...event, seq: log.length + fresh.length + 1, created_at }, "the event"),
      );
      held.set(row.event_id, row);
      fresh.push(row);
      return row;
    });
    this.#runEvents.set(run, [...log, ...fresh]);
    return { stale: false, value: answer };
  }

  async listRunEvents(pod: PodId, run: RunId, afterSeq: number): Promise<readonly RunEvent[]> {
    this.#inPod(this.#runs, pod, run, "the run");
    return (this.#runEvents.get(run) ?? []).filter((e) => e.seq > afterSeq);
  }

  async putRunInbox(pod: PodId, entry: NewRunInbox): Promise<RunInbox> {
    this.#inPod(this.#runs, pod, entry.run_id, "the run");
    // Unique per pod, not across pods (dl-z5ja.86): another pod's row is never this one.
    const stored = this.#inbox.get(inboxKey(pod, entry.event_id));
    // A replay is the same run's: an event_id is unique across a pod's runs (dl-z5ja.36).
    if (stored && stored.run_id !== entry.run_id) {
      throw new StoreError(ErrorType.enum.WriteOnce, "that id is already taken");
    }
    if (stored) return stored;
    const row = frozen(
      parse(
        RunInbox,
        { ...entry, pod_id: pod, status: "pending", created_at: this.#at() },
        "the inbox row",
      ),
    );
    this.#inbox.set(inboxKey(pod, row.event_id), row);
    return row;
  }

  async messageUsage(pod: PodId, account: AccountId, since: UsageSince): Promise<MessageUsage> {
    this.#pod(pod);
    const minute = Date.parse(since.minuteSince);
    const day = Date.parse(since.daySince);
    let messages = 0;
    for (const row of this.#inbox.values()) {
      if (row.pod_id !== pod || (row.kind !== "message" && row.kind !== "steer")) continue;
      if (Date.parse(row.created_at) < minute) continue;
      if (this.#runs.get(row.run_id)?.created_by === account) messages += 1;
    }
    let cap_usd = 0;
    for (const run of this.#runs.values()) {
      if (run.pod_id === pod && Date.parse(run.created_at) >= day) cap_usd += run.cap_usd;
    }
    return { messages, cap_usd };
  }

  async takeRunInbox(pod: PodId, run: RunId): Promise<readonly RunInbox[]> {
    this.#inPod(this.#runs, pod, run, "the run");
    const taken: RunInbox[] = [];
    for (const row of this.#inbox.values()) {
      if (row.run_id !== run || row.status !== "pending") continue;
      const delivered = frozen({ ...row, status: "delivered" as const });
      this.#inbox.set(inboxKey(row.pod_id, row.event_id), delivered);
      taken.push(delivered);
    }
    return taken;
  }
}

/** Oldest first; a tie keeps the order they were written in (the sort is stable). */
function byAge(a: { created_at: string }, b: { created_at: string }) {
  return a.created_at.localeCompare(b.created_at);
}
