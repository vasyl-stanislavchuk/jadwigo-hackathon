import { AsyncLocalStorage } from "node:async_hooks";
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
  AttemptResult,
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
  Language,
  Learner,
  type LearnerAttempts,
  LearnerId,
  LearnerReport,
  LearnerReportId,
  LearnerSkillEvidence,
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
  LessonVersionQuestion,
  LIMITS,
  type Me,
  Member,
  Pod,
  PodId,
  ProposalDecision,
  ReportNarrative,
  SentAt,
  Skill,
  SkillId,
  Topic,
  TopicId,
  type Uuid,
  uuidOf,
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
} from "@jadwigo/contracts/run";
import {
  CompiledQuery,
  Kysely,
  PostgresDialect,
  type Selectable,
  sql,
  type Updateable,
} from "kysely";
import pg from "pg";
import { COLUMNS, type DB } from "./db/types.ts";
import { byTypeThenPosition, checkExamples } from "./example.ts";
import { handleFor } from "./handle.ts";
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

/** A Zod schema as this file uses it: parse a row read back, or check a record before writing it. */
interface Schema<T> {
  parse(value: unknown): T;
  safeParse(
    value: unknown,
  ): { success: true; data: T } | { success: false; error: { message: string } };
}

/** A connection inside a unit's transaction. */
type Tx = Kysely<DB>;

/**
 * The open unit: its connection, the pod `app.pod_id` holds now (a bare uuid), if any, the
 * versions it read (kept once it commits), and whether it has ended.
 */
interface Unit {
  readonly tx: Tx;
  pod: string | null;
  readonly versions: Map<string, LessonVersionWithQuestions>;
  closed: boolean;
}

/** The published versions kept in process. A version is written once, so a kept one stays true. */
const VERSIONS_KEPT = 64;

/** A bare uuid, the only text spliced into a statement rather than sent as a parameter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The prefix of each id column that is not its own table's `id`. `event_id` stays a bare uuid. */
const PREFIXES: Readonly<Record<string, IdPrefix>> = {
  pod_id: ID_PREFIXES.pod,
  learner_id: ID_PREFIXES.learner,
  lesson_id: ID_PREFIXES.lesson,
  lesson_version_id: ID_PREFIXES.lesson_version,
  revises: ID_PREFIXES.lesson_version,
  lesson_question_id: ID_PREFIXES.lesson_question,
  twin_of: ID_PREFIXES.lesson_question,
  twin: ID_PREFIXES.lesson_question,
  assignment_id: ID_PREFIXES.assignment,
  attempt_id: ID_PREFIXES.attempt,
  account_id: ID_PREFIXES.account,
  claimed_by: ID_PREFIXES.account,
  moved_by: ID_PREFIXES.account,
  goal_id: ID_PREFIXES.goal,
  curriculum_id: ID_PREFIXES.curriculum,
  topic_id: ID_PREFIXES.topic,
  created_by: ID_PREFIXES.account,
  conversation_id: ID_PREFIXES.conversation,
  run_id: ID_PREFIXES.run,
  resumes: ID_PREFIXES.run,
};

/**
 * A row as its record: uuids written as wire ids, times as ISO in UTC to the millisecond (pg reads
 * a `timestamptz` as a Date, which holds milliseconds). `id` takes the table's own prefix.
 */
function read<T>(schema: Schema<T>, row: object, id?: IdPrefix): T {
  const record: Record<string, unknown> = {};
  for (const [column, value] of Object.entries(row)) {
    const prefix = column === "id" ? id : PREFIXES[column];
    if (typeof value === "string" && prefix) record[column] = idOf(prefix, value);
    else if (value instanceof Date) record[column] = value.toISOString();
    else record[column] = value;
  }
  return schema.parse(record);
}

/** A record the stored state accepts, or `BadRequest`, as a database check refuses a row. */
function parse<T>(schema: Schema<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new StoreError(ErrorType.enum.BadRequest, `${what} is not valid`);
  return result.data;
}

/** A sent time in UTC to the millisecond, checked by `SentAt` first, as `memory.ts` keeps it. */
function utc(at: string): string {
  if (!SentAt.safeParse(at).success) {
    throw new StoreError(
      ErrorType.enum.BadRequest,
      `${JSON.stringify(at)} is not a sent time (SentAt)`,
    );
  }
  return new Date(Date.parse(at)).toISOString();
}

/** The 4th release can only be the last rung, whose worked answer must end the question with it. */
function lastRungNeedsTwin(): StoreError {
  return new StoreError(
    ErrorType.enum.BadRequest,
    "the last rung is released with its help twin skip",
  );
}

/** A value no caller can change: a kept version is shared by every request. */
function deepFrozen<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const inner of Object.values(value)) deepFrozen(inner);
    Object.freeze(value);
  }
  return value;
}

/** A jsonb parameter. pg would write a JS array as a Postgres array, so every value is sent as text. */
function json(value: unknown): string | null {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

function mint<T>(schema: Schema<T>, prefix: IdPrefix): T {
  return parse(schema, idOf(prefix, crypto.randomUUID()), "a minted id");
}

function notFound(what: string): StoreError {
  return new StoreError(ErrorType.enum.NotFound, `${what} was not found`);
}

function taken(): StoreError {
  return new StoreError(ErrorType.enum.WriteOnce, "that id is already taken");
}

/** A Postgres error, as pg throws it. */
interface PgError {
  readonly code: string;
  readonly constraint?: string;
  readonly detail?: string;
  readonly message: string;
}

function isPgError(error: unknown): error is PgError {
  return error instanceof Error && typeof (error as Partial<PgError>).code === "string";
}

/**
 * What the database refused, as the Store names it. The store checks each rule before it writes,
 * as InMemoryStore does, so these are the backstop: a race the checks lost, or a rule only the
 * database holds.
 */
export function refusal(error: unknown): unknown {
  if (!isPgError(error)) return error;
  switch (error.code) {
    case "23505": // unique_violation
      if (error.constraint === "attempt_answer_attempt_id_seq_try_no_key") {
        return new StoreError(ErrorType.enum.AnswerConflict, "this try was already answered");
      }
      if (error.constraint === "attempt_answer_pkey") {
        return new StoreError(
          ErrorType.enum.EventIdMismatch,
          "this event was already sent with another body",
        );
      }
      if (error.constraint === "lesson_version_question_lesson_version_id_lesson_question_i_key") {
        return new StoreError(
          ErrorType.enum.BadRequest,
          "a version lists each lesson question once",
        );
      }
      return new StoreError(ErrorType.enum.WriteOnce, error.message);
    case "23503": // foreign_key_violation: the row it names is not in the pod
      return new StoreError(ErrorType.enum.NotFound, error.message);
    case "42501": // a row-level security check: the row names one the pod does not read
      // (20261031130000_learner_knowledge_fix.sql: a skill's topic, a learner's curriculum).
      if (error.message.includes("row-level security")) {
        return new StoreError(ErrorType.enum.NotFound, error.message);
      }
      return error;
    case "P0002": // no_data_found: app.claim_attempt's learner, account or attempt
      return new StoreError(ErrorType.enum.NotFound, error.message);
    case "23502": // not_null_violation
    case "23514": // check_violation, answered_at >= asked_at among them
    case "22P02": // invalid_text_representation: a value outside its enum
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
    case "23001": // restrict_violation: the write-once, `missed`, answer-open and claim triggers
      // An answer to an ended question names its own constraint (migration
      // 20261029100000_answer_question_open.sql): the store's check lost a race.
      if (error.constraint === "attempt_answer_question_open") {
        return new StoreError(ErrorType.enum.QuestionNotOpen, error.message);
      }
      // app.learner_report_once refuses a 2nd narrative: the store's check lost a race.
      if (error.message.includes("already has its narrative")) {
        return new StoreError(ErrorType.enum.WriteOnce, error.message);
      }
      // The claim trigger names its refusal in the detail.
      if (error.detail === "AttemptClaimed" || error.detail === "AttemptPreview") {
        return new StoreError(ErrorType.enum[error.detail], error.message);
      }
      return new StoreError(ErrorType.enum.BadRequest, error.message);
    default:
      return error;
  }
}

/**
 * The Store on Postgres, through Kysely. Each call is one transaction, or a part of the open
 * unit's, run as the `jadwigo_api` role (or `jadwigo_runner`, for the step consumer) with `app.pod_id` set to the pod it is scoped to, so
 * row-level security holds every read and write to that pod. The rules are
 * checked in code first, under row locks, in the order InMemoryStore checks them: the attempt
 * row for asking, answering, pausing and finishing; the attempt question for help, ending and
 * answers; the lesson for publishing. The database's own refusals are mapped by `refusal`.
 */
class PostgresStore implements Store {
  readonly #db: Kysely<DB>;
  readonly #units = new AsyncLocalStorage<Unit>();
  /** Published versions by pod and id, oldest first. */
  readonly #versions = new Map<string, LessonVersionWithQuestions>();
  /** The role every unit runs as: never the owner, never one that bypasses row-level security. */
  readonly #role: DatabaseRole;

  constructor(
    databaseUrl: string,
    { onQuery, role = "jadwigo_api", ...options }: PoolOptions = {},
  ) {
    // The role is spliced into `set local role`, so only a name from the fixed list gets there.
    if (!DATABASE_ROLES.includes(role)) throw new Error(`${role} is not a store role`);
    this.#role = role;
    const pool = new pg.Pool({ connectionString: databaseUrl, ...options });
    // An idle connection that drops (Supavisor closes it, or the socket dies while a Lambda is
    // frozen) emits 'error' on the pool; with no listener that is an uncaught exception. The pool
    // has already discarded the client, so the next query opens a fresh one.
    pool.on("error", (error) => {
      console.error("an idle Postgres connection dropped:", error.message);
    });
    if (onQuery) {
      pool.on("connect", (client) => {
        const query = client.query.bind(client) as (...args: unknown[]) => unknown;
        (client as { query: unknown }).query = (...args: unknown[]) => {
          onQuery(typeof args[0] === "string" ? args[0] : "");
          return query(...args);
        };
      });
    }
    this.#db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
  }

  async close(): Promise<void> {
    await this.#db.destroy();
  }

  unitSql(): UnitSql {
    const unit = this.#units.getStore();
    if (!unit) throw new Error("unitSql() is called inside unit()");
    return {
      query: async <R>(text: string, values: readonly unknown[] = []) => {
        // A handle that outlived its unit would run on a connection another request may hold.
        if (unit.closed) throw new Error("a unitSql() handle outlived its unit");
        const { rows } = await unit.tx.executeQuery<R>(CompiledQuery.raw(text, [...values]));
        return { rows: [...rows] };
      },
    };
  }

  async unit<T>(work: () => Promise<T>): Promise<T> {
    if (this.#units.getStore()) return work();
    try {
      return await this.#open(null, () => work());
    } catch (error) {
      throw refusal(error);
    }
  }

  /**
   * A call's work, in the open unit or in a unit of its own. Inside a unit the pod is set only
   * when it changes; a unit of its own sends its `begin`, role and pod as one statement.
   */
  async #in<T>(pod: PodId | null, work: (tx: Tx) => Promise<T>): Promise<T> {
    const scope = pod === null ? null : uuidOf(ID_PREFIXES.pod, pod);
    try {
      const unit = this.#units.getStore();
      if (!unit) return await this.#open(scope, work);
      // A call that outlived its unit would run on a connection another request may hold.
      if (unit.closed) throw new Error("a Store call outlived its unit");
      if (scope !== null && unit.pod !== scope) {
        await sql`select set_config('app.pod_id', ${scope}, true)`.execute(unit.tx);
        unit.pod = scope;
      }
      return await work(unit.tx);
    } catch (error) {
      throw refusal(error);
    }
  }

  /**
   * One transaction on one connection, run as the store's role, `jadwigo_api` unless it was given
   * `jadwigo_runner` (`set local role`, so the login must be a member of it), with `app.pod_id` set when `pod` is given. Its calls find it
   * through `#units`, so a request on a pool of 1 never waits on a 2nd connection.
   */
  async #open<T>(pod: string | null, work: (tx: Tx) => Promise<T>): Promise<T> {
    if (pod !== null && !UUID.test(pod)) throw notFound("the pod");
    return this.#db.connection().execute(async (tx) => {
      const setPod = pod === null ? "" : `; select set_config('app.pod_id', '${pod}', true)`;
      const unit: Unit = { tx, pod, versions: new Map(), closed: false };
      try {
        // Inside the try, so a failed role or pod never hands the pool an aborted transaction.
        await sql.raw(`begin; set local role ${this.#role}${setPod}`).execute(tx);
        const result = await this.#units.run(unit, () => work(tx));
        await sql`commit`.execute(tx);
        // Only a committed read is kept: a version published in a unit that rolls back is not.
        for (const [key, version] of unit.versions) this.#keep(key, version);
        return result;
      } catch (error) {
        await sql`rollback`.execute(tx).catch(() => undefined);
        throw error;
      } finally {
        unit.closed = true;
      }
    });
  }

  /**
   * Written once, idempotent by id: the stored row when the pod holds the id, else the insert's
   * row. An insert that writes nothing met the id in another pod, which row-level security hides,
   * or lost a race to the same id, which a 2nd look finds.
   */
  async #once<R>(
    find: () => Promise<R | undefined>,
    insert: () => Promise<R | undefined>,
  ): Promise<{ readonly row: R; readonly fresh: boolean }> {
    const stored = await find();
    if (stored) return { row: stored, fresh: false };
    const row = await insert();
    if (row) return { row, fresh: true };
    const raced = await find();
    if (raced) return { row: raced, fresh: false };
    throw taken();
  }

  async findAssignmentPod(id: AssignmentId): Promise<PodId | undefined> {
    return this.#in(null, async (tx) => {
      const { rows } = await sql<{ pod: string | null }>`
        select app.assignment_pod(${uuidOf(ID_PREFIXES.assignment, id)}) as pod
      `.execute(tx);
      const pod = rows[0]?.pod;
      return pod ? PodId.parse(idOf(ID_PREFIXES.pod, pod)) : undefined;
    });
  }

  async openAttempt(id: AttemptId): Promise<OpenedAttempt | undefined> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, id);
    return this.#in(null, async (tx) => {
      // The lookup sets the pod it finds, in the same statement, for the reads after it.
      const { rows } = await sql<{ pod: string }>`
        select set_config('app.pod_id', pod::text, true) as pod
        from app.attempt_pod(${attemptId}) as pod where pod is not null
      `.execute(tx);
      const found = rows[0]?.pod;
      if (found === undefined) return undefined;
      const unit = this.#units.getStore();
      if (unit) unit.pod = found;
      const pod = PodId.parse(idOf(ID_PREFIXES.pod, found));
      // The attempt and its assignment in one read, the attempt locked to the end of the unit:
      // every write to an attempt takes this lock first, so the questions and answers read after
      // it stay what the request sees, and locks are always taken attempt first, question second.
      // The assignment's columns come back prefixed.
      const joined = await sql<Record<string, unknown>>`
        select attempt.*, ${sql.join(
          Object.keys(COLUMNS.assignment).map(
            (column) => sql`assignment.${sql.ref(column)} as ${sql.id(`assignment.${column}`)}`,
          ),
        )}
        from attempt join assignment on assignment.id = attempt.assignment_id
        where attempt.id = ${attemptId}
        for update of attempt
      `.execute(tx);
      const row = joined.rows[0];
      if (!row) return undefined;
      const attempt: Record<string, unknown> = {};
      const assignment: Record<string, unknown> = {};
      for (const [column, value] of Object.entries(row)) {
        if (column.startsWith("assignment.")) assignment[column.slice(11)] = value;
        else attempt[column] = value;
      }
      return {
        pod,
        record: await this.#record(tx, attemptId, attempt),
        assignment: read(Assignment, assignment, ID_PREFIXES.assignment),
      };
    });
  }

  async findAttemptPod(id: AttemptId): Promise<PodId | undefined> {
    return this.#in(null, async (tx) => {
      const { rows } = await sql<{ pod: string | null }>`
        select app.attempt_pod(${uuidOf(ID_PREFIXES.attempt, id)}) as pod
      `.execute(tx);
      const pod = rows[0]?.pod;
      return pod ? PodId.parse(idOf(ID_PREFIXES.pod, pod)) : undefined;
    });
  }

  async putPod(pod: NewPod): Promise<Pod> {
    const id = uuidOf(ID_PREFIXES.pod, pod.id);
    return this.#in(pod.id, async (tx) => {
      const { row } = await this.#once(
        () => tx.selectFrom("pod").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(Pod, { ...pod, created_at: new Date().toISOString() }, "the pod");
          return tx
            .insertInto("pod")
            .values({ id, name: valid.name, language: valid.language })
            .onConflict((oc) => oc.column("id").doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      return read(Pod, row, ID_PREFIXES.pod);
    });
  }

  async putLearner(pod: PodId, learner: NewLearner): Promise<Learner> {
    const wire = learner.id ?? mint(LearnerId, ID_PREFIXES.learner);
    const id = uuidOf(ID_PREFIXES.learner, wire);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const { row } = await this.#once(
        () => tx.selectFrom("learner").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(
            Learner,
            {
              age_group: null,
              country: null,
              curriculum_id: null,
              school_grade: null,
              school_language: null,
              created_at: new Date().toISOString(),
              ...learner,
              id: wire,
              pod_id: pod,
            },
            "the learner",
          );
          return (
            tx
              .insertInto("learner")
              .values({
                id,
                pod_id: uuidOf(ID_PREFIXES.pod, pod),
                handle: valid.handle,
                first_name: valid.first_name,
                age_group: valid.age_group,
                country: valid.country,
                curriculum_id:
                  valid.curriculum_id === null
                    ? null
                    : uuidOf(ID_PREFIXES.curriculum, valid.curriculum_id),
                school_grade: valid.school_grade,
                school_language: valid.school_language,
              })
              // Targeted on purpose (dl-z5ja.99): no target would also swallow a taken
              // (pod_id, handle), which must stay an error.
              .onConflict((oc) => oc.column("id").doNothing())
              .returningAll()
              .executeTakeFirst()
          );
        },
      );
      return read(Learner, row, ID_PREFIXES.learner);
    });
  }

  async putLesson(pod: PodId, lesson: NewLesson): Promise<Lesson> {
    const wire = lesson.id ?? mint(LessonId, ID_PREFIXES.lesson);
    const id = uuidOf(ID_PREFIXES.lesson, wire);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const { row } = await this.#once(
        () => tx.selectFrom("lesson").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(
            Lesson,
            {
              kind: "practice",
              status: "draft",
              reasoning: null,
              created_at: new Date().toISOString(),
              ...lesson,
              id: wire,
              pod_id: pod,
            },
            "the lesson",
          );
          return tx
            .insertInto("lesson")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              title: valid.title,
              language: valid.language,
              kind: valid.kind,
              status: valid.status,
              reasoning: valid.reasoning,
              category: valid.category,
              subject: valid.subject,
              grade: valid.grade,
              skill_ids: [...valid.skill_ids],
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      return read(Lesson, row, ID_PREFIXES.lesson);
    });
  }

  async putLessonQuestion(pod: PodId, question: NewLessonQuestion): Promise<LessonQuestion> {
    const wire = question.id ?? mint(LessonQuestionId, ID_PREFIXES.lesson_question);
    const id = uuidOf(ID_PREFIXES.lesson_question, wire);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const { row, fresh } = await this.#once(
        () => tx.selectFrom("lesson_question").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(
            LessonQuestion,
            { created_at: new Date().toISOString(), ...question, id: wire, pod_id: pod },
            "the lesson question",
          );
          return tx
            .insertInto("lesson_question")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              family: valid.family,
              question_type: valid.question_type,
              say: valid.say,
              data: JSON.stringify(valid.data),
              key: JSON.stringify(valid.key),
              help: JSON.stringify(valid.help),
              credit: json(valid.credit),
              subject: valid.subject,
              grade: valid.grade,
              skill_ids: [...valid.skill_ids],
              twin_of:
                valid.twin_of === null ? null : uuidOf(ID_PREFIXES.lesson_question, valid.twin_of),
              based_on: json(valid.based_on),
              content_hash: valid.content_hash,
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      if (!fresh && row.content_hash !== question.content_hash) {
        throw new StoreError(
          ErrorType.enum.WriteOnce,
          "a lesson question is written once; an edit is a new one",
        );
      }
      return read(LessonQuestion, row, ID_PREFIXES.lesson_question);
    });
  }

  async publishLessonVersion(pod: PodId, version: NewLessonVersion): Promise<LessonVersion> {
    const lessonId = uuidOf(ID_PREFIXES.lesson, version.lesson_id);
    return this.#in(pod, async (tx) => {
      // Locked, so 2 publishes of one lesson take its numbers one after the other.
      const lesson = await tx
        .selectFrom("lesson")
        .select("id")
        .where("id", "=", lessonId)
        .forUpdate()
        .executeTakeFirst();
      if (!lesson) throw notFound("the lesson");
      if (version.id) {
        const stored = await tx
          .selectFrom("lesson_version")
          .selectAll()
          .where("id", "=", uuidOf(ID_PREFIXES.lesson_version, version.id))
          .executeTakeFirst();
        if (stored && stored.lesson_id !== lessonId) {
          throw new StoreError(
            ErrorType.enum.WriteOnce,
            "this version id belongs to another lesson",
          );
        }
        if (stored) return read(LessonVersion, stored, ID_PREFIXES.lesson_version);
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
      const listed = version.questions.map((q) =>
        uuidOf(ID_PREFIXES.lesson_question, q.lesson_question_id),
      );
      if (new Set(listed).size !== listed.length) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          "a version lists each lesson question once",
        );
      }
      const found = await tx
        .selectFrom("lesson_question")
        .select("id")
        .where("id", "in", listed)
        .execute();
      if (found.length !== listed.length) throw notFound("a lesson question on the list");
      const latest = await this.#latest(tx, lessonId);
      const podId = uuidOf(ID_PREFIXES.pod, pod);
      const id = uuidOf(
        ID_PREFIXES.lesson_version,
        version.id ?? mint(LessonVersionId, ID_PREFIXES.lesson_version),
      );
      const inserted = await tx
        .insertInto("lesson_version")
        .values({
          id,
          pod_id: podId,
          lesson_id: lessonId,
          version: (latest?.version ?? 0) + 1,
          revises: latest?.id ?? null,
          published_at: null,
        })
        // Targeted on purpose (dl-z5ja.99): no target would also swallow a duplicate
        // (lesson_id, version), a real conflict between 2 publishes.
        .onConflict((oc) => oc.column("id").doNothing())
        .returning("id")
        .executeTakeFirst();
      if (!inserted) throw taken();
      await tx
        .insertInto("lesson_version_question")
        .values(
          version.questions.map((q, i) => ({
            lesson_version_id: id,
            position: i + 1,
            pod_id: podId,
            lesson_question_id: uuidOf(ID_PREFIXES.lesson_question, q.lesson_question_id),
            role: q.role,
          })),
        )
        .execute();
      const published = await tx
        .updateTable("lesson_version")
        .set({ published_at: sql<Date>`now()` })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
      await tx
        .updateTable("lesson")
        .set({ status: "published" })
        .where("id", "=", lessonId)
        .execute();
      return read(LessonVersion, published, ID_PREFIXES.lesson_version);
    });
  }

  async getLessonVersion(pod: PodId, id: LessonVersionId): Promise<LessonVersionWithQuestions> {
    const key = `${pod}/${id}`;
    const unit = this.#units.getStore();
    const kept = this.#versions.get(key) ?? unit?.versions.get(key);
    if (kept) return kept;
    const version = deepFrozen(await this.#readLessonVersion(pod, id));
    if (unit) unit.versions.set(key, version);
    else this.#keep(key, version);
    return version;
  }

  #keep(key: string, version: LessonVersionWithQuestions): void {
    if (this.#versions.size >= VERSIONS_KEPT) {
      const oldest = this.#versions.keys().next().value;
      if (oldest !== undefined) this.#versions.delete(oldest);
    }
    this.#versions.set(key, version);
  }

  async #readLessonVersion(pod: PodId, id: LessonVersionId): Promise<LessonVersionWithQuestions> {
    const versionId = uuidOf(ID_PREFIXES.lesson_version, id);
    return this.#in(pod, async (tx) => {
      const version = await tx
        .selectFrom("lesson_version")
        .selectAll()
        .where("id", "=", versionId)
        .executeTakeFirst();
      if (!version) throw notFound("the lesson version");
      const lesson = await tx
        .selectFrom("lesson")
        .select("language")
        .where("id", "=", version.lesson_id)
        .executeTakeFirst();
      if (!lesson) throw notFound("the lesson");
      const list = await tx
        .selectFrom("lesson_version_question")
        .selectAll()
        .where("lesson_version_id", "=", versionId)
        .orderBy("position")
        .execute();
      const questions =
        list.length === 0
          ? []
          : await tx
              .selectFrom("lesson_question")
              .selectAll()
              .where(
                "id",
                "in",
                list.map((row) => row.lesson_question_id),
              )
              .execute();
      const byId = new Map(questions.map((q) => [q.id, q]));
      return {
        version: read(LessonVersion, version, ID_PREFIXES.lesson_version),
        language: lesson.language,
        questions: list.map((row) => {
          const question = byId.get(row.lesson_question_id);
          if (!question) throw notFound("a listed question");
          return {
            ...read(LessonVersionQuestion, row),
            question: read(LessonQuestion, question, ID_PREFIXES.lesson_question),
          };
        }),
      };
    });
  }

  async getLatestLessonVersion(pod: PodId, lesson: LessonId): Promise<LessonVersion | undefined> {
    return this.#in(pod, async (tx) => {
      const latest = await this.#latest(tx, uuidOf(ID_PREFIXES.lesson, lesson));
      return latest && read(LessonVersion, latest, ID_PREFIXES.lesson_version);
    });
  }

  #latest(tx: Tx, lessonId: string) {
    return tx
      .selectFrom("lesson_version")
      .selectAll()
      .where("lesson_id", "=", lessonId)
      .where("published_at", "is not", null)
      .orderBy("version", "desc")
      .limit(1)
      .executeTakeFirst();
  }

  async putAssignment(pod: PodId, assignment: NewAssignment): Promise<Assignment> {
    const wire = assignment.id ?? mint(AssignmentId, ID_PREFIXES.assignment);
    const id = uuidOf(ID_PREFIXES.assignment, wire);
    return this.#in(pod, async (tx) => {
      const lessonId = uuidOf(ID_PREFIXES.lesson, assignment.lesson_id);
      const lesson = await tx
        .selectFrom("lesson")
        .select("id")
        .where("id", "=", lessonId)
        .executeTakeFirst();
      if (!lesson) throw notFound("the lesson");
      const { row } = await this.#once(
        () => tx.selectFrom("assignment").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(
            Assignment,
            {
              lesson_version_id: null,
              after_not_sure: "next",
              hold_verdicts: false,
              opens_at: null,
              closes_at: null,
              created_at: new Date().toISOString(),
              ...assignment,
              id: wire,
              pod_id: pod,
            },
            "the assignment",
          );
          return tx
            .insertInto("assignment")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              lesson_id: lessonId,
              lesson_version_id:
                valid.lesson_version_id === null
                  ? null
                  : uuidOf(ID_PREFIXES.lesson_version, valid.lesson_version_id),
              audience: valid.audience,
              identity: valid.identity,
              after_not_sure: valid.after_not_sure,
              hold_verdicts: valid.hold_verdicts,
              opens_at: valid.opens_at,
              closes_at: valid.closes_at,
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      return read(Assignment, row, ID_PREFIXES.assignment);
    });
  }

  async getAssignment(pod: PodId, id: AssignmentId): Promise<Assignment> {
    return this.#in(pod, async (tx) => {
      const row = await tx
        .selectFrom("assignment")
        .selectAll()
        .where("id", "=", uuidOf(ID_PREFIXES.assignment, id))
        .executeTakeFirst();
      if (!row) throw notFound("the assignment");
      return read(Assignment, row, ID_PREFIXES.assignment);
    });
  }

  async listOpenAssignments(pod: PodId): Promise<readonly OpenAssignment[]> {
    return this.#in(pod, async (tx) => {
      const rows = await tx
        .selectFrom("assignment")
        .selectAll()
        .where("audience", "=", "anyone")
        .where((eb) => eb.or([eb("opens_at", "is", null), eb("opens_at", "<=", sql<Date>`now()`)]))
        .where((eb) => eb.or([eb("closes_at", "is", null), eb("closes_at", ">", sql<Date>`now()`)]))
        .orderBy("created_at")
        .orderBy("id")
        .execute();
      if (rows.length === 0) return [];
      const lessons = await tx
        .selectFrom("lesson")
        .selectAll()
        .where(
          "id",
          "in",
          rows.map((r) => r.lesson_id),
        )
        .where("status", "=", "published")
        .execute();
      const byId = new Map(lessons.map((l) => [l.id, read(Lesson, l, ID_PREFIXES.lesson)]));
      return rows.flatMap((row) => {
        const lesson = byId.get(row.lesson_id);
        return lesson
          ? [{ assignment: read(Assignment, row, ID_PREFIXES.assignment), lesson }]
          : [];
      });
    });
  }

  async replaceExamples(
    pod: PodId,
    language: Language,
    examples: readonly NewLessonQuestionExample[],
  ): Promise<readonly LessonQuestionExample[]> {
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const questions = await this.#questionsById(
        tx,
        examples.flatMap((e) =>
          e.twin === null ? [e.lesson_question_id] : [e.lesson_question_id, e.twin],
        ),
      );
      checkExamples(language, examples, (id) => questions.get(id));
      await tx.deleteFrom("lesson_question_example").where("language", "=", language).execute();
      if (examples.length === 0) return [];
      const valid = examples.map((example) =>
        parse(
          LessonQuestionExample,
          {
            ...example,
            id: mint(LessonQuestionExampleId, ID_PREFIXES.lesson_question_example),
            pod_id: pod,
            created_at: new Date().toISOString(),
          },
          "the example",
        ),
      );
      const rows = await tx
        .insertInto("lesson_question_example")
        .values(
          valid.map((e) => ({
            id: uuidOf(ID_PREFIXES.lesson_question_example, e.id),
            pod_id: uuidOf(ID_PREFIXES.pod, pod),
            lesson_question_id: uuidOf(ID_PREFIXES.lesson_question, e.lesson_question_id),
            twin: e.twin === null ? null : uuidOf(ID_PREFIXES.lesson_question, e.twin),
            language: e.language,
            slug: e.slug,
            position: e.position,
            label: e.label,
            showcase: e.showcase,
            scenarios: JSON.stringify(e.scenarios),
          })),
        )
        .returningAll()
        .execute();
      const byId = new Map(
        rows.map((r) => [
          r.id,
          read(LessonQuestionExample, r, ID_PREFIXES.lesson_question_example),
        ]),
      );
      return valid.flatMap((e) => {
        const row = byId.get(uuidOf(ID_PREFIXES.lesson_question_example, e.id));
        return row ? [row] : [];
      });
    });
  }

  async listExamples(pod: PodId, language: Language): Promise<readonly ExampleWithQuestions[]> {
    return this.#in(pod, async (tx) => {
      const rows = await tx
        .selectFrom("lesson_question_example")
        .selectAll()
        .where("language", "=", language)
        .execute();
      const examples = rows.map((r) =>
        read(LessonQuestionExample, r, ID_PREFIXES.lesson_question_example),
      );
      const questions = await this.#questionsById(
        tx,
        examples.flatMap((e) =>
          e.twin === null ? [e.lesson_question_id] : [e.lesson_question_id, e.twin],
        ),
      );
      const question = (id: LessonQuestionId, what: string): LessonQuestion => {
        const found = questions.get(id);
        if (!found) throw notFound(what);
        return found;
      };
      return examples
        .map((example) => ({
          example,
          question: question(example.lesson_question_id, "the question"),
          twin: example.twin === null ? null : question(example.twin, "the twin's question"),
        }))
        .sort(byTypeThenPosition);
    });
  }

  /** The pod's lesson questions behind these ids, by wire id; an id the pod lacks is left out. */
  async #questionsById(
    tx: Tx,
    ids: readonly LessonQuestionId[],
  ): Promise<Map<LessonQuestionId, LessonQuestion>> {
    if (ids.length === 0) return new Map();
    const rows = await tx
      .selectFrom("lesson_question")
      .selectAll()
      .where(
        "id",
        "in",
        [...new Set(ids)].map((id) => uuidOf(ID_PREFIXES.lesson_question, id)),
      )
      .execute();
    return new Map(
      rows.map((r) => {
        const q = read(LessonQuestion, r, ID_PREFIXES.lesson_question);
        return [q.id, q];
      }),
    );
  }

  async startAttempt(pod: PodId, attempt: NewAttempt): Promise<AttemptRecord> {
    return this.#in(pod, async (tx) => {
      const assignment = await tx
        .selectFrom("assignment")
        .selectAll()
        .select(sql<Date>`now()`.as("now"))
        .where("id", "=", uuidOf(ID_PREFIXES.assignment, attempt.assignment_id))
        .executeTakeFirst();
      if (!assignment) throw notFound("the assignment");
      const wire = attempt.id ?? mint(AttemptId, ID_PREFIXES.attempt);
      const id = uuidOf(ID_PREFIXES.attempt, wire);
      const find = () =>
        tx.selectFrom("attempt").selectAll().where("id", "=", id).executeTakeFirst();
      const sameAssignment = async (stored: { assignment_id: string }) => {
        if (stored.assignment_id !== assignment.id) {
          throw new StoreError(
            ErrorType.enum.WriteOnce,
            "this attempt id belongs to another assignment",
          );
        }
        return this.#record(tx, id);
      };
      const stored = attempt.id && (await find());
      if (stored) return sameAssignment(stored);
      if (attempt.learner_id && assignment.identity !== "pick") {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          "a learner is named only when the assignment picks one",
        );
      }
      const now = assignment.now.getTime();
      if (
        (assignment.opens_at !== null && now < assignment.opens_at.getTime()) ||
        (assignment.closes_at !== null && now >= assignment.closes_at.getTime())
      ) {
        throw new StoreError(ErrorType.enum.AssignmentClosed, "this assignment is not open now");
      }
      const versionId =
        assignment.lesson_version_id ?? (await this.#latest(tx, assignment.lesson_id))?.id;
      if (!versionId) throw notFound("a published version of the lesson");
      const first = await tx
        .selectFrom("lesson_version_question")
        .selectAll()
        .where("lesson_version_id", "=", versionId)
        .where("position", "=", 1)
        .executeTakeFirst();
      if (first?.role !== "planned") throw notFound("the version's first question");
      const valid = parse(
        Attempt,
        {
          id: wire,
          pod_id: pod,
          assignment_id: attempt.assignment_id,
          lesson_version_id: idOf(ID_PREFIXES.lesson_version, versionId),
          learner_id: attempt.learner_id ?? null,
          player_name: attempt.player_name ?? null,
          mode: attempt.mode ?? "real",
          status: "in_progress",
          resume_at: null,
          started_at: assignment.now.toISOString(),
          finished_at: null,
        },
        "the attempt",
      );
      const podId = uuidOf(ID_PREFIXES.pod, pod);
      const inserted = await tx
        .insertInto("attempt")
        .values({
          id,
          pod_id: podId,
          assignment_id: assignment.id,
          lesson_version_id: versionId,
          learner_id:
            valid.learner_id === null ? null : uuidOf(ID_PREFIXES.learner, valid.learner_id),
          player_name: valid.player_name,
          mode: valid.mode,
        })
        .onConflict((oc) => oc.doNothing())
        .returning("id")
        .executeTakeFirst();
      if (!inserted) {
        // Another start of the same id won the race, or another pod holds it.
        const raced = await find();
        if (raced) return sameAssignment(raced);
        throw taken();
      }
      await tx
        .insertInto("attempt_question")
        .values({
          attempt_id: id,
          seq: 1,
          pod_id: podId,
          lesson_question_id: first.lesson_question_id,
          added: "planned",
          placed: null,
          added_for: null,
        })
        .execute();
      return this.#record(tx, id);
    });
  }

  /** The attempt's record; `row` is its attempt row when the caller has read it already. */
  async #record(tx: Tx, attemptId: string, row?: object): Promise<AttemptRecord> {
    const attempt =
      row ??
      (await tx.selectFrom("attempt").selectAll().where("id", "=", attemptId).executeTakeFirst());
    if (!attempt) throw notFound("the attempt");
    const questions = await tx
      .selectFrom("attempt_question")
      .selectAll()
      .where("attempt_id", "=", attemptId)
      .orderBy("seq")
      .execute();
    const answers = await tx
      .selectFrom("attempt_answer")
      .selectAll()
      .where("attempt_id", "=", attemptId)
      .orderBy("seq")
      .orderBy("try_no")
      .execute();
    return {
      attempt: read(Attempt, attempt, ID_PREFIXES.attempt),
      questions: questions.map((q) => read(AttemptQuestion, q)),
      answers: answers.map((a) => read(AttemptAnswer, a)),
    };
  }

  async getAttempt(pod: PodId, id: AttemptId): Promise<AttemptRecord> {
    return this.#in(pod, (tx) => this.#record(tx, uuidOf(ID_PREFIXES.attempt, id)));
  }

  /** The pod, or NotFound, as InMemoryStore refuses a write into a pod it doesn't hold. */
  async #pod(tx: Tx, pod: PodId): Promise<void> {
    const row = await tx
      .selectFrom("pod")
      .select("id")
      .where("id", "=", uuidOf(ID_PREFIXES.pod, pod))
      .executeTakeFirst();
    if (!row) throw notFound("the pod");
  }

  /** The attempt, locked for this transaction, refusing a finished one. */
  async #playing(tx: Tx, attemptId: string) {
    const attempt = await tx
      .selectFrom("attempt")
      .selectAll()
      .where("id", "=", attemptId)
      .forUpdate()
      .executeTakeFirst();
    if (!attempt) throw notFound("the attempt");
    if (attempt.status === "finished") {
      throw new StoreError(ErrorType.enum.AttemptFinished, "this attempt is finished");
    }
    return attempt;
  }

  /** The attempt question, locked for this transaction after its attempt, in the order every write takes them. */
  async #asking(tx: Tx, attemptId: string, seq: number) {
    const attempt = await tx
      .selectFrom("attempt")
      .select("id")
      .where("id", "=", attemptId)
      .forUpdate()
      .executeTakeFirst();
    if (!attempt) throw notFound("the attempt");
    const question = await tx
      .selectFrom("attempt_question")
      .selectAll()
      .where("attempt_id", "=", attemptId)
      .where("seq", "=", seq)
      .forUpdate()
      .executeTakeFirst();
    if (!question) throw notFound("the question");
    return question;
  }

  async askQuestion(
    pod: PodId,
    attempt: AttemptId,
    question: NewAttemptQuestion,
    options: { readonly seq?: number } = {},
  ): Promise<AttemptQuestion> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    return this.#in(pod, async (tx) => {
      // The attempt row stays locked to the commit, so the seq read below is still the next one.
      // The read comes after the lock, in a statement of its own, so it sees the last holder's
      // writes.
      await this.#playing(tx, attemptId);
      const lessonQuestionId = uuidOf(ID_PREFIXES.lesson_question, question.lesson_question_id);
      const { rows } = await sql<{
        asked: { seq: number; ended: string | null }[];
        known: boolean;
      }>`
        select
          (select coalesce(json_agg(json_build_object('seq', seq, 'ended', ended)), '[]')
           from attempt_question where attempt_id = ${attemptId}) as asked,
          exists (select from lesson_question where id = ${lessonQuestionId}) as known
      `.execute(tx);
      const state = rows[0];
      if (!state) throw notFound("the attempt");
      const { asked } = state;
      if (asked.some((q) => q.ended === null)) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question is still open");
      }
      if (options.seq !== undefined && options.seq !== asked.length + 1) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question took this seq");
      }
      if (!state.known) throw notFound("the lesson question");
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
      const row = await tx
        .insertInto("attempt_question")
        .values({
          attempt_id: attemptId,
          seq: asked.length + 1,
          pod_id: uuidOf(ID_PREFIXES.pod, pod),
          lesson_question_id: lessonQuestionId,
          added: question.added,
          placed: question.placed,
          added_for: question.added_for,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(AttemptQuestion, row);
    });
  }

  async appendAttemptAnswer(
    pod: PodId,
    answer: NewAttemptAnswer,
    options: { readonly end?: Ended } = {},
  ): Promise<{ readonly answer: AttemptAnswer; readonly replayed: boolean }> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, answer.attempt_id);
    if (options.end !== undefined) parse(Ended, options.end, "how the question ended");
    return this.#in(pod, async (tx) => {
      const find = () =>
        tx
          .selectFrom("attempt_answer")
          .selectAll()
          .where("event_id", "=", answer.event_id)
          .executeTakeFirst();
      // A replay is the same body for the same try (attempt, seq, try_no, kind).
      const replay = (stored: Selectable<DB["attempt_answer"]>) => {
        if (
          stored.body_hash === answer.body_hash &&
          stored.attempt_id === attemptId &&
          stored.seq === answer.seq &&
          stored.try_no === answer.try_no &&
          stored.kind === answer.kind
        ) {
          return { answer: read(AttemptAnswer, stored), replayed: true };
        }
        throw new StoreError(
          ErrorType.enum.EventIdMismatch,
          "this event was already sent with another body",
        );
      };
      // Wait for an append to this attempt that holds it, so a send of the same event that
      // ended the question reads as a replay, not as QuestionNotOpen.
      const attempt = await tx
        .selectFrom("attempt")
        .selectAll()
        .where("id", "=", attemptId)
        .forUpdate()
        .executeTakeFirst();
      const stored = await find();
      if (stored) return replay(stored);
      if (!attempt) throw notFound("the attempt");
      if (attempt.status === "finished") {
        throw new StoreError(ErrorType.enum.AttemptFinished, "this attempt is finished");
      }
      if (attempt.status === "paused") {
        throw new StoreError(ErrorType.enum.AttemptPaused, "this attempt is paused");
      }
      // The question, locked, with its family for the value's shape check and its tries so far.
      // The tries are read under the attempt's lock, which every append takes first; the one
      // other writer of an answer, the last rung's help_twin skip, ends the question with it.
      const question = await tx
        .selectFrom("attempt_question")
        .innerJoin("lesson_question", "lesson_question.id", "attempt_question.lesson_question_id")
        .selectAll("attempt_question")
        .select("lesson_question.family")
        .select(
          sql<number[]>`array(
            select try_no from attempt_answer
            where attempt_id = attempt_question.attempt_id and seq = attempt_question.seq
          )`.as("tries"),
        )
        .where("attempt_question.attempt_id", "=", attemptId)
        .where("attempt_question.seq", "=", answer.seq)
        .forUpdate("attempt_question")
        .executeTakeFirst();
      if (!question) throw notFound("the question");
      if (question.ended !== null) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
      }
      const { tries } = question;
      if (tries.includes(answer.try_no)) {
        throw new StoreError(ErrorType.enum.AnswerConflict, "this try was already answered");
      }
      if (answer.try_no !== tries.length + 1) {
        throw new StoreError(ErrorType.enum.TryOutOfOrder, "this is not the question's next try");
      }
      const valid = parse(
        AttemptAnswer,
        {
          ...answer,
          asked_at: utc(answer.asked_at),
          answered_at: utc(answer.answered_at),
          pod_id: pod,
          help_used: question.help_released,
        },
        "the answer",
      );
      if (Date.parse(valid.answered_at) < Date.parse(valid.asked_at)) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          "an answer is given after its question is asked",
        );
      }
      if (
        (valid.kind === "skip") !== (valid.skip_reason !== null) ||
        (valid.kind === "try") !== (valid.value !== null) ||
        (valid.kind === "skip" && valid.correct !== null)
      ) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          "a try carries a value and a skip its reason",
        );
      }
      const { family } = question;
      if (valid.kind === "try" && !valueFor(family).safeParse(valid.value).success) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          `the value is not a value of the ${family} family`,
        );
      }
      const row = await tx
        .insertInto("attempt_answer")
        .values({
          event_id: valid.event_id,
          pod_id: uuidOf(ID_PREFIXES.pod, pod),
          attempt_id: attemptId,
          seq: valid.seq,
          try_no: valid.try_no,
          kind: valid.kind,
          value: json(valid.value),
          skip_reason: valid.skip_reason,
          latency_ms: valid.latency_ms,
          help_used: valid.help_used,
          asked_at: valid.asked_at,
          answered_at: valid.answered_at,
          correct: valid.correct,
          mistake_class: valid.mistake_class,
          parts: json(valid.parts),
          judged_by: valid.judged_by,
          body_hash: valid.body_hash,
        })
        .onConflict((oc) => oc.column("event_id").doNothing())
        .returningAll()
        .executeTakeFirst();
      if (row) {
        if (options.end === "missed") await this.#mayMiss(tx, attemptId, answer.seq);
        if (options.end !== undefined) {
          await tx
            .updateTable("attempt_question")
            .set({ ended: options.end })
            .where("attempt_id", "=", attemptId)
            .where("seq", "=", answer.seq)
            .execute();
        }
        return { answer: read(AttemptAnswer, row), replayed: false };
      }
      // The event id is another pod's, or a send of the same event won the race.
      const raced = await find();
      if (raced) return replay(raced);
      throw new StoreError(
        ErrorType.enum.EventIdMismatch,
        "this event was already sent with another body",
      );
    });
  }

  async releaseHelp(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    seen: number,
    options: { readonly twin?: HelpTwin } = {},
  ): Promise<{ readonly question: AttemptQuestion; readonly released: boolean }> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    const twin = options.twin;
    return this.#in(pod, async (tx) => {
      const question = await this.#asking(tx, attemptId, seq);
      if (seen !== question.help_released) {
        return { question: read(AttemptQuestion, question), released: false };
      }
      if (question.ended !== null) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
      }
      if (question.help_released >= 4) {
        return { question: read(AttemptQuestion, question), released: false };
      }
      const help_released = question.help_released + 1;
      if (help_released === 4 && !twin) throw lastRungNeedsTwin();
      if (twin) await this.#appendTwin(tx, pod, attemptId, seq, help_released, twin);
      const row = await tx
        .updateTable("attempt_question")
        .set(twin ? { help_released, ended: "skipped" } : { help_released })
        .where("attempt_id", "=", attemptId)
        .where("seq", "=", seq)
        .returningAll()
        .executeTakeFirstOrThrow();
      return { question: read(AttemptQuestion, row), released: true };
    });
  }

  /** The `help_twin` skip, at the question's next try, which the caller's lock holds. */
  async #appendTwin(
    tx: Tx,
    pod: PodId,
    attemptId: string,
    seq: number,
    help_released: number,
    twin: HelpTwin,
  ): Promise<void> {
    const tries = await tx
      .selectFrom("attempt_answer")
      .select("try_no")
      .where("attempt_id", "=", attemptId)
      .where("seq", "=", seq)
      .execute();
    const next = tries.length + 1;
    if ((twin.try_no ?? next) !== next) {
      throw new StoreError(ErrorType.enum.TryOutOfOrder, "this is not the question's next try");
    }
    const skip = parse(
      AttemptAnswer,
      {
        ...twin,
        asked_at: utc(twin.asked_at),
        answered_at: utc(twin.answered_at),
        pod_id: pod,
        attempt_id: idOf(ID_PREFIXES.attempt, attemptId),
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
    );
    if (Date.parse(skip.answered_at) < Date.parse(skip.asked_at)) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "an answer is given after its question is asked",
      );
    }
    const row = await tx
      .insertInto("attempt_answer")
      .values({
        event_id: skip.event_id,
        pod_id: uuidOf(ID_PREFIXES.pod, pod),
        attempt_id: attemptId,
        seq,
        try_no: next,
        kind: "skip",
        value: null,
        skip_reason: "help_twin",
        latency_ms: skip.latency_ms,
        help_used: help_released,
        asked_at: skip.asked_at,
        answered_at: skip.answered_at,
        correct: null,
        mistake_class: null,
        parts: null,
        judged_by: null,
        body_hash: skip.body_hash,
      })
      .onConflict((oc) => oc.column("event_id").doNothing())
      .returning("event_id")
      .executeTakeFirst();
    if (!row) throw new StoreError(ErrorType.enum.EventIdMismatch, "this event was already sent");
  }

  async endAttemptQuestion(
    pod: PodId,
    attempt: AttemptId,
    seq: number,
    ended: Ended,
  ): Promise<AttemptQuestion> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    return this.#in(pod, async (tx) => {
      const question = await this.#asking(tx, attemptId, seq);
      parse(Ended, ended, "how the question ended");
      if (question.ended === ended) return read(AttemptQuestion, question);
      if (question.ended !== null) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
      }
      if (ended === "missed") await this.#mayMiss(tx, attemptId, seq);
      const row = await tx
        .updateTable("attempt_question")
        .set({ ended })
        .where("attempt_id", "=", attemptId)
        .where("seq", "=", seq)
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(AttemptQuestion, row);
    });
  }

  /**
   * `missed` only while verdicts are held, after a wrong try and no right one, as the
   * `attempt_question_missed` trigger refuses it (migration 20261027210000_ended_missed.sql).
   */
  async #mayMiss(tx: Tx, attemptId: string, seq: number): Promise<void> {
    const held = await tx
      .selectFrom("attempt")
      .innerJoin("assignment", "assignment.id", "attempt.assignment_id")
      .select("assignment.hold_verdicts")
      .where("attempt.id", "=", attemptId)
      .executeTakeFirstOrThrow();
    if (!held.hold_verdicts) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        "a question ends missed only while its assignment holds verdicts",
      );
    }
    const tries = await tx
      .selectFrom("attempt_answer")
      .select("correct")
      .where("attempt_id", "=", attemptId)
      .where("seq", "=", seq)
      .where("kind", "=", "try")
      .execute();
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
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    return this.#in(pod, async (tx) => {
      const stored = await this.#playing(tx, attemptId);
      const next = resume_at === undefined ? stored.resume_at : resume_at;
      parse(
        Attempt,
        { ...read(Attempt, stored, ID_PREFIXES.attempt), status, resume_at: next },
        "the attempt",
      );
      const row = await tx
        .updateTable("attempt")
        .set({ status, resume_at: next })
        .where("id", "=", attemptId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(Attempt, row, ID_PREFIXES.attempt);
    });
  }

  async finishAttempt(pod: PodId, attempt: AttemptId): Promise<Attempt> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    return this.#in(pod, async (tx) => {
      await this.#playing(tx, attemptId);
      const open = await tx
        .selectFrom("attempt_question")
        .select("seq")
        .where("attempt_id", "=", attemptId)
        .where("ended", "is", null)
        .executeTakeFirst();
      if (open) throw new StoreError(ErrorType.enum.QuestionNotOpen, "a question is still open");
      const row = await tx
        .updateTable("attempt")
        .set({ status: "finished", finished_at: sql<Date>`now()` })
        .where("id", "=", attemptId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(Attempt, row, ID_PREFIXES.attempt);
    });
  }

  async getAttemptResult(pod: PodId, attempt: AttemptId): Promise<readonly AttemptResult[]> {
    const attemptId = uuidOf(ID_PREFIXES.attempt, attempt);
    return this.#in(pod, async (tx) => {
      const exists = await tx
        .selectFrom("attempt")
        .select("id")
        .where("id", "=", attemptId)
        .executeTakeFirst();
      if (!exists) throw notFound("the attempt");
      const rows = await tx
        .selectFrom("attempt_result")
        .selectAll()
        .where("attempt_id", "=", attemptId)
        .orderBy("seq")
        .execute();
      return rows.map((row) => read(AttemptResult, row));
    });
  }

  async findMember(sub: Uuid): Promise<MemberScope | undefined> {
    return this.#in(null, async (tx) => {
      // The lookup sets the pod it finds, in the same statement, for the reads after it.
      const { rows } = await sql<{ pod: string }>`
        select set_config('app.pod_id', pod::text, true) as pod
        from app.member_pod(${sub}) as pod where pod is not null
      `.execute(tx);
      const pod = rows[0]?.pod;
      if (pod === undefined) return undefined;
      const unit = this.#units.getStore();
      if (unit) unit.pod = pod;
      const account = await tx
        .selectFrom("account")
        .select("id")
        .where("sub", "=", sub)
        .executeTakeFirst();
      if (!account) return undefined;
      return {
        pod: PodId.parse(idOf(ID_PREFIXES.pod, pod)),
        account: AccountId.parse(idOf(ID_PREFIXES.account, account.id)),
      };
    });
  }

  /**
   * One unit, the request's when one is open. A racing first sign-in of the same user waits on the
   * user's lock to the end of the other's unit, then finds the account it made. A unique violation
   * would abort the request's transaction, so nothing here relies on one.
   */
  async createAccount(sub: Uuid, language: Language): Promise<MemberScope> {
    return this.unit(async () => {
      await this.#in(null, (tx) =>
        sql`select pg_advisory_xact_lock(hashtextextended(${sub}::text, 0))`.execute(tx),
      );
      const found = await this.findMember(sub);
      if (found) return found;
      const pod = mint(PodId, ID_PREFIXES.pod);
      const podId = uuidOf(ID_PREFIXES.pod, pod);
      return this.#in(pod, async (tx) => {
        await tx.insertInto("pod").values({ id: podId, name: "home", language }).execute();
        const account = await tx
          .insertInto("account")
          .values({ pod_id: podId, sub })
          .returning("id")
          .executeTakeFirstOrThrow();
        await tx
          .insertInto("member")
          .values({ pod_id: podId, account_id: account.id, role: "parent" })
          .execute();
        return { pod, account: AccountId.parse(idOf(ID_PREFIXES.account, account.id)) };
      });
    });
  }

  async getMe(pod: PodId, account: AccountId): Promise<Me> {
    const accountId = uuidOf(ID_PREFIXES.account, account);
    return this.#in(pod, async (tx) => {
      const podRow = await tx.selectFrom("pod").selectAll().executeTakeFirst();
      const accountRow = await tx
        .selectFrom("account")
        .selectAll()
        .where("id", "=", accountId)
        .executeTakeFirst();
      const member = await tx
        .selectFrom("member")
        .selectAll()
        .where("account_id", "=", accountId)
        .executeTakeFirst();
      if (!podRow || !accountRow || !member) throw notFound("the account");
      const learners = await tx
        .selectFrom("learner")
        .selectAll()
        .orderBy("created_at")
        .orderBy("id")
        .execute();
      return {
        account: read(Account, accountRow, ID_PREFIXES.account),
        member: read(Member, member, ID_PREFIXES.member),
        pod: read(Pod, podRow, ID_PREFIXES.pod),
        learners: await this.#withGoals(tx, learners),
      };
    });
  }

  /** Learner rows with their goals, oldest first, in one read of the goals. */
  async #withGoals(tx: Tx, learners: readonly object[]): Promise<LearnerSnapshot[]> {
    const rows = learners.map((row) => read(Learner, row, ID_PREFIXES.learner));
    const goals =
      rows.length === 0
        ? []
        : await tx
            .selectFrom("goal")
            .selectAll()
            .where(
              "learner_id",
              "in",
              rows.map((l) => uuidOf(ID_PREFIXES.learner, l.id)),
            )
            .orderBy("created_at")
            .orderBy("id")
            .execute();
    const all = goals.map((row) => read(Goal, row, ID_PREFIXES.goal));
    return rows.map((learner) => ({
      learner,
      goals: all.filter((g) => g.learner_id === learner.id),
    }));
  }

  async addLearner(pod: PodId, learner: NewLearnerWithGoals): Promise<LearnerSnapshot> {
    // A racing add can take the handle this one picked: its insert writes nothing, since a unique
    // violation would abort the request's transaction, and the next try picks past it.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const added = await this.#addLearner(pod, learner);
      if (added) return added;
    }
    throw new StoreError(ErrorType.enum.WriteOnce, "the learner's handle was taken 3 times");
  }

  async #addLearner(
    pod: PodId,
    learner: NewLearnerWithGoals,
  ): Promise<LearnerSnapshot | undefined> {
    const podId = uuidOf(ID_PREFIXES.pod, pod);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const handles = await tx.selectFrom("learner").select("handle").execute();
      const valid = parse(
        Learner,
        {
          id: mint(LearnerId, ID_PREFIXES.learner),
          pod_id: pod,
          handle: handleFor(learner.first_name, new Set(handles.map((h) => h.handle))),
          first_name: learner.first_name,
          age_group: learner.age_group ?? null,
          country: null,
          curriculum_id: null,
          school_grade: null,
          school_language: null,
          created_at: new Date().toISOString(),
        },
        "the learner",
      );
      const row = await tx
        .insertInto("learner")
        .values({
          id: uuidOf(ID_PREFIXES.learner, valid.id),
          pod_id: podId,
          handle: valid.handle,
          first_name: valid.first_name,
          age_group: valid.age_group,
        })
        .onConflict((oc) => oc.columns(["pod_id", "handle"]).doNothing())
        .returningAll()
        .executeTakeFirst();
      if (!row) return undefined;
      const names = learner.goals ?? [];
      const goals =
        names.length === 0
          ? []
          : await tx
              .insertInto("goal")
              // clock_timestamp() rises row by row, so "oldest first" is the order given.
              .values(
                names.map((name) => ({
                  pod_id: podId,
                  learner_id: row.id,
                  name,
                  created_at: sql<Date>`clock_timestamp()`,
                })),
              )
              .returningAll()
              .execute();
      return {
        learner: read(Learner, row, ID_PREFIXES.learner),
        goals: goals.map((g) => read(Goal, g, ID_PREFIXES.goal)),
      };
    });
  }

  async claimAttempt(pod: PodId, claim: NewClaim): Promise<Attempt> {
    return this.#in(pod, async (tx) => {
      const { rows } = await sql<object>`
        select * from app.claim_attempt(
          ${uuidOf(ID_PREFIXES.attempt, claim.attempt)},
          ${uuidOf(ID_PREFIXES.learner, claim.learner)},
          ${uuidOf(ID_PREFIXES.account, claim.account)}
        )
      `.execute(tx);
      const row = rows[0];
      if (!row) throw notFound("the attempt");
      return read(Attempt, row, ID_PREFIXES.attempt);
    });
  }

  async getLearnerAttempts(pod: PodId, learner: LearnerId): Promise<LearnerAttempts> {
    const learnerId = uuidOf(ID_PREFIXES.learner, learner);
    return this.#in(pod, async (tx) => {
      const row = await tx
        .selectFrom("learner")
        .selectAll()
        .where("id", "=", learnerId)
        .executeTakeFirst();
      if (!row) throw notFound("the learner");
      // A claimed attempt in another pod, its lesson and its results are read through the
      // claimed_read policies.
      const attempts = await tx
        .selectFrom("attempt")
        .selectAll()
        .where("learner_id", "=", learnerId)
        .orderBy("started_at", "desc")
        .orderBy("id", "desc")
        .execute();
      const ids = attempts.map((a) => a.id);
      const lessons =
        ids.length === 0
          ? []
          : await tx
              .selectFrom("lesson_version")
              .innerJoin("lesson", "lesson.id", "lesson_version.lesson_id")
              .select(["lesson_version.id as version", "lesson.title", "lesson.language"])
              .where(
                "lesson_version.id",
                "in",
                attempts.map((a) => a.lesson_version_id),
              )
              .execute();
      const results =
        ids.length === 0
          ? []
          : await tx
              .selectFrom("attempt_result")
              .selectAll()
              .where("attempt_id", "in", ids)
              .orderBy("seq")
              .execute();
      const byVersion = new Map(lessons.map((l) => [l.version, l]));
      return {
        learner: read(Learner, row, ID_PREFIXES.learner),
        attempts: attempts.map((attempt) => {
          const lesson = byVersion.get(attempt.lesson_version_id);
          if (!lesson) throw notFound("the attempt's lesson");
          return {
            attempt: read(Attempt, attempt, ID_PREFIXES.attempt),
            title: lesson.title,
            language: Language.parse(lesson.language),
            results: results
              .filter((r) => r.attempt_id === attempt.id)
              .map((r) => read(AttemptResult, r)),
          };
        }),
      };
    });
  }

  async getAssignmentAttempts(pod: PodId, id: AssignmentId): Promise<AssignmentAttempts> {
    const assignmentId = uuidOf(ID_PREFIXES.assignment, id);
    return this.#in(pod, async (tx) => {
      // The pod's own assignment through pod_scope; another pod's through claimed_read, which
      // shows it only when one of the caller's learners claimed an attempt on it.
      const row = await tx
        .selectFrom("assignment")
        .selectAll()
        .where("id", "=", assignmentId)
        .executeTakeFirst();
      if (!row) throw notFound("the assignment");
      const lesson = await tx
        .selectFrom("lesson")
        .select(["title", "language"])
        .where("id", "=", row.lesson_id)
        .executeTakeFirst();
      if (!lesson) throw notFound("the assignment's lesson");
      // pod_scope reads every attempt of the pod's own, claimed_read the caller's learners'. A
      // learner in another pod is hidden, so its first name comes back null.
      const attempts = await tx
        .selectFrom("attempt")
        .leftJoin("learner", "learner.id", "attempt.learner_id")
        .selectAll("attempt")
        .select("learner.first_name")
        .where("attempt.assignment_id", "=", assignmentId)
        .where("attempt.mode", "=", "real")
        .orderBy("attempt.started_at", "desc")
        .orderBy("attempt.id", "desc")
        .limit(LIMITS.attemptsPerAssignment)
        .execute();
      const ids = attempts.map((a) => a.id);
      const results =
        ids.length === 0
          ? []
          : await tx
              .selectFrom("attempt_result")
              .selectAll()
              .where("attempt_id", "in", ids)
              .orderBy("seq")
              .execute();
      return {
        assignment: read(Assignment, row, ID_PREFIXES.assignment),
        title: lesson.title,
        language: Language.parse(lesson.language),
        attempts: attempts.map(({ first_name, ...attempt }) => ({
          attempt: read(Attempt, attempt, ID_PREFIXES.attempt),
          name: first_name ?? attempt.player_name,
          results: results
            .filter((r) => r.attempt_id === attempt.id)
            .map((r) => read(AttemptResult, r)),
        })),
      };
    });
  }

  // The learner knowledge base (wave 1 of epic dl-e8ov.5). Every call here runs under a savepoint
  // when a unit is open (`#guarded`), so a caller that catches a failure, as the mastery rebuild
  // after a finish does, keeps its unit's transaction usable.

  /**
   * A call's work as `#in` runs it, under a savepoint when a unit is open: a statement that fails
   * rolls back to it, so the unit goes on when the caller catches the failure. In a unit of its
   * own the transaction is the savepoint.
   */
  async #guarded<T>(pod: PodId | null, work: (tx: Tx) => Promise<T>): Promise<T> {
    if (!this.#units.getStore()) return this.#in(pod, work);
    return this.#in(pod, async (tx) => {
      await sql`savepoint knowledge`.execute(tx);
      try {
        const result = await work(tx);
        await sql`release savepoint knowledge`.execute(tx);
        return result;
      } catch (error) {
        await sql`rollback to savepoint knowledge`.execute(tx);
        throw error;
      }
    });
  }

  async findLearnerPod(id: LearnerId): Promise<PodId | undefined> {
    return this.#guarded(null, async (tx) => {
      const { rows } = await sql<{ pod: string | null }>`
        select app.learner_pod(${uuidOf(ID_PREFIXES.learner, id)}) as pod
      `.execute(tx);
      const pod = rows[0]?.pod;
      return pod ? PodId.parse(idOf(ID_PREFIXES.pod, pod)) : undefined;
    });
  }

  async listSkills(pod: PodId): Promise<readonly Skill[]> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    const shared = uuidOf(ID_PREFIXES.pod, FEATURED_POD_ID);
    return this.#guarded(pod, async (tx) => {
      await this.#pod(tx, pod);
      // pod_scope reads the pod's own rows and shared_read the shared pod's; a code the pod holds
      // wins over the shared row. By code in byte order, as JavaScript sorts strings.
      const rows = await tx
        .selectFrom("skill")
        .selectAll()
        .where("pod_id", "in", [own, shared])
        .orderBy(sql`code collate "C"`)
        .orderBy(sql`pod_id = ${own}`, "desc")
        .execute();
      const byCode = new Map<string, Skill>();
      for (const row of rows) {
        if (!byCode.has(row.code)) byCode.set(row.code, read(Skill, row));
      }
      return [...byCode.values()];
    });
  }

  async putCurriculum(pod: PodId, curriculum: NewCurriculum): Promise<Curriculum> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    return this.#guarded(pod, async (tx) => {
      await this.#pod(tx, pod);
      const valid = parse(
        Curriculum,
        {
          ...curriculum,
          id: mint(CurriculumId, ID_PREFIXES.curriculum),
          pod_id: pod,
          created_at: new Date().toISOString(),
        },
        "the curriculum",
      );
      const { row } = await this.#once(
        () =>
          tx
            .selectFrom("curriculum")
            .selectAll()
            .where("pod_id", "=", own)
            .where("code", "=", valid.code)
            .where("version", "=", valid.version)
            .executeTakeFirst(),
        () =>
          tx
            .insertInto("curriculum")
            .values({
              id: uuidOf(ID_PREFIXES.curriculum, valid.id),
              pod_id: own,
              code: valid.code,
              name: valid.name,
              country: valid.country,
              version: valid.version,
              language: valid.language,
              source_url: valid.source_url,
            })
            .onConflict((oc) => oc.columns(["pod_id", "code", "version"]).doNothing())
            .returningAll()
            .executeTakeFirst(),
      );
      return read(Curriculum, row, ID_PREFIXES.curriculum);
    });
  }

  async putTopics(pod: PodId, topics: readonly NewTopic[]): Promise<readonly Topic[]> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    return this.#guarded(pod, async (tx) => {
      await this.#pod(tx, pod);
      if (topics.length === 0) return [];
      const now = new Date().toISOString();
      const valid = topics.map((topic) =>
        parse(
          Topic,
          { ...topic, id: mint(TopicId, ID_PREFIXES.topic), pod_id: pod, created_at: now },
          "the topic",
        ),
      );
      const curricula = [
        ...new Set(valid.map((t) => uuidOf(ID_PREFIXES.curriculum, t.curriculum_id))),
      ];
      // Row-level security reads only the pod's own curricula (and the shared pod's, which a
      // write into another pod may not name): a curriculum outside `pod` is NotFound.
      const held = await tx
        .selectFrom("curriculum")
        .select("id")
        .where("pod_id", "=", own)
        .where("id", "in", curricula)
        .execute();
      if (held.length !== curricula.length) throw notFound("the curriculum");
      // Once per curriculum and code: a topic the pod holds keeps its stored row.
      await tx
        .insertInto("topic")
        .values(
          valid.map((t) => ({
            id: uuidOf(ID_PREFIXES.topic, t.id),
            pod_id: own,
            curriculum_id: uuidOf(ID_PREFIXES.curriculum, t.curriculum_id),
            code: t.code,
            area: t.area,
            text: t.text,
          })),
        )
        .onConflict((oc) => oc.columns(["curriculum_id", "code"]).doNothing())
        .execute();
      const rows = await tx
        .selectFrom("topic")
        .selectAll()
        .where("pod_id", "=", own)
        .where("curriculum_id", "in", curricula)
        .where(
          "code",
          "in",
          valid.map((t) => t.code),
        )
        .execute();
      const byKey = new Map(
        rows.map((row) => [
          `${row.curriculum_id} ${row.code}`,
          read(Topic, row, ID_PREFIXES.topic),
        ]),
      );
      return valid.map((t) => {
        const row = byKey.get(`${uuidOf(ID_PREFIXES.curriculum, t.curriculum_id)} ${t.code}`);
        if (!row) throw taken();
        return row;
      });
    });
  }

  async putSkills(pod: PodId, skills: readonly NewSkill[]): Promise<readonly Skill[]> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    return this.#guarded(pod, async (tx) => {
      await this.#pod(tx, pod);
      const now = new Date().toISOString();
      const valid = skills.map((skill) =>
        parse(Skill, { ...skill, pod_id: pod, created_at: now }, "the skill"),
      );
      if (valid.length > 0) {
        // Once per code: a code the pod holds keeps its stored row, as content does.
        await tx
          .insertInto("skill")
          .values(
            valid.map((s) => ({
              pod_id: own,
              code: s.code,
              topic_id: s.topic_id === null ? null : uuidOf(ID_PREFIXES.topic, s.topic_id),
              kind: s.kind,
              status: s.status,
              can_do: json(s.can_do),
              aliases: s.aliases,
              prerequisites: s.prerequisites,
              source: s.source,
            })),
          )
          .onConflict((oc) => oc.columns(["pod_id", "code"]).doNothing())
          .execute();
      }
      return this.#ownSkills(
        tx,
        own,
        valid.map((s) => s.code),
      );
    });
  }

  /** The pod's own rows for `codes`, in the order given; a code with no row is NotFound. */
  async #ownSkills(tx: Tx, own: string, codes: readonly SkillId[]): Promise<Skill[]> {
    if (codes.length === 0) return [];
    const rows = await tx
      .selectFrom("skill")
      .selectAll()
      .where("pod_id", "=", own)
      .where("code", "in", [...new Set(codes)])
      .execute();
    const byCode = new Map(rows.map((row) => [row.code, read(Skill, row)]));
    return codes.map((code) => {
      const row = byCode.get(code);
      if (!row) throw notFound(`the skill ${code}`);
      return row;
    });
  }

  async ensureSkills(pod: PodId, codes: readonly SkillId[]): Promise<readonly Skill[]> {
    return this.#guarded(pod, async (tx) => {
      await this.#pod(tx, pod);
      return this.#ensureSkills(tx, uuidOf(ID_PREFIXES.pod, pod), codes);
    });
  }

  /**
   * Copies each code the pod has no row for from the shared catalogue in one statement, or writes
   * it a draft, then reads the pod's rows. A code the pod holds is left as it is.
   */
  async #ensureSkills(tx: Tx, own: string, codes: readonly SkillId[]): Promise<Skill[]> {
    if (codes.length === 0) return [];
    const shared = uuidOf(ID_PREFIXES.pod, FEATURED_POD_ID);
    await sql`
      insert into skill (pod_id, code, topic_id, kind, status, can_do, aliases, prerequisites, source)
      select ${own}::uuid, c.code, s.topic_id, coalesce(s.kind, 'accuracy'),
        coalesce(s.status, 'draft'), s.can_do, coalesce(s.aliases, '{}'),
        coalesce(s.prerequisites, '{}'), coalesce(s.source, 'pod')
      from unnest(${[...new Set(codes)]}::text[]) as c(code)
      left join skill as s on s.pod_id = ${shared}::uuid and s.code = c.code
      on conflict (pod_id, code) do nothing
    `.execute(tx);
    return this.#ownSkills(tx, own, codes);
  }

  async getLearnerEvidence(
    pod: PodId,
    learner: LearnerId,
  ): Promise<readonly LearnerSkillEvidence[]> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      // Row-level security on the tables the view joins reads the pod's own attempts and those its
      // learners claimed (security_invoker).
      const rows = await tx
        .selectFrom("learner_skill_evidence")
        .selectAll()
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .execute();
      // Sorted here, by the wire ids, as InMemoryStore sorts them.
      return rows
        .map((row) => read(LearnerSkillEvidence, row))
        .sort(
          (a, b) =>
            a.answered_at.localeCompare(b.answered_at) ||
            byText(a.attempt_id, b.attempt_id) ||
            a.seq - b.seq ||
            a.try_no - b.try_no ||
            byText(a.skill_code, b.skill_code),
        );
    });
  }

  async replaceMastery(
    pod: PodId,
    learner: LearnerId,
    rows: readonly NewLearnerSkillMastery[],
  ): Promise<readonly LearnerSkillMastery[]> {
    const learnerId = uuidOf(ID_PREFIXES.learner, learner);
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      const computed_at = new Date().toISOString();
      const valid = rows.map((row) =>
        parse(
          LearnerSkillMastery,
          { ...row, pod_id: pod, learner_id: learner, computed_at },
          "a mastery row",
        ),
      );
      if (new Set(valid.map((r) => r.skill_code)).size !== valid.length) {
        throw new StoreError(ErrorType.enum.BadRequest, "a skill code repeats in the mastery rows");
      }
      // Held already when the rebuild called lockLearner first; taking it again is a no-op.
      await holdLearner(tx, learnerId);
      await tx.deleteFrom("learner_skill_mastery").where("learner_id", "=", learnerId).execute();
      if (valid.length === 0) return [];
      const written = await tx
        .insertInto("learner_skill_mastery")
        .values(
          valid.map((r) => ({
            pod_id: uuidOf(ID_PREFIXES.pod, pod),
            learner_id: learnerId,
            skill_code: r.skill_code,
            level: r.level,
            needs_attention: r.needs_attention,
            tries: r.tries,
            last_answered_at: r.last_answered_at,
            due_at: r.due_at,
            card: json(r.card),
            computed_at: r.computed_at,
          })),
        )
        .returningAll()
        .execute();
      return written
        .map((row) => read(LearnerSkillMastery, row))
        .sort((a, b) => byText(a.skill_code, b.skill_code));
    });
  }

  async lockLearner(pod: PodId, learner: LearnerId): Promise<void> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      await holdLearner(tx, uuidOf(ID_PREFIXES.learner, learner));
    });
  }

  async getMastery(pod: PodId, learner: LearnerId): Promise<readonly LearnerSkillMastery[]> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      const rows = await tx
        .selectFrom("learner_skill_mastery")
        .selectAll()
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .orderBy(sql`skill_code collate "C"`)
        .execute();
      return rows.map((row) => read(LearnerSkillMastery, row));
    });
  }

  /** A learner of the unit's pod, or NotFound: row-level security hides another pod's. */
  async #learner(tx: Tx, learner: LearnerId): Promise<void> {
    const row = await tx
      .selectFrom("learner")
      .select("id")
      .where("id", "=", uuidOf(ID_PREFIXES.learner, learner))
      .executeTakeFirst();
    if (!row) throw notFound("the learner");
  }

  async listGoals(pod: PodId, learner: LearnerId): Promise<readonly GoalWithSkills[]> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      const goals = await tx
        .selectFrom("goal")
        .selectAll()
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .orderBy("created_at")
        .orderBy("id")
        .execute();
      const links =
        goals.length === 0
          ? []
          : await tx
              .selectFrom("goal_skill")
              .select(["goal_id", "skill_code"])
              .where(
                "goal_id",
                "in",
                goals.map((g) => g.id),
              )
              .execute();
      // goal_skill keeps no order of its own: a goal's codes are listed by code.
      return goals.map((row) => ({
        goal: read(Goal, row, ID_PREFIXES.goal),
        skill_codes: links
          .filter((l) => l.goal_id === row.id)
          .map((l) => SkillId.parse(l.skill_code))
          .sort(byText),
      }));
    });
  }

  /** A goal with its skill codes, by code. */
  async #goalWithSkills(tx: Tx, row: object & { id: string }): Promise<GoalWithSkills> {
    const links = await tx
      .selectFrom("goal_skill")
      .select("skill_code")
      .where("goal_id", "=", row.id)
      .execute();
    return {
      goal: read(Goal, row, ID_PREFIXES.goal),
      skill_codes: links.map((l) => SkillId.parse(l.skill_code)).sort(byText),
    };
  }

  /** Links each code to the goal once; the codes are the pod's rows already. */
  async #linkSkills(tx: Tx, own: string, goal: string, codes: readonly SkillId[]): Promise<void> {
    if (codes.length === 0) return;
    await tx
      .insertInto("goal_skill")
      .values(codes.map((skill_code) => ({ pod_id: own, goal_id: goal, skill_code })))
      .onConflict((oc) => oc.columns(["goal_id", "skill_code"]).doNothing())
      .execute();
  }

  async addGoal(pod: PodId, learner: LearnerId, goal: NewGoal): Promise<GoalWithSkills> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      const valid = parse(
        Goal,
        {
          id: mint(GoalId, ID_PREFIXES.goal),
          pod_id: pod,
          learner_id: learner,
          name: goal.name,
          words: goal.words ?? null,
          lesson_language: goal.lesson_language ?? "pl",
          status: "active",
          created_at: new Date().toISOString(),
        },
        "the goal",
      );
      const codes = [...new Set(goal.skill_codes)];
      await this.#ensureSkills(tx, own, codes);
      const row = await tx
        .insertInto("goal")
        .values({
          id: uuidOf(ID_PREFIXES.goal, valid.id),
          pod_id: own,
          learner_id: uuidOf(ID_PREFIXES.learner, learner),
          name: valid.name,
          words: valid.words,
          lesson_language: valid.lesson_language,
          // A goal's own instant, so 2 goals added in one unit keep their order.
          created_at: sql<Date>`clock_timestamp()`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      await this.#linkSkills(tx, own, row.id, codes);
      return this.#goalWithSkills(tx, row);
    });
  }

  async updateGoal(
    pod: PodId,
    learner: LearnerId,
    goal: GoalId,
    change: GoalChange,
  ): Promise<GoalWithSkills> {
    const own = uuidOf(ID_PREFIXES.pod, pod);
    const goalId = uuidOf(ID_PREFIXES.goal, goal);
    return this.#guarded(pod, async (tx) => {
      // Held to the end of the unit, so 2 patches of one goal's skills take turns.
      let row = await tx
        .selectFrom("goal")
        .selectAll()
        .where("id", "=", goalId)
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .forUpdate()
        .executeTakeFirst();
      if (!row) throw notFound("the goal");
      if (change.status !== undefined && change.status !== row.status) {
        row = await tx
          .updateTable("goal")
          .set({ status: change.status })
          .where("id", "=", goalId)
          .returningAll()
          .executeTakeFirstOrThrow();
      }
      if (change.skill_codes !== undefined) {
        const codes = [...new Set(change.skill_codes)];
        await this.#ensureSkills(tx, own, codes);
        await tx.deleteFrom("goal_skill").where("goal_id", "=", goalId).execute();
        await this.#linkSkills(tx, own, goalId, codes);
      }
      return this.#goalWithSkills(tx, row);
    });
  }

  async putReport(pod: PodId, report: NewLearnerReport): Promise<LearnerReport> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, report.learner_id);
      if (Date.parse(report.period_ends_at) < Date.parse(report.period_starts_at)) {
        throw new StoreError(ErrorType.enum.BadRequest, "a report's period ends before it starts");
      }
      const valid = parse(
        LearnerReport,
        {
          ...report,
          id: mint(LearnerReportId, ID_PREFIXES.learner_report),
          pod_id: pod,
          narrative: null,
          decisions: [],
          created_at: new Date().toISOString(),
        },
        "the report",
      );
      const row = await tx
        .insertInto("learner_report")
        .values({
          id: uuidOf(ID_PREFIXES.learner_report, valid.id),
          pod_id: uuidOf(ID_PREFIXES.pod, pod),
          learner_id: uuidOf(ID_PREFIXES.learner, valid.learner_id),
          period_starts_at: valid.period_starts_at,
          period_ends_at: valid.period_ends_at,
          inputs_hash: valid.inputs_hash,
          reused: valid.reused,
          digest: JSON.stringify(valid.digest),
          // The report's own instant, so 2 written in one unit list newest first.
          created_at: sql<Date>`clock_timestamp()`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(LearnerReport, row, ID_PREFIXES.learner_report);
    });
  }

  async listReports(pod: PodId, learner: LearnerId): Promise<readonly LearnerReport[]> {
    return this.#guarded(pod, async (tx) => {
      await this.#learner(tx, learner);
      const rows = await tx
        .selectFrom("learner_report")
        .selectAll()
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .limit(LIMITS.reportsPerLearner)
        .execute();
      return rows.map((row) => read(LearnerReport, row, ID_PREFIXES.learner_report));
    });
  }

  async updateReport(
    pod: PodId,
    learner: LearnerId,
    report: LearnerReportId,
    change: ReportChange,
  ): Promise<LearnerReport> {
    const reportId = uuidOf(ID_PREFIXES.learner_report, report);
    return this.#guarded(pod, async (tx) => {
      // Held to the end of the unit: the narrative and the decisions are checked against it.
      const row = await tx
        .selectFrom("learner_report")
        .selectAll()
        .where("id", "=", reportId)
        .where("learner_id", "=", uuidOf(ID_PREFIXES.learner, learner))
        .forUpdate()
        .executeTakeFirst();
      if (!row) throw notFound("the report");
      const stored = read(LearnerReport, row, ID_PREFIXES.learner_report);
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
        const given = parse(ReportNarrative, change.narrative, "the narrative");
        if (narrative !== null && canonical(narrative) !== canonical(given)) {
          throw new StoreError(ErrorType.enum.WriteOnce, "this report already has its narrative");
        }
        narrative = given;
      }
      const added = change.decisions ?? [];
      const writesNarrative = stored.narrative === null && narrative !== null;
      if (!writesNarrative && added.length === 0) return stored;
      const decided_at = new Date().toISOString();
      const decisions: ProposalDecision[] = [
        ...stored.decisions,
        ...added.map((d) => parse(ProposalDecision, { ...d, decided_at }, "a decision")),
      ];
      const updated = await tx
        .updateTable("learner_report")
        .set({
          ...(writesNarrative ? { narrative: json(narrative) } : {}),
          ...(added.length > 0 ? { decisions: JSON.stringify(decisions) } : {}),
        })
        .where("id", "=", reportId)
        .returningAll()
        .executeTakeFirstOrThrow();
      return read(LearnerReport, updated, ID_PREFIXES.learner_report);
    });
  }

  // The engine's records (dl-z5ja.19, on the dl-z5ja.7 tables). The run row is the lock: every
  // write fenced on `attempt` takes it `for update` first, so 2 steps of one run never interleave
  // and `seq` stays the run's max + 1 with no gap.

  async findRunPod(id: RunId): Promise<PodId | undefined> {
    return this.#in(null, async (tx) => {
      const { rows } = await sql<{ pod: string | null }>`
        select app.run_pod(${uuidOf(ID_PREFIXES.run, id)}) as pod
      `.execute(tx);
      const pod = rows[0]?.pod;
      return pod ? PodId.parse(idOf(ID_PREFIXES.pod, pod)) : undefined;
    });
  }

  async listRunsDue(now: string): Promise<readonly { pod: PodId; run: Run }[]> {
    const at = utc(now);
    return this.#in(null, async (tx) => {
      // app.runs_due reads past row-level security, as the pg_cron sweep does: every pod's runs.
      const { rows } = await sql<Selectable<DB["run"]>>`
        select * from app.runs_due(${at}::timestamptz)
      `.execute(tx);
      return rows.map((row) => {
        const run = runOf(row);
        return { pod: run.pod_id, run };
      });
    });
  }

  async createConversation(pod: PodId, conversation: NewConversation): Promise<Conversation> {
    const id = uuidOf(ID_PREFIXES.conversation, conversation.id);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const { row } = await this.#once(
        () => tx.selectFrom("conversation").selectAll().where("id", "=", id).executeTakeFirst(),
        () => {
          const valid = parse(
            Conversation,
            { ...conversation, pod_id: pod, created_at: new Date().toISOString() },
            "the conversation",
          );
          return tx
            .insertInto("conversation")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              created_by: uuidOf(ID_PREFIXES.account, valid.created_by),
              title: valid.title,
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      return read(Conversation, row, ID_PREFIXES.conversation);
    });
  }

  async createRun(pod: PodId, run: NewRun): Promise<Run> {
    const id = uuidOf(ID_PREFIXES.run, run.id);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      const { row } = await this.#once(
        () => tx.selectFrom("run").selectAll().where("id", "=", id).executeTakeFirst(),
        async () => {
          // Row-level security hides another pod's conversation and run, so each reads NotFound.
          const conversation =
            run.conversation_id === null
              ? null
              : uuidOf(ID_PREFIXES.conversation, run.conversation_id);
          if (conversation !== null) {
            const found = await tx
              .selectFrom("conversation")
              .select("id")
              .where("id", "=", conversation)
              .executeTakeFirst();
            if (!found) throw notFound("the conversation");
          }
          const resumes = run.resumes === null ? null : uuidOf(ID_PREFIXES.run, run.resumes);
          if (resumes !== null) {
            const found = await tx
              .selectFrom("run")
              .select("id")
              .where("id", "=", resumes)
              .executeTakeFirst();
            if (!found) throw notFound("the run it resumes");
          }
          const valid = parse(
            Run,
            {
              ...run,
              pod_id: pod,
              status: "queued",
              attempt: 1,
              cancel_requested_at: null,
              spent_usd: 0,
              created_at: new Date().toISOString(),
              completed_at: null,
            },
            "the run",
          );
          // No conflict target: run has 2 unique keys, id and (pod_id, id), and 2 racing inserts may
          // trip either, so any conflict falls through to the re-read (dl-z5ja.98).
          return tx
            .insertInto("run")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              created_by: uuidOf(ID_PREFIXES.account, valid.created_by),
              conversation_id: conversation,
              workflow: valid.workflow,
              resumes,
              idle_deadline_at: valid.idle_deadline_at,
              max_deadline_at: valid.max_deadline_at,
              cap_usd: valid.cap_usd,
              // The statement's own clock, not the transaction's: 2 runs created in one unit keep
              // the order they were written in, as a conversation lists its turns.
              created_at: sql<Date>`clock_timestamp()`,
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      return runOf(row);
    });
  }

  async listRuns(pod: PodId, conversation: ConversationId): Promise<readonly Run[]> {
    const id = uuidOf(ID_PREFIXES.conversation, conversation);
    return this.#in(pod, async (tx) => {
      const found = await tx
        .selectFrom("conversation")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      if (!found) throw notFound("the conversation");
      const rows = await tx
        .selectFrom("run")
        .selectAll()
        .where("conversation_id", "=", id)
        .orderBy("created_at")
        .orderBy("id")
        .execute();
      return rows.map(runOf);
    });
  }

  async getRun(pod: PodId, run: RunId): Promise<Run> {
    return this.#in(pod, async (tx) => runOf(await this.#run(tx, run, false)));
  }

  async updateRun(
    pod: PodId,
    run: RunId,
    attempt: number,
    change: RunChange,
  ): Promise<Fenced<Run>> {
    return this.#in(pod, async (tx) => {
      const stored = runOf(await this.#run(tx, run, true));
      if (stored.attempt !== attempt) return { stale: true, value: stored };
      const valid = parse(Run, { ...stored, ...change }, "the run");
      // Each column takes the checked record's value: a Run field and its column share a type.
      const set: Updateable<DB["run"]> = Object.fromEntries(
        RUN_CHANGE.filter((key) => key in change).map((key) => [key, valid[key]]),
      );
      if (Object.keys(set).length === 0) return { stale: false, value: stored };
      // The row is locked, so the attempt read above is still the stored one; the where clause
      // holds the fence in the statement as well.
      const updated = await tx
        .updateTable("run")
        .set(set)
        .where("id", "=", uuidOf(ID_PREFIXES.run, run))
        .where("attempt", "=", attempt)
        .returningAll()
        .executeTakeFirstOrThrow();
      return { stale: false, value: runOf(updated) };
    });
  }

  async appendRunEvents(
    pod: PodId,
    run: RunId,
    attempt: number,
    events: readonly NewRunEvent[],
  ): Promise<Fenced<readonly RunEvent[]>> {
    const runId = uuidOf(ID_PREFIXES.run, run);
    return this.#in(pod, async (tx) => {
      const stored = await this.#run(tx, run, true);
      if (events.some((e) => e.run_id !== run)) {
        throw new StoreError(ErrorType.enum.BadRequest, "an event belongs to another run");
      }
      if (stored.attempt !== attempt) return { stale: true, value: [] };
      if (events.length === 0) return { stale: false, value: [] };

      // Under the run's lock no other writer appends to this run, so the rows read here and the
      // max seq stay true until the insert.
      const held = new Map<string, RunEvent>();
      const kept = await tx
        .selectFrom("run_event")
        .selectAll()
        .where("run_id", "=", runId)
        .where(
          "event_id",
          "in",
          events.map((e) => e.event_id),
        )
        .execute();
      for (const row of kept) held.set(row.event_id, read(RunEvent, row));
      const last = await tx
        .selectFrom("run_event")
        .select(sql<number>`coalesce(max(seq), 0)`.as("seq"))
        .where("run_id", "=", runId)
        .executeTakeFirstOrThrow();

      // Every row is checked before any is written, so a refused batch appends nothing.
      const created_at = new Date().toISOString();
      const fresh: RunEvent[] = [];
      for (const event of events) {
        if (held.has(event.event_id)) continue;
        const row = parse(
          RunEvent,
          { ...event, seq: last.seq + fresh.length + 1, created_at },
          "the event",
        );
        held.set(row.event_id, row);
        fresh.push(row);
      }
      if (fresh.length > 0) {
        const inserted = await tx
          .insertInto("run_event")
          .values(
            fresh.map((e) => ({
              run_id: runId,
              seq: e.seq,
              event_id: e.event_id,
              pod_id: stored.pod_id,
              type: e.type,
              payload: json(e.payload) ?? "{}",
            })),
          )
          .returningAll()
          .execute();
        for (const row of inserted) held.set(row.event_id, read(RunEvent, row));
      }
      return {
        stale: false,
        value: events.map((e) => {
          const row = held.get(e.event_id);
          if (!row) throw new Error(`event ${e.event_id} was neither kept nor written`);
          return row;
        }),
      };
    });
  }

  async listRunEvents(pod: PodId, run: RunId, afterSeq: number): Promise<readonly RunEvent[]> {
    return this.#in(pod, async (tx) => {
      await this.#run(tx, run, false);
      const rows = await tx
        .selectFrom("run_event")
        .selectAll()
        .where("run_id", "=", uuidOf(ID_PREFIXES.run, run))
        .where("seq", ">", afterSeq)
        .orderBy("seq")
        .execute();
      return rows.map((row) => read(RunEvent, row));
    });
  }

  async putRunInbox(pod: PodId, entry: NewRunInbox): Promise<RunInbox> {
    return this.#in(pod, async (tx) => {
      const stored = await this.#run(tx, entry.run_id, false);
      const { row } = await this.#once(
        () =>
          tx
            .selectFrom("run_inbox")
            .selectAll()
            .where("event_id", "=", entry.event_id)
            .executeTakeFirst(),
        () => {
          const valid = parse(
            RunInbox,
            { ...entry, pod_id: pod, status: "pending", created_at: new Date().toISOString() },
            "the inbox row",
          );
          return tx
            .insertInto("run_inbox")
            .values({
              event_id: valid.event_id,
              run_id: stored.id,
              pod_id: stored.pod_id,
              kind: valid.kind,
              payload: json(valid.payload) ?? "{}",
              // The statement's clock, so rows put in one unit are taken in the order they came.
              created_at: sql<Date>`clock_timestamp()`,
            })
            .onConflict((oc) => oc.columns(["pod_id", "event_id"]).doNothing())
            .returningAll()
            .executeTakeFirst();
        },
      );
      // A replay is the same run's: an event_id is unique across a pod's runs (dl-z5ja.36). It is
      // unique per pod, not across pods (dl-z5ja.86), so another pod's row never conflicts.
      if (row.run_id !== stored.id) throw taken();
      return read(RunInbox, row);
    });
  }

  async messageUsage(pod: PodId, account: AccountId, since: UsageSince): Promise<MessageUsage> {
    const minute = utc(since.minuteSince);
    const day = utc(since.daySince);
    return this.#in(pod, async (tx) => {
      await this.#pod(tx, pod);
      // Row-level security keeps both reads in the pod; no index yet, a pod's rows are few.
      const sent = await tx
        .selectFrom("run_inbox")
        .innerJoin("run", (join) =>
          join
            .onRef("run.pod_id", "=", "run_inbox.pod_id")
            .onRef("run.id", "=", "run_inbox.run_id"),
        )
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("run_inbox.kind", "in", ["message", "steer"])
        .where("run.created_by", "=", uuidOf(ID_PREFIXES.account, account))
        .where("run_inbox.created_at", ">=", new Date(minute))
        .executeTakeFirstOrThrow();
      const caps = await tx
        .selectFrom("run")
        .select((eb) => eb.fn.coalesce(eb.fn.sum<number>("cap_usd"), eb.lit(0)).as("usd"))
        .where("created_at", ">=", new Date(day))
        .executeTakeFirstOrThrow();
      return { messages: Number(sent.n), cap_usd: Number(caps.usd) };
    });
  }

  async takeRunInbox(pod: PodId, run: RunId): Promise<readonly RunInbox[]> {
    return this.#in(pod, async (tx) => {
      await this.#run(tx, run, false);
      // The update locks each pending row; a 2nd take waiting on it finds the row delivered and
      // passes it by, so each row is taken once.
      const rows = await tx
        .updateTable("run_inbox")
        .set({ status: "delivered" })
        .where("run_id", "=", uuidOf(ID_PREFIXES.run, run))
        .where("status", "=", "pending")
        .returningAll()
        .execute();
      return rows
        .sort(
          (a, b) =>
            a.created_at.getTime() - b.created_at.getTime() || byText(a.event_id, b.event_id),
        )
        .map((row) => read(RunInbox, row));
    });
  }

  /** The run's row in the unit's pod, locked to the end of the unit when `lock`; else NotFound. */
  async #run(tx: Tx, run: RunId, lock: boolean): Promise<Selectable<DB["run"]>> {
    const query = tx.selectFrom("run").selectAll().where("id", "=", uuidOf(ID_PREFIXES.run, run));
    const row = await (lock ? query.forUpdate() : query).executeTakeFirst();
    if (!row) throw notFound("the run");
    return row;
  }
}

/** What `updateRun` may write: run.ts's `RunChange`, the columns the `run_change` trigger allows. */
const RUN_CHANGE = [
  "status",
  "attempt",
  "cancel_requested_at",
  "idle_deadline_at",
  "cap_usd",
  "spent_usd",
  "completed_at",
] as const satisfies readonly (keyof RunChange)[];

/** A run row as its record. */
function runOf(row: Selectable<DB["run"]>): Run {
  return read(Run, row, ID_PREFIXES.run);
}

/**
 * Takes the learner's lock to the end of the transaction. jadwigo_api may not update a learner, so
 * `for update` cannot hold the row: an advisory lock on its uuid does. Re-entrant within one
 * transaction, so `lockLearner` then `replaceMastery` take it once.
 */
async function holdLearner(tx: Tx, learner: string): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtextextended(${learner}::text, 0))`.execute(tx);
}

/** Strings in code-unit order, as `Array.prototype.sort` puts them. */
function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A JSON value with its keys sorted, so 2 reads of one value compare equal whatever jsonb's key order. */
function canonical(value: unknown): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v !== null && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([, inner]) => inner !== undefined)
              .sort(([a], [b]) => byText(a, b))
              .map(([k, inner]) => [k, sorted(inner)]),
          )
        : v;
  return JSON.stringify(sorted(value));
}

/** The roles a store may run as. Both own no table and never bypass row-level security. */
const DATABASE_ROLES = ["jadwigo_api", "jadwigo_runner"] as const;
type DatabaseRole = (typeof DATABASE_ROLES)[number];

/**
 * The pool's options. The Lambda passes `max: 1`: one execution serves one request at a time, and
 * Supavisor's transaction pooler (port 6543) shares the server connections. Kysely sends unnamed
 * queries, so no prepared statement outlives its transaction there. It also passes
 * `connectionTimeoutMillis`, so a connect that hangs after a thaw fails rather than running out
 * the Lambda's timeout.
 */
interface PoolOptions {
  readonly max?: number;
  /**
   * The role each unit sets: `jadwigo_api` for the API, `jadwigo_runner` for the step consumer
   * (wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`, Lead decision 7; dl-z5ja.7).
   */
  readonly role?: DatabaseRole;
  readonly connectionTimeoutMillis?: number;
  /** Called once per statement sent, each a round trip: a test counts what a request costs. */
  readonly onQuery?: (text: string) => void;
}

/**
 * The Store on Postgres, held to `store.contract.ts` as InMemoryStore is. `close` ends its pool.
 */
/**
 * A statement on the open unit's own connection: inside its transaction, as the store's role, with
 * the pod the unit last set (dl-z5ja.67). What `PgmqRunQueue.joining` takes, so a step is sent in
 * the transaction that writes its run and inbox row, and a unit that rolls back sends nothing.
 */
export interface UnitSql {
  query<R>(text: string, values?: readonly unknown[]): Promise<{ rows: R[] }>;
}

export function createPostgresStore(
  databaseUrl: string,
  options?: PoolOptions,
): Store & {
  close(): Promise<void>;
  /** The open unit's `UnitSql`. Called inside `unit()` only; it throws outside one. */
  unitSql(): UnitSql;
} {
  return new PostgresStore(databaseUrl, options);
}
