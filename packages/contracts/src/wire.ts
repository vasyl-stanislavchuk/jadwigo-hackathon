import { z } from "zod";
import {
  AnswerValue,
  HelpCard,
  HintCard,
  PageFamilyQuestion,
  PartMark,
  QuestionType,
} from "./families/index.ts";
import { EventId, LearnerId, LessonQuestionId } from "./ids.ts";
import { Added, Attempt, AttemptResult, Ended, Placed, SkipReason } from "./records.ts";

/**
 * What crosses `/api/v1` during an attempt (decision
 * `2026-10-27-the-v0-attempt-rules-questions-only-on-the-wire-the-api-v1-route`). No steps: a v0
 * lesson is a list of questions, addressed by `seq` and `try_no`. The server owns the course, so
 * nothing here carries a key or help that has not been released (RULES.md rule 21).
 */

const At = z.iso.datetime();
const Count = z.int().min(1);

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

/** An attempt question as the page sees it: the page's half of the lesson question, never its key. */
export const PageAttemptQuestion = z.object({
  seq: Count,
  lesson_question_id: LessonQuestionId,
  question_type: QuestionType,
  say: z.string(),
  question: PageFamilyQuestion,
  added: Added,
  placed: Placed.nullable(),
  added_for: Count.nullable(),
  help_released: z.int().min(0),
  /** The rungs released so far, so a reload shows them again. */
  help: z.array(ReleasedHelp),
  /** Tries made so far, skips included. */
  tries: z.int().min(0),
  ended: Ended.nullable(),
  asked_at: At,
});
export type PageAttemptQuestion = z.infer<typeof PageAttemptQuestion>;

/** `GET /api/v1/attempts/{id}`, and the reply to a start: everything asked so far. */
export const AttemptSnapshot = z.object({
  attempt: Attempt,
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
  asked_at: At,
  answered_at: At,
};

/**
 * `POST /api/v1/attempts/{id}/answers`: one try, or a skip. Strict, so a field the server owns
 * (`correct`, `mistake_class`, `help_used`, a `skip_reason` of `help_twin`) is refused.
 */
export const AttemptAnswerRequest = z.discriminatedUnion("kind", [
  z.strictObject({ ...AnswerFields, kind: z.literal("try"), value: AnswerValue }),
  z.strictObject({
    ...AnswerFields,
    kind: z.literal("skip"),
    skip_reason: SkipReason.exclude(["help_twin"]),
  }),
]);
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
  /** Which parts were correct after a miss, never the mistake class. */
  parts: z.array(PartMark).nullable(),
  reveal: Reveal.nullable(),
  /** How the question ended, or null while it stays open after a miss. */
  ended: Ended.nullable(),
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
  ended: Ended.nullable(),
  next: PageAttemptQuestion.nullable(),
});
export type HelpResult = z.infer<typeof HelpResult>;

/** `PATCH /api/v1/attempts/{id}`: pause and resume. The server finishes an attempt itself. */
export const AttemptPatch = z.strictObject({
  status: z.enum(["paused", "in_progress"]),
});
export type AttemptPatch = z.infer<typeof AttemptPatch>;

/** `GET /api/v1/attempts/{id}/results`: the `attempt_result` view, in `seq` order. */
export const AttemptResults = z.object({
  attempt: Attempt,
  results: z.array(AttemptResult),
});
export type AttemptResults = z.infer<typeof AttemptResults>;

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
