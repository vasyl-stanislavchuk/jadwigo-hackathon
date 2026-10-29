import { z } from "zod";
import {
  AnswerValue,
  HelpCard,
  HintCard,
  PageFamilyQuestion,
  PartMark,
  QuestionType,
  valueFor,
} from "./families/index.ts";
import { AssignmentId, EventId, LearnerId, LessonId, LessonQuestionId } from "./ids.ts";
import {
  Added,
  type Assignment,
  Attempt,
  type AttemptResult,
  Ended,
  Language,
  LessonQuestion,
  LessonQuestionExample,
  Placed,
  SkipReason,
} from "./records.ts";

/**
 * What crosses `/api/v1` during an attempt (decision
 * `2026-10-27-the-v0-attempt-rules-questions-only-on-the-wire-the-api-v1-route`). No steps: a v0
 * lesson is a list of questions, addressed by `seq` and `try_no`. The server owns the course, so
 * nothing here carries a key or help that has not been released (RULES.md rule 21).
 */

const At = z.iso.datetime();
/**
 * A time the page sends: UTC or with its offset, so a device on local time is not refused. A
 * time with no zone is refused: it could mean any instant. The store keeps it in UTC.
 *
 * At most milliseconds, so the stores compare the same instants (Postgres keeps microseconds, a
 * JavaScript date milliseconds), and a year from 1 to 9999 in UTC, so it is written in 4 digits.
 */
export const SentAt = z.iso
  .datetime({ offset: true })
  .refine((at) => !/\.\d{4,}/.test(at), "a sent time carries at most milliseconds")
  .refine((at) => {
    const year = new Date(Date.parse(at)).getUTCFullYear();
    return year >= 1 && year <= 9999;
  }, "a sent time falls in the years 1 to 9999 in UTC");
const Count = z.int().min(1);

/**
 * How a question ended, as the page sees it. While the assignment holds verdicts and the attempt
 * is not finished, an ended question is `done`: `correct`, `skipped` or `missed` would give the
 * verdict away. Once the attempt finishes, the page sees the stored value.
 *
 * ```text
 *                         stored ended           page, while held       page, after finish
 * right try               correct                done                   correct
 * wrong try (held only)   missed                 done                   missed
 * Not sure yet / rung 4   skipped                done                   skipped
 * still open              null                   null                   (cannot finish open)
 * ```
 */
export const PageEnded = z.enum([...Ended.options, "done"]);
export type PageEnded = z.infer<typeof PageEnded>;

/**
 * Whether verdicts are held from the page now: the assignment holds them until the attempt
 * finishes. While they are held, the course gives each question one try: a right one ends it
 * `correct`, a wrong one `missed`, and both go on to the next question the same way, with no
 * retry and no help ladder after a miss (decision
 * 2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a).
 */
export function verdictsHeld(
  assignment: Pick<Assignment, "hold_verdicts">,
  attempt: Pick<Attempt, "status">,
): boolean {
  return assignment.hold_verdicts && attempt.status !== "finished";
}

export function pageEnded(ended: Ended | null, held: boolean): PageEnded | null {
  if (ended === null) return null;
  return held ? "done" : ended;
}

/** One rung of the help ladder, as released to the page. */
export const ReleasedHelp = z.object({
  /** 1 look, 2 boost, 3 almost, 4 the twin. */
  rung: z.int().min(1).max(4),
  card: HelpCard.nullable(),
  /** Ids of the parts the card points at. */
  focus: z.array(z.string()),
  /** What a rung gives away (removed options, filled gaps, placed items), per family. */
  given: z.record(z.string(), z.unknown()).nullable(),
  worked: z.array(z.string()).nullable(),
  /** Rung 3 written from `worked` with its last line left blank. */
  blank: z.boolean(),
  hints: z.array(HintCard),
});
export type ReleasedHelp = z.infer<typeof ReleasedHelp>;

/**
 * The page's half of a question, as one JSON Schema definition: the snapshot carries it twice, in
 * the plan and in the questions asked, and a `$ref` keeps its snapshot under the 1 MB file cap
 * (`tools/src/check-no-bank.ts`). The shape is `PageFamilyQuestion`'s.
 */
const PageQuestion = PageFamilyQuestion.meta({ id: "PageFamilyQuestion" });

/** An attempt question as the page sees it: the page's half of the lesson question, never its key. */
export const PageAttemptQuestion = z.object({
  seq: Count,
  lesson_question_id: LessonQuestionId,
  question_type: QuestionType,
  say: z.string(),
  question: PageQuestion,
  added: Added,
  placed: Placed.nullable(),
  added_for: Count.nullable(),
  help_released: z.int().min(0),
  /** The rungs released so far, so a reload shows them again. */
  help: z.array(ReleasedHelp),
  /** Tries made so far, skips included. */
  tries: z.int().min(0),
  ended: PageEnded.nullable(),
  asked_at: At,
});
export type PageAttemptQuestion = z.infer<typeof PageAttemptQuestion>;

/**
 * A planned question of the attempt's version as the page sees it, asked or not: the page's half,
 * never its key. An attempt question with `added = planned` asks the entry with its
 * `lesson_question_id`, which is unique on a version.
 */
export const PagePlannedQuestion = z.object({
  position: Count,
  lesson_question_id: LessonQuestionId,
  question_type: QuestionType,
  say: z.string(),
  question: PageQuestion,
});
export type PagePlannedQuestion = z.infer<typeof PagePlannedQuestion>;

/** `GET /api/v1/attempts/{id}`, and the reply to a start: the plan and everything asked so far. */
export const AttemptSnapshot = z.object({
  attempt: Attempt,
  /**
   * The whole pre-defined lesson, in `position` order, so the page knows its length from the
   * start (decision 2026-10-28-the-page-loads-the-whole-planned-lesson-when-an-attempt-starts-s).
   * Spares are drawn by growth and explain questions are never asked in v0, so neither is on it.
   * An entry is answerable only once the server asks it and it shows in `questions`.
   */
  plan: z.array(PagePlannedQuestion),
  /** In `seq` order. The open one, when there is one, is last. */
  questions: z.array(PageAttemptQuestion),
  /** The open question's `seq`, or null once the attempt is finished. */
  open_seq: Count.nullable(),
  last_event_id: EventId.nullable(),
});
export type AttemptSnapshot = z.infer<typeof AttemptSnapshot>;

/** `POST /api/v1/assignments/{id}/attempts`. */
export const AttemptStart = z.strictObject({
  learner_id: LearnerId.nullable().optional(),
  player_name: z.string().min(1).nullable().optional(),
  mode: z.enum(["real", "preview"]).optional(),
});
export type AttemptStart = z.infer<typeof AttemptStart>;

const AnswerFields = {
  event_id: EventId,
  seq: Count,
  try_no: Count,
  latency_ms: z.int().min(0),
  asked_at: SentAt,
  answered_at: SentAt,
};

/**
 * `POST /api/v1/attempts/{id}/answers`: one try, or a skip. Strict, so a field the server owns
 * (`correct`, `mistake_class`, `help_used`, a `skip_reason` of `help_twin`) is refused.
 */
export const AttemptAnswerRequest = z
  .discriminatedUnion("kind", [
    z.strictObject({ ...AnswerFields, kind: z.literal("try"), value: AnswerValue }),
    z.strictObject({
      ...AnswerFields,
      kind: z.literal("skip"),
      skip_reason: SkipReason.exclude(["help_twin"]),
    }),
  ])
  .refine((a) => Date.parse(a.answered_at) >= Date.parse(a.asked_at), {
    message: "an answer is given after its question is asked",
    path: ["answered_at"],
  });
export type AttemptAnswerRequest = z.infer<typeof AttemptAnswerRequest>;

/** What a correct try reveals from the key, once it can no longer give the answer away. */
export const Reveal = z.object({
  why: z.string().optional(),
  worked_solution: z.array(z.string()).optional(),
  other_form: z.string().optional(),
  question_form: z.string().optional(),
});
export type Reveal = z.infer<typeof Reveal>;

/** The reply to an answer. A replay with the same body returns the stored reply, `replayed: true`. */
export const AttemptAnswerResult = z.object({
  event_id: EventId,
  seq: Count,
  try_no: Count,
  replayed: z.boolean(),
  /** Null for a skip, and while the assignment holds verdicts. */
  correct: z.boolean().nullable(),
  /** Which parts were correct after a miss, never the mistake class. Null while verdicts are held. */
  parts: z.array(PartMark).nullable(),
  /** Null while verdicts are held: a reveal follows a correct try. */
  reveal: Reveal.nullable(),
  /** How the question ended (`done` while verdicts are held), or null while it stays open after a miss. */
  ended: PageEnded.nullable(),
  /** The question asked next, written as it is asked; null when this one stays open or the attempt finished. */
  next: PageAttemptQuestion.nullable(),
  attempt_status: Attempt.shape.status,
});
export type AttemptAnswerResult = z.infer<typeof AttemptAnswerResult>;

/**
 * `POST /api/v1/attempts/{id}/questions/{seq}/help`. The page sends the `help_released` it has
 * seen, and the server releases a rung only when that is still current, so a retried request
 * returns the same rung instead of releasing two (RULES.md rule 19, with no row to key on).
 */
export const HelpRequest = z.strictObject({
  help_released: z.int().min(0),
});
export type HelpRequest = z.infer<typeof HelpRequest>;

/**
 * The reply to Help. `released` is null when nothing more can be given yet (the gate holds rungs
 * 3 and 4 until one real try). Rung 4 ends the question skipped (`help_twin`) and asks its twin.
 */
export const HelpResult = z.object({
  seq: Count,
  help_released: z.int().min(0),
  released: ReleasedHelp.nullable(),
  more: z.boolean(),
  ended: PageEnded.nullable(),
  next: PageAttemptQuestion.nullable(),
});
export type HelpResult = z.infer<typeof HelpResult>;

/** `PATCH /api/v1/attempts/{id}`: pause and resume. The server finishes an attempt itself. */
export const AttemptPatch = z.strictObject({
  status: z.enum(["paused", "in_progress"]),
});
export type AttemptPatch = z.infer<typeof AttemptPatch>;

/**
 * One question of the child's after-lesson list: what was asked, how it ended and the help used.
 * No tries, no time and no mistake classes: the list is not a score (decision
 * `2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended`). The full
 * `attempt_result` row is for the parent.
 */
export const PageAttemptResult = z.object({
  seq: Count,
  lesson_question_id: LessonQuestionId,
  say: z.string(),
  added: Added,
  /** Null while the question is open. */
  ended: PageEnded.nullable(),
  help_used: z.int().min(0),
});
export type PageAttemptResult = z.infer<typeof PageAttemptResult>;

export function pageAttemptResult(row: AttemptResult, held: boolean): PageAttemptResult {
  return {
    seq: row.seq,
    lesson_question_id: row.lesson_question_id,
    say: row.say,
    added: row.added,
    ended: pageEnded(row.ended, held),
    help_used: row.help_used,
  };
}

/**
 * `GET /api/v1/attempts/{id}/results`: the list in `seq` order, readable mid-lesson too. While
 * verdicts are held (`verdictsHeld`), each ended question is `done`.
 */
export const AttemptResults = z.object({
  attempt: Attempt,
  results: z.array(PageAttemptResult),
});
export type AttemptResults = z.infer<typeof AttemptResults>;

/**
 * The login-free tier's invisible limits (decision
 * `2026-10-26-the-login-free-lesson-is-protected-by-invisible-limits-only-per`): nothing is shown
 * to a child before them, and a request past one is refused.
 *
 * - `answersPerAttempt`: the answers one attempt stores; the next is `AnswerLimit` (owner,
 *   2026-10-28: 200, well above the longest featured lesson's tries and twins).
 * - `bodyBytes`: a request body's size, past which it is `BadRequest` before it is parsed.
 * - `enteredChars`: an entered answer's length, past which it is `BadRequest` before it is judged.
 */
export const LIMITS = {
  answersPerAttempt: 200,
  bodyBytes: 16_384,
  enteredChars: 200,
} as const;

/** A lesson anyone may play now, from the landing page. */
export const FeaturedLesson = z.object({
  assignment_id: AssignmentId,
  lesson_id: LessonId,
  title: z.string().min(1),
  language: Language,
});
export type FeaturedLesson = z.infer<typeof FeaturedLesson>;

/** `GET /api/v1/featured-lessons`: the featured pod's open `anyone` assignments, oldest first. */
export const Featured = z.object({ lessons: z.array(FeaturedLesson) });
export type Featured = z.infer<typeof Featured>;

/**
 * `GET /api/v1/playground-examples/{language}`: every written example in Jadwigo's own pod in
 * that language, by question type, then position, and every question and twin they name, once.
 * The one response that carries a key (RULES.md rule 21): the playground is a review tool over
 * Jadwigo's own authored examples, and Try it looks a free answer up in the key's accepted and
 * near answers (owner, 2026-10-28, `dl-w3.75`).
 */
export const PlaygroundExamples = z
  .object({
    examples: z.array(LessonQuestionExample),
    questions: z.array(LessonQuestion),
  })
  .superRefine((reply, ctx) => {
    const byId = new Map(reply.questions.map((q) => [q.id, q]));
    reply.examples.forEach((example, i) => {
      const question = byId.get(example.lesson_question_id);
      if (!question || (example.twin !== null && !byId.has(example.twin))) {
        ctx.addIssue({
          code: "custom",
          message: "names a question the reply lacks",
          path: ["examples", i],
        });
        return;
      }
      const value = valueFor(question.family);
      example.scenarios.forEach((scenario, j) => {
        if (!value.safeParse(scenario.value).success) {
          ctx.addIssue({
            code: "custom",
            message: `not a ${question.family} value`,
            path: ["examples", i, "scenarios", j, "value"],
          });
        }
      });
    });
  });
export type PlaygroundExamples = z.infer<typeof PlaygroundExamples>;

/** Every error type, with its status (RULES.md rule 20). */
export const ERROR_STATUS = {
  BadRequest: 400,
  ServerFieldSupplied: 400,
  NotFound: 404,
  AssignmentClosed: 409,
  AttemptFinished: 409,
  AttemptPaused: 409,
  QuestionNotOpen: 409,
  TryOutOfOrder: 409,
  AnswerConflict: 409,
  EventIdMismatch: 409,
  WriteOnce: 409,
  AnswerLimit: 429,
  Unauthorized: 401,
  BankUnavailable: 502,
} as const;
export const ErrorType = z.enum(
  Object.keys(ERROR_STATUS) as [keyof typeof ERROR_STATUS, ...(keyof typeof ERROR_STATUS)[]],
);
export type ErrorType = z.infer<typeof ErrorType>;

/** `{error: {type, message}}`. `message` is for a person and never names the key. */
export const ErrorEnvelope = z.object({
  error: z.object({ type: ErrorType, message: z.string() }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

/** `GET /api/health`, outside the version. */
export const Health = z.object({ status: z.literal("ok") });
export type Health = z.infer<typeof Health>;
