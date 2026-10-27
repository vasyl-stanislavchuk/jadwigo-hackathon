import { z } from "zod";
import {
  AnswerValue,
  Family,
  FamilyQuestion,
  Help,
  PartVerdict,
  QUESTION_TYPE_FAMILY,
  QuestionType,
} from "./families/index.ts";
import {
  AssignmentId,
  AttemptId,
  EventId,
  LearnerId,
  LessonId,
  LessonQuestionId,
  LessonVersionId,
  PodId,
} from "./ids.ts";

/**
 * The 10 records of the core v0 data model, as the API and jw see them: ids prefixed, times ISO
 * 8601 in UTC, fields named as the columns in `supabase/migrations` (RULES.md rule 17). The model
 * is `docs/research/core-data-model.md`.
 */

const At = z.iso.datetime();
/** A dense count from 1: `version`, `position`, `seq`, `try_no` (RULES.md rule 7). */
const Count = z.int().min(1);

export const Language = z.enum(["pl", "en", "uk"]);
export type Language = z.infer<typeof Language>;
export const Subject = z.enum(["math", "polish", "english"]);
export type Subject = z.infer<typeof Subject>;
export const Category = z.enum(["child", "adult"]);
export type Category = z.infer<typeof Category>;

/** A curriculum id, such as `math.mul.7x8`. A curriculum table comes later, keyed by the same strings. */
export const SkillId = z
  .string()
  .regex(/^[a-z]+(\.[a-z0-9-]+)+$/, "a skill id is lowercase words joined by dots");
export type SkillId = z.infer<typeof SkillId>;

/**
 * Who made a question and on what terms. The licence travels with the item, as Khan's requires
 * (decision `2026-10-27-a-lesson-question-s-credit-is-source-ref-url-licence-original-la`).
 */
export const Credit = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  url: z.url().optional(),
  licence: z.string().min(1),
  original_lang: Language,
  checked: z.iso.date(),
});
export type Credit = z.infer<typeof Credit>;

/** Where a question came from, and every change made to it on the way in. */
export const BasedOn = z.object({
  question: z.string().regex(/^(khan|bank|authored):.+$/, "khan:<id>, bank:<id> or authored:<id>"),
  changes: z.array(
    z.object({
      change: z.enum(["numbers", "context", "wording", "tutor_notes"]),
      why: z.string(),
      reviewed: z.boolean(),
    }),
  ),
});
export type BasedOn = z.infer<typeof BasedOn>;

// Content

export const Pod = z.object({
  id: PodId,
  name: z.string().min(1),
  language: Language,
  created_at: At,
});
export type Pod = z.infer<typeof Pod>;

export const Learner = z.object({
  id: LearnerId,
  pod_id: PodId,
  handle: z.string().min(1),
  first_name: z.string().min(1),
  age_group: z.string().nullable(),
  created_at: At,
});
export type Learner = z.infer<typeof Learner>;

export const LessonKind = z.enum(["practice", "review", "check", "diagnostic"]);
export const LessonStatus = z.enum(["draft", "published", "archived"]);

export const Lesson = z.object({
  id: LessonId,
  pod_id: PodId,
  title: z.string().min(1),
  language: Language,
  kind: LessonKind,
  status: LessonStatus,
  reasoning: z.string().nullable(),
  category: Category,
  subject: Subject,
  grade: z.int().min(0).nullable(),
  skill_ids: z.array(SkillId),
  created_at: At,
});
export type Lesson = z.infer<typeof Lesson>;

/** One published form of a lesson. `published_at` is set once, and then nothing changes. */
export const LessonVersion = z.object({
  id: LessonVersionId,
  pod_id: PodId,
  lesson_id: LessonId,
  version: Count,
  revises: LessonVersionId.nullable(),
  published_at: At.nullable(),
});
export type LessonVersion = z.infer<typeof LessonVersion>;

/** A version's list: planned questions at positions 1 to n, then the spares growth may draw. */
export const LessonVersionQuestion = z.object({
  lesson_version_id: LessonVersionId,
  position: Count,
  pod_id: PodId,
  lesson_question_id: LessonQuestionId,
  role: z.enum(["planned", "spare"]),
});
export type LessonVersionQuestion = z.infer<typeof LessonVersionQuestion>;

const LessonQuestionFields = z.object({
  id: LessonQuestionId,
  pod_id: PodId,
  question_type: QuestionType,
  say: z.string(),
  help: Help,
  credit: Credit.nullable(),
  subject: Subject,
  grade: z.int().min(0).nullable(),
  skill_ids: z.array(SkillId),
  twin_of: LessonQuestionId.nullable(),
  based_on: BasedOn.nullable(),
  content_hash: z.string().min(1),
  created_at: At,
});

/**
 * One question a lesson can ask: its family's data and key, the help ladder, the credit and the
 * attribution. Written once; an edit makes a new row. `key` never reaches the page.
 */
export const LessonQuestion = z
  .intersection(LessonQuestionFields, FamilyQuestion)
  .refine((q) => QUESTION_TYPE_FAMILY[q.question_type] === q.family, {
    message: "the question type belongs to another family",
    path: ["question_type"],
  });
export type LessonQuestion = z.infer<typeof LessonQuestion>;

// Who it goes to

/** What happens after Not sure yet: go on, ask the twin now, or ask it in a review round. */
export const AfterNotSure = z.enum(["next", "twin_now", "review_round"]);
export type AfterNotSure = z.infer<typeof AfterNotSure>;

export const Assignment = z.object({
  id: AssignmentId,
  pod_id: PodId,
  lesson_id: LessonId,
  /** Null serves the latest published version when an attempt starts. */
  lesson_version_id: LessonVersionId.nullable(),
  audience: z.enum(["learners", "anyone"]),
  identity: z.enum(["pick", "type", "none"]),
  after_not_sure: AfterNotSure,
  hold_verdicts: z.boolean(),
  opens_at: At.nullable(),
  closes_at: At.nullable(),
  created_at: At,
});
export type Assignment = z.infer<typeof Assignment>;

// Evidence

export const AttemptStatus = z.enum(["in_progress", "paused", "finished"]);
export type AttemptStatus = z.infer<typeof AttemptStatus>;

export const Attempt = z.object({
  id: AttemptId,
  pod_id: PodId,
  assignment_id: AssignmentId,
  lesson_version_id: LessonVersionId,
  learner_id: LearnerId.nullable(),
  player_name: z.string().nullable(),
  mode: z.enum(["real", "preview"]),
  status: AttemptStatus,
  /** The `seq` to come back to after a pause. */
  resume_at: Count.nullable(),
  started_at: At,
  finished_at: At.nullable(),
});
export type Attempt = z.infer<typeof Attempt>;

/** What a question is in an attempt: one the version planned, or a twin growth added. */
export const Added = z.enum(["planned", "twin"]);
export type Added = z.infer<typeof Added>;
/** Where an added question went: straight after, or into the review round. */
export const Placed = z.enum(["now", "review_round"]);
export type Placed = z.infer<typeof Placed>;
export const Ended = z.enum(["correct", "skipped"]);
export type Ended = z.infer<typeof Ended>;

/** One asking of a lesson question in one attempt, written when it is asked (RULES.md rule 7). */
export const AttemptQuestion = z.object({
  attempt_id: AttemptId,
  seq: Count,
  pod_id: PodId,
  lesson_question_id: LessonQuestionId,
  added: Added,
  placed: Placed.nullable(),
  /** The `seq` this one was added for; null when planned. */
  added_for: Count.nullable(),
  help_released: z.int().min(0),
  ended: Ended.nullable(),
  asked_at: At,
});
export type AttemptQuestion = z.infer<typeof AttemptQuestion>;

export const AnswerKind = z.enum(["try", "skip"]);
export type AnswerKind = z.infer<typeof AnswerKind>;
/** Why a question was skipped. `help_twin` is rung 4 of the ladder, which the server writes. */
export const SkipReason = z.enum(["dont_know", "asked_to_skip", "help_twin"]);
export type SkipReason = z.infer<typeof SkipReason>;

/** One try at an attempt question, or a skip. Append-only: never updated, never deleted. */
export const AttemptAnswer = z.object({
  event_id: EventId,
  pod_id: PodId,
  attempt_id: AttemptId,
  seq: Count,
  try_no: Count,
  kind: AnswerKind,
  /** What the learner gave; null for a skip. */
  value: AnswerValue.nullable(),
  skip_reason: SkipReason.nullable(),
  latency_ms: z.int().min(0),
  /** `help_released` on the attempt question when this try was made. */
  help_used: z.int().min(0),
  asked_at: At,
  answered_at: At,
  /** The verdict; null for a skip, and for a try no judge can mark. */
  correct: z.boolean().nullable(),
  mistake_class: z.string().nullable(),
  parts: z.array(PartVerdict).nullable(),
  judged_by: z.string().nullable(),
  body_hash: z.string().min(1),
});
export type AttemptAnswer = z.infer<typeof AttemptAnswer>;

/** One row of the `attempt_result` view: one attempt question and how it went. */
export const AttemptResult = z.object({
  pod_id: PodId,
  attempt_id: AttemptId,
  seq: Count,
  lesson_question_id: LessonQuestionId,
  added: Added,
  placed: Placed.nullable(),
  added_for: Count.nullable(),
  say: z.string(),
  family: Family,
  question_type: QuestionType,
  tries: z.int().min(0),
  first_try_correct: z.boolean(),
  correct: z.boolean(),
  mistake_classes: z.array(z.string()),
  help_used: z.int().min(0),
  skip_reason: SkipReason.nullable(),
  time_ms: z.int().min(0),
  ended: Ended.nullable(),
});
export type AttemptResult = z.infer<typeof AttemptResult>;

/** Every record, by its table name, for the naming test. */
export const RECORDS = {
  pod: Pod,
  learner: Learner,
  lesson: Lesson,
  lesson_version: LessonVersion,
  lesson_version_question: LessonVersionQuestion,
  lesson_question: LessonQuestionFields.extend({
    family: Family,
    data: z.unknown(),
    key: z.unknown(),
  }),
  assignment: Assignment,
  attempt: Attempt,
  attempt_question: AttemptQuestion,
  attempt_answer: AttemptAnswer,
  attempt_result: AttemptResult,
} as const;
