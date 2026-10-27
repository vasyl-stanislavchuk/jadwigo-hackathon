import {
  Assignment,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  type AttemptResult,
  type Ended,
  ID_PREFIXES,
  type IdPrefix,
  idOf,
  Learner,
  LearnerId,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  type LessonVersionQuestion,
  Pod,
  type PodId,
} from "@jadwigo/contracts";
import { attemptResults } from "./result.ts";
import {
  type AttemptRecord,
  type LessonVersionWithQuestions,
  type NewAssignment,
  type NewAttempt,
  type NewAttemptAnswer,
  type NewAttemptQuestion,
  type NewLearner,
  type NewLesson,
  type NewLessonQuestion,
  type NewLessonVersion,
  type NewPod,
  type Store,
  StoreError,
} from "./store.ts";

/** A Zod schema as this file uses it: parse, and say why not. */
interface Schema<T> {
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { message: string } };
}

/** A record the stored state accepts, or `BadRequest`, as a database check refuses a row. */
function parse<T>(schema: Schema<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new StoreError("BadRequest", `${what} is not valid`);
  return result.data;
}

/** A fresh id for a record, a v4 uuid written as the wire id. */
function mint<T>(schema: Schema<T>, prefix: IdPrefix): T {
  return parse(schema, idOf(prefix, crypto.randomUUID()), "a minted id");
}

function notFound(what: string): StoreError {
  return new StoreError("NotFound", `${what} was not found`);
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
  readonly #lessons = new Map<string, Lesson>();
  readonly #versions = new Map<string, LessonVersion>();
  /** By version id, in `position` order. */
  readonly #lists = new Map<string, LessonVersionQuestion[]>();
  readonly #questions = new Map<string, LessonQuestion>();
  readonly #assignments = new Map<string, Assignment>();
  readonly #attempts = new Map<string, Attempt>();
  /** By attempt id, in `seq` order. */
  readonly #asked = new Map<string, AttemptQuestion[]>();
  /** By event id: the key a replay is matched on, across every pod. */
  readonly #answers = new Map<string, AttemptAnswer>();

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
    if (row && row.pod_id !== pod) throw new StoreError("WriteOnce", "that id is already taken");
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

  async putPod(pod: NewPod): Promise<Pod> {
    const stored = this.#pods.get(pod.id);
    if (stored) return stored;
    const row = frozen(parse(Pod, { ...pod, created_at: this.#at() }, "the pod"));
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
        { age_group: null, created_at: this.#at(), ...learner, id, pod_id: pod },
        "the learner",
      ),
    );
    for (const other of this.#learners.values()) {
      if (other.pod_id === pod && other.handle === row.handle) {
        throw new StoreError("WriteOnce", "another learner in the pod has that handle");
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
      throw new StoreError("WriteOnce", "a lesson question is written once; an edit is a new one");
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
      if (stored) return stored;
    }
    const roles = version.questions.map((q) => q.role);
    if (!roles.includes("planned")) {
      throw new StoreError("BadRequest", "a version plans at least one question");
    }
    if (roles.indexOf("spare") !== -1 && roles.lastIndexOf("planned") > roles.indexOf("spare")) {
      throw new StoreError("BadRequest", "the planned questions come before the spares");
    }
    for (const q of version.questions) {
      this.#inPod(this.#questions, pod, q.lesson_question_id, "a lesson question on the list");
    }
    const latest = await this.getLatestLessonVersion(pod, lesson.id);
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
    return { version, questions };
  }

  async getLatestLessonVersion(pod: PodId, lesson: LessonId): Promise<LessonVersion | undefined> {
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
      throw new StoreError("BadRequest", "an assignment closes after it opens");
    }
    this.#assignments.set(row.id, row);
    return row;
  }

  async getAssignment(pod: PodId, id: AssignmentId): Promise<Assignment> {
    return this.#inPod(this.#assignments, pod, id, "the assignment");
  }

  async startAttempt(pod: PodId, attempt: NewAttempt): Promise<AttemptRecord> {
    const assignment = this.#inPod(this.#assignments, pod, attempt.assignment_id, "the assignment");
    if (attempt.id && this.#taken(this.#attempts, pod, attempt.id)) {
      return this.getAttempt(pod, attempt.id);
    }
    const now = this.#now().getTime();
    if (
      (assignment.opens_at !== null && now < Date.parse(assignment.opens_at)) ||
      (assignment.closes_at !== null && now >= Date.parse(assignment.closes_at))
    ) {
      throw new StoreError("AssignmentClosed", "this assignment is not open now");
    }
    const version =
      assignment.lesson_version_id !== null
        ? this.#inPod(this.#versions, pod, assignment.lesson_version_id, "the lesson version")
        : await this.getLatestLessonVersion(pod, assignment.lesson_id);
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
      throw new StoreError("AttemptFinished", "this attempt is finished");
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
    const row = frozen(question);
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
  ): Promise<AttemptQuestion> {
    const { asked } = this.#playing(pod, attempt);
    if (asked.some((q) => q.ended === null)) {
      throw new StoreError("QuestionNotOpen", "another question is still open");
    }
    this.#inPod(this.#questions, pod, question.lesson_question_id, "the lesson question");
    const seq = asked.length + 1;
    const planned = question.added === "planned";
    if (
      planned !== (question.placed === null) ||
      planned !== (question.added_for === null) ||
      (question.added_for !== null && !asked.some((q) => q.seq === question.added_for))
    ) {
      throw new StoreError("BadRequest", "an added question names where it went and what for");
    }
    const row = this.#newQuestion(pod, attempt, seq, question);
    this.#asked.set(attempt, [...asked, row]);
    return row;
  }

  async appendAttemptAnswer(
    pod: PodId,
    answer: NewAttemptAnswer,
  ): Promise<{ readonly answer: AttemptAnswer; readonly replayed: boolean }> {
    const stored = this.#answers.get(answer.event_id);
    if (stored) {
      if (stored.pod_id === pod && stored.body_hash === answer.body_hash) {
        return { answer: stored, replayed: true };
      }
      throw new StoreError("EventIdMismatch", "this event was already sent with another body");
    }
    const { attempt } = this.#playing(pod, answer.attempt_id);
    if (attempt.status === "paused")
      throw new StoreError("AttemptPaused", "this attempt is paused");
    const question = this.#asking(pod, answer.attempt_id, answer.seq);
    if (question.ended !== null) throw new StoreError("QuestionNotOpen", "this question has ended");
    const rows = [...this.#answers.values()].filter(
      (a) => a.attempt_id === answer.attempt_id && a.seq === answer.seq,
    );
    if (rows.some((a) => a.try_no === answer.try_no)) {
      throw new StoreError("AnswerConflict", "this try was already answered");
    }
    if (answer.try_no !== rows.length + 1) {
      throw new StoreError("TryOutOfOrder", "this is not the question's next try");
    }
    const row = frozen(
      parse(
        AttemptAnswer,
        { ...answer, pod_id: pod, help_used: question.help_released },
        "the answer",
      ),
    );
    if (
      (row.kind === "skip") !== (row.skip_reason !== null) ||
      (row.kind === "try") !== (row.value !== null) ||
      (row.kind === "skip" && row.correct !== null)
    ) {
      throw new StoreError("BadRequest", "a try carries a value and a skip its reason");
    }
    this.#answers.set(row.event_id, row);
    return { answer: row, replayed: false };
  }

  async releaseHelp(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    seen: number,
  ): Promise<{ readonly question: AttemptQuestion; readonly released: boolean }> {
    const question = this.#asking(pod, attempt, seq);
    if (seen !== question.help_released) return { question, released: false };
    if (question.ended !== null) throw new StoreError("QuestionNotOpen", "this question has ended");
    if (question.help_released >= 4) return { question, released: false };
    const row = this.#replace({ ...question, help_released: question.help_released + 1 });
    return { question: row, released: true };
  }

  async endAttemptQuestion(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    ended: Ended,
  ): Promise<AttemptQuestion> {
    const question = this.#asking(pod, attempt, seq);
    if (question.ended === ended) return question;
    if (question.ended !== null) throw new StoreError("QuestionNotOpen", "this question has ended");
    return this.#replace({ ...question, ended });
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
      throw new StoreError("QuestionNotOpen", "a question is still open");
    }
    const row = frozen({ ...stored, status: "finished" as const, finished_at: this.#at() });
    this.#attempts.set(row.id, row);
    return row;
  }

  async getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]> {
    const { questions, answers } = await this.getAttempt(pod, attempt);
    return attemptResults(questions, answers, (id) => this.#questions.get(id));
  }
}
