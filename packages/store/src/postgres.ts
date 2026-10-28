import {
  Account,
  AccountId,
  Assignment,
  AssignmentId,
  Attempt,
  AttemptAnswer,
  AttemptId,
  AttemptQuestion,
  AttemptResult,
  Ended,
  ErrorType,
  Goal,
  ID_PREFIXES,
  type IdPrefix,
  idOf,
  Language,
  Learner,
  type LearnerAttempts,
  LearnerId,
  type LearnerSnapshot,
  Lesson,
  LessonId,
  LessonQuestion,
  LessonQuestionId,
  LessonVersion,
  LessonVersionId,
  LessonVersionQuestion,
  type Me,
  Member,
  Pod,
  PodId,
  SentAt,
  type Uuid,
  uuidOf,
  valueFor,
} from "@jadwigo/contracts";
import { Kysely, PostgresDialect, type Selectable, sql, type Transaction } from "kysely";
import pg from "pg";
import type { DB } from "./db/types.ts";
import { handleFor } from "./handle.ts";
import {
  type AttemptRecord,
  type HelpTwin,
  type LessonVersionWithQuestions,
  type MemberScope,
  type NewAssignment,
  type NewAttempt,
  type NewAttemptAnswer,
  type NewAttemptQuestion,
  type NewClaim,
  type NewLearner,
  type NewLearnerWithGoals,
  type NewLesson,
  type NewLessonQuestion,
  type NewLessonVersion,
  type NewPod,
  type OpenAssignment,
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

type Tx = Transaction<DB>;

/** The prefix of each id column that is not its own table's `id`. `event_id` stays a bare uuid. */
const PREFIXES: Readonly<Record<string, IdPrefix>> = {
  pod_id: ID_PREFIXES.pod,
  learner_id: ID_PREFIXES.learner,
  lesson_id: ID_PREFIXES.lesson,
  lesson_version_id: ID_PREFIXES.lesson_version,
  revises: ID_PREFIXES.lesson_version,
  lesson_question_id: ID_PREFIXES.lesson_question,
  twin_of: ID_PREFIXES.lesson_question,
  assignment_id: ID_PREFIXES.assignment,
  attempt_id: ID_PREFIXES.attempt,
  account_id: ID_PREFIXES.account,
  claimed_by: ID_PREFIXES.account,
  moved_by: ID_PREFIXES.account,
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
function refusal(error: unknown): unknown {
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
    case "23502": // not_null_violation
    case "23514": // check_violation, answered_at >= asked_at among them
    case "22P02": // invalid_text_representation: a value outside its enum
    case "P0002": // no_data_found: app.claim_attempt's learner, account or attempt
      return new StoreError(ErrorType.enum.NotFound, error.message);
    case "23001": // restrict_violation: the write-once, `missed` and claim triggers
      // The claim trigger names its refusal in the detail.
      if (error.detail === "AttemptClaimed" || error.detail === "AttemptPreview") {
        return new StoreError(ErrorType.enum[error.detail], error.message);
      }
      return new StoreError(ErrorType.enum.BadRequest, error.message);
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
      return new StoreError(ErrorType.enum.BadRequest, error.message);
    default:
      return error;
  }
}

/**
 * The Store on Postgres, through Kysely. Each call is one transaction, run as the `jadwigo_api`
 * role (`set local role`, so the login must be a member of it) with `app.pod_id` set to the pod
 * it is scoped to, so row-level security holds every read and write to that pod. The rules are
 * checked in code first, under row locks, in the order InMemoryStore checks them: the attempt
 * row for asking, answering, pausing and finishing; the attempt question for help, ending and
 * answers; the lesson for publishing. The database's own refusals are mapped by `refusal`.
 */
class PostgresStore implements Store {
  readonly #db: Kysely<DB>;

  constructor(databaseUrl: string, options: PoolOptions = {}) {
    const pool = new pg.Pool({ connectionString: databaseUrl, ...options });
    // An idle connection that drops (Supavisor closes it, or the socket dies while a Lambda is
    // frozen) emits 'error' on the pool; with no listener that is an uncaught exception. The pool
    // has already discarded the client, so the next query opens a fresh one.
    pool.on("error", (error) => {
      console.error("an idle Postgres connection dropped:", error.message);
    });
    this.#db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
  }

  async close(): Promise<void> {
    await this.#db.destroy();
  }

  async #in<T>(pod: PodId | null, work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.#db.transaction().execute(async (tx) => {
        await sql`set local role jadwigo_api`.execute(tx);
        if (pod !== null) {
          await sql`select set_config('app.pod_id', ${uuidOf(ID_PREFIXES.pod, pod)}, true)`.execute(
            tx,
          );
        }
        return work(tx);
      });
    } catch (error) {
      throw refusal(error);
    }
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
              created_at: new Date().toISOString(),
              ...learner,
              id: wire,
              pod_id: pod,
            },
            "the learner",
          );
          return tx
            .insertInto("learner")
            .values({
              id,
              pod_id: uuidOf(ID_PREFIXES.pod, pod),
              handle: valid.handle,
              first_name: valid.first_name,
              age_group: valid.age_group,
            })
            .onConflict((oc) => oc.column("id").doNothing())
            .returningAll()
            .executeTakeFirst();
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
            .onConflict((oc) => oc.column("id").doNothing())
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
            .onConflict((oc) => oc.column("id").doNothing())
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
    const versionId = uuidOf(ID_PREFIXES.lesson_version, id);
    return this.#in(pod, async (tx) => {
      const version = await tx
        .selectFrom("lesson_version")
        .selectAll()
        .where("id", "=", versionId)
        .executeTakeFirst();
      if (!version) throw notFound("the lesson version");
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
            .onConflict((oc) => oc.column("id").doNothing())
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
        .onConflict((oc) => oc.column("id").doNothing())
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

  async #record(tx: Tx, attemptId: string): Promise<AttemptRecord> {
    const attempt = await tx
      .selectFrom("attempt")
      .selectAll()
      .where("id", "=", attemptId)
      .executeTakeFirst();
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

  /** The attempt question, locked for this transaction. */
  async #asking(tx: Tx, attemptId: string, seq: number) {
    const attempt = await tx
      .selectFrom("attempt")
      .select("id")
      .where("id", "=", attemptId)
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
      await this.#playing(tx, attemptId);
      const asked = await tx
        .selectFrom("attempt_question")
        .select(["seq", "ended"])
        .where("attempt_id", "=", attemptId)
        .execute();
      if (asked.some((q) => q.ended === null)) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question is still open");
      }
      if (options.seq !== undefined && options.seq !== asked.length + 1) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "another question took this seq");
      }
      const lessonQuestionId = uuidOf(ID_PREFIXES.lesson_question, question.lesson_question_id);
      const exists = await tx
        .selectFrom("lesson_question")
        .select("id")
        .where("id", "=", lessonQuestionId)
        .executeTakeFirst();
      if (!exists) throw notFound("the lesson question");
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
      await tx.selectFrom("attempt").select("id").where("id", "=", attemptId).forUpdate().execute();
      const stored = await find();
      if (stored) return replay(stored);
      const attempt = await this.#playing(tx, attemptId);
      if (attempt.status === "paused") {
        throw new StoreError(ErrorType.enum.AttemptPaused, "this attempt is paused");
      }
      const question = await this.#asking(tx, attemptId, answer.seq);
      if (question.ended !== null) {
        throw new StoreError(ErrorType.enum.QuestionNotOpen, "this question has ended");
      }
      const tries = await tx
        .selectFrom("attempt_answer")
        .select("try_no")
        .where("attempt_id", "=", attemptId)
        .where("seq", "=", answer.seq)
        .execute();
      if (tries.some((a) => a.try_no === answer.try_no)) {
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
      const { family } = await tx
        .selectFrom("lesson_question")
        .select("family")
        .where("id", "=", question.lesson_question_id)
        .executeTakeFirstOrThrow();
      if (valid.kind === "try" && !valueFor(family).safeParse(valid.value).success) {
        throw new StoreError(ErrorType.enum.BadRequest, `the value is not a ${family} value`);
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
      const { rows } = await sql<{ pod: string | null }>`
        select app.member_pod(${sub}) as pod
      `.execute(tx);
      const pod = rows[0]?.pod;
      if (!pod) return undefined;
      await sql`select set_config('app.pod_id', ${pod}, true)`.execute(tx);
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

  async createAccount(sub: Uuid, language: Language): Promise<MemberScope> {
    const found = await this.findMember(sub);
    if (found) return found;
    const pod = mint(PodId, ID_PREFIXES.pod);
    const podId = uuidOf(ID_PREFIXES.pod, pod);
    try {
      return await this.#in(pod, async (tx) => {
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
    } catch (error) {
      // A racing first sign-in of the same user made its account first: this one wrote nothing.
      if (error instanceof StoreError && error.type === "WriteOnce") {
        const raced = await this.findMember(sub);
        if (raced) return raced;
      }
      throw error;
    }
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
    // A racing add can take the handle this one picked; the next try picks past it.
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.#addLearner(pod, learner);
      } catch (error) {
        if (attempt >= 3 || !(error instanceof StoreError) || error.type !== "WriteOnce")
          throw error;
      }
    }
  }

  async #addLearner(pod: PodId, learner: NewLearnerWithGoals): Promise<LearnerSnapshot> {
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
        .returningAll()
        .executeTakeFirstOrThrow();
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
}

/**
 * The pool's options. The Lambda passes `max: 1`: one execution serves one request at a time, and
 * Supavisor's transaction pooler (port 6543) shares the server connections. Kysely sends unnamed
 * queries, so no prepared statement outlives its transaction there. It also passes
 * `connectionTimeoutMillis`, so a connect that hangs after a thaw fails rather than running out
 * the Lambda's timeout.
 */
interface PoolOptions {
  readonly max?: number;
  readonly connectionTimeoutMillis?: number;
}

/**
 * The Store on Postgres, held to `store.contract.ts` as InMemoryStore is. `close` ends its pool.
 */
export function createPostgresStore(
  databaseUrl: string,
  options?: PoolOptions,
): Store & { close(): Promise<void> } {
  return new PostgresStore(databaseUrl, options);
}
