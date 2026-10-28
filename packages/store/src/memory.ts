import {
  Assignment,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  type AttemptResult,
  Ended,
  ErrorType,
  ID_PREFIXES,
  type IdPrefix,
  idOf,
  type Language,
  Learner,
  LearnerId,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionExample,
  LessonQuestionExampleId,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  type LessonVersionQuestion,
  Pod,
  type PodId,
  SentAt,
  valueFor,
} from "@jadwigo/contracts";
import { byTypeThenPosition, checkExamples } from "./example.ts";
import { attemptResults } from "./result.ts";
import {
  type AttemptRecord,
  type ExampleWithQuestions,
  type HelpTwin,
  type LessonVersionWithQuestions,
  type NewAssignment,
  type NewAttempt,
  type NewAttemptAnswer,
  type NewAttemptQuestion,
  type NewLearner,
  type NewLesson,
  type NewLessonQuestion,
  type NewLessonQuestionExample,
  type NewLessonVersion,
  type NewPod,
  type OpenAssignment,
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
    return { version, questions };
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
}
