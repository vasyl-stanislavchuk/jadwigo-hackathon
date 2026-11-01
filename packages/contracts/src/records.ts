import { z } from "zod";
import {
  AnswerValue,
  Family,
  FamilyQuestion,
  Help,
  PartMark,
  PartVerdict,
  QUESTION_TYPE_FAMILY,
  QuestionType,
} from "./families/index.ts";
import {
  AccountId,
  AssignmentId,
  AttemptId,
  CurriculumId,
  EventId,
  GoalId,
  LearnerId,
  LearnerReportId,
  LessonId,
  LessonQuestionExampleId,
  LessonQuestionId,
  LessonVersionId,
  MemberId,
  PodId,
  TopicId,
  Uuid,
} from "./ids.ts";

/**
 * The 10 records of the core v0 data model, as the API and jw see them: ids prefixed, times ISO
 * 8601 in UTC, fields named as the columns in `supabase/migrations` (RULES.md rule 17). The model
 * is `docs/research/core-data-model.md`.
 */

const At = z.iso.datetime();
/** A dense count from 1: `version`, `position`, `seq`, `try_no` (RULES.md rule 7). */
const Count = z.int().min(1);

/**
 * The languages Jadwigo speaks, the codes in packages/config/src/languages.ts, which
 * tools/src/check-languages.ts compares with this list (contracts imports nothing of ours). No
 * Ukrainian (jadwigo-platform decision of 2026-10-26); Polish and English are both served
 * (jadwigo-marketing/decisions/2026-11-01-for-the-hackathon-jadwigo-is-live-in-polish-and-english-on-jadwi).
 * The database's `language` type still lists `uk`; no row uses it.
 */
export const Language = z.enum(["pl", "en"]);
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
  /**
   * When a parent gave the pod's consent to the AI, null before it and after a withdrawal
   * (dl-z5ja.112, decision dl-uafq). The conversation routes answer `AiConsentMissing` while it
   * is null. A reply written before the column (a page's fixture, a cached `Me`) reads as null.
   */
  ai_consent_at: At.nullable().default(null),
});
export type Pod = z.infer<typeof Pod>;

export const Learner = z.object({
  id: LearnerId,
  pod_id: PodId,
  handle: z.string().min(1),
  first_name: z.string().min(1),
  age_group: z.string().nullable(),
  /** The learner's school, inferred or told (migration 20261031120000_learner_knowledge.sql). */
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, "a country is 2 capital letters")
    .nullable(),
  curriculum_id: CurriculumId.nullable(),
  school_grade: z.int().min(0).nullable(),
  school_language: Language.nullable(),
  created_at: At,
});
export type Learner = z.infer<typeof Learner>;

// People (decision 2026-10-27-the-v0-people-records-are-pod-and-learner-account-and-member-com).

/**
 * Someone who signs in. `sub` is the Supabase Auth user, the token's `sub` claim; `pod_id` is the
 * pod the first sign-in made. No email and no name: the token carries them.
 */
export const Account = z.object({
  id: AccountId,
  pod_id: PodId,
  sub: Uuid,
  created_at: At,
});
export type Account = z.infer<typeof Account>;

/** What an account is in a pod: the parent of its learners, or a learner who signs in as `self`. */
export const MemberRole = z.enum(["parent", "self"]);
export type MemberRole = z.infer<typeof MemberRole>;

/** One account in one pod. Which learners it covers waits on the owner (dl-e8ov.2.28). */
export const Member = z.object({
  id: MemberId,
  pod_id: PodId,
  account_id: AccountId,
  role: MemberRole,
  created_at: At,
});
export type Member = z.infer<typeof Member>;

/** Where a goal stands for the parent: on, set aside, reached, or given up. */
export const GoalStatus = z.enum(["active", "paused", "reached", "dropped"]);
export type GoalStatus = z.infer<typeof GoalStatus>;

/**
 * A goal for one learner: the adult's name for it, their own words, the language its lessons are
 * in, and where it stands. Its skills are `goal_skill` rows. Goals have no stages.
 */
export const Goal = z.object({
  id: GoalId,
  pod_id: PodId,
  learner_id: LearnerId,
  name: z.string().min(1),
  /** The parent's own words for what they want, kept as they wrote them. */
  words: z.string().min(1).nullable(),
  lesson_language: Language,
  status: GoalStatus,
  created_at: At,
});
export type Goal = z.infer<typeof Goal>;

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

/**
 * One way a child might answer a question, written by hand for the playground (decision
 * `2026-10-27-until-the-judges-land-the-playground-s-try-it-plays-each-example`): the value
 * committed, what it shows and the parts the page marks. Nothing judges it; the value is checked
 * against its question's family by `LessonQuestionExample`'s readers.
 */
export const ExampleScenario = z.object({
  /** What the child tries, for the owner: "types 54". */
  try: z.string().min(1),
  value: z.unknown(),
  outcome: z.enum(["correct", "incorrect"]),
  mistake_class: z.string().min(1).nullable(),
  marks: z.array(PartMark),
});
export type ExampleScenario = z.infer<typeof ExampleScenario>;

/**
 * A question type's written example in one language, shown in the playground: its question and
 * its twin, a label for the owner and the scenarios Try it plays. Not write-once: the seed
 * replaces a pod's examples, and the questions stay write-once (owner, 2026-10-28, `dl-w3.75`).
 */
export const LessonQuestionExample = z.object({
  id: LessonQuestionExampleId,
  pod_id: PodId,
  lesson_question_id: LessonQuestionId,
  /** Help rung 4's twin: a lesson question whose `twin_of` is this example's question. */
  twin: LessonQuestionId.nullable(),
  language: Language,
  /** Unique within its question type and language, used in the playground's URL. */
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "a slug is lowercase words joined by dashes"),
  /** Its place among its question type's examples, the showcase first. */
  position: Count,
  /** What sets this example apart, for the owner, in English. */
  label: z.string().min(1),
  showcase: z.boolean(),
  scenarios: z.array(ExampleScenario),
  created_at: At,
});
export type LessonQuestionExample = z.infer<typeof LessonQuestionExample>;

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
  /**
   * The claim (migration 20261029120000_parent_login.sql): the account that attached this
   * anonymous attempt to a learner, and when. A claimed attempt stays in the pod it was played in,
   * and its learner may be in the claimer's pod. Optional until both stores fill them
   * (dl-e8ov.2.39); null on an attempt nobody claimed.
   */
  claimed_by: AccountId.nullable().optional(),
  claimed_at: At.nullable().optional(),
  /** A move between learners, which comes with dl-e8ov.5.11. Null until then. */
  moved_by: AccountId.nullable().optional(),
  moved_at: At.nullable().optional(),
});
export type Attempt = z.infer<typeof Attempt>;

/** What a question is in an attempt: one the version planned, or a twin growth added. */
export const Added = z.enum(["planned", "twin"]);
export type Added = z.infer<typeof Added>;
/** Where an added question went: straight after, or into the review round. */
export const Placed = z.enum(["now", "review_round"]);
export type Placed = z.infer<typeof Placed>;
/**
 * How an attempt question ended. An open question is `null`; it ends once (RULES.md rule 11).
 *
 * ```text
 *                    the assignment's hold_verdicts
 *                    off (practice)                  on, attempt not finished (a check)
 * right try          correct                         correct
 * wrong try          stays open: retry, help ladder  missed: no retry, no help after it
 * Not sure yet,
 * or help rung 4     skipped (and its twin)          skipped (and its twin)
 * ```
 *
 * `missed` exists only while verdicts are held, so a second try can't give the verdict away
 * (decision 2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a). The
 * database and the Store refuse it unless the attempt's assignment holds verdicts and the
 * question has a wrong try and no right one.
 */
export const Ended = z.enum(["correct", "skipped", "missed"]);
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
  /** The server's hash of the request body, never sent by the page: a replay is matched on it. */
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

// The learner knowledge base (migration 20261031120000_learner_knowledge.sql, epic dl-e8ov.5).
// The shared catalogue (curriculum, topic, skill) lives in Jadwigo's own pod, which every pod
// reads (decision jadwigo-hackathon 2026-10-30, the shared curriculum lives in shared Postgres
// tables). Code computes every level and the brief; the AI only writes a report's narrative.

/** A curriculum: the podstawa programowa of one country, in one version and language. */
export const Curriculum = z.object({
  id: CurriculumId,
  pod_id: PodId,
  code: z.string().min(1),
  name: z.string().min(1),
  country: z.string().regex(/^[A-Z]{2}$/, "a country is 2 capital letters"),
  version: z.string().min(1),
  language: Language,
  source_url: z.url().nullable(),
  created_at: At,
});
export type Curriculum = z.infer<typeof Curriculum>;

/** One outcome of a curriculum, such as `II.3.3`, in the law's own words. */
export const Topic = z.object({
  id: TopicId,
  pod_id: PodId,
  curriculum_id: CurriculumId,
  code: z.string().min(1),
  area: z.string().min(1),
  text: z.string().min(1),
  created_at: At,
});
export type Topic = z.infer<typeof Topic>;

/** What a skill measures: a right answer, or a right answer in time (`fast_ms` waits on the owner). */
export const SkillKind = z.enum(["accuracy", "speed"]);
export type SkillKind = z.infer<typeof SkillKind>;
/** A catalogue skill's standing: a person read it, the bank proposes it, a pod drafted it, or it is gone. */
export const SkillStatus = z.enum(["reviewed", "proposed", "draft", "retired"]);
export type SkillStatus = z.infer<typeof SkillStatus>;

/**
 * One "can do" line in one language: the child's "Umiem…" and the parent's sentence. Only a line
 * a person has read (`reviewed`) is ever shown.
 */
export const CanDoLine = z.object({
  child: z.string().min(1),
  parent: z.string().min(1),
  reviewed: z.boolean(),
});
export type CanDoLine = z.infer<typeof CanDoLine>;
/** A skill's can-do lines, by language; a language with none is absent. */
export const CanDo = z.partialRecord(Language, CanDoLine);
export type CanDo = z.infer<typeof CanDo>;

/**
 * A skill, keyed by its pod and code (RULES.md rule 8): no uuid, no prefix, since the code is the
 * `SkillId` lessons already carry. Jadwigo's pod's rows are the templates; a pod's own row is a
 * copy of one, or a draft, and wins for that pod. `aliases` are the other dialects' codes for it.
 */
export const Skill = z.object({
  pod_id: PodId,
  code: SkillId,
  topic_id: TopicId.nullable(),
  kind: SkillKind,
  status: SkillStatus,
  can_do: CanDo.nullable(),
  aliases: z.array(SkillId),
  prerequisites: z.array(SkillId),
  /** Where the row came from: `bank`, `lesson-import`, `parent`. */
  source: z.string().min(1),
  created_at: At,
});
export type Skill = z.infer<typeof Skill>;

/** One skill of a goal, a skill row of the goal's own pod. */
export const GoalSkill = z.object({
  pod_id: PodId,
  goal_id: GoalId,
  skill_code: SkillId,
});
export type GoalSkill = z.infer<typeof GoalSkill>;

/** One curriculum topic a goal covers; the topic is usually the shared pod's. */
export const GoalTopic = z.object({
  pod_id: PodId,
  goal_id: GoalId,
  topic_id: TopicId,
});
export type GoalTopic = z.infer<typeof GoalTopic>;

/** One goal a lesson serves. */
export const LessonGoal = z.object({
  pod_id: PodId,
  lesson_id: LessonId,
  goal_id: GoalId,
});
export type LessonGoal = z.infer<typeof LessonGoal>;

/** How far a learner is with a skill. Code computes it; the parent never sees Khan's level names. */
export const MasteryLevel = z.enum([
  "not_started",
  "attempted",
  "familiar",
  "proficient",
  "mastered",
]);
export type MasteryLevel = z.infer<typeof MasteryLevel>;

/** An FSRS card under py-fsrs's names, so the Python side reads the same JSON. */
export const FsrsCard = z.object({
  /** 1 learning, 2 review, 3 relearning. */
  state: z.int().min(1).max(3),
  step: z.int().min(0).nullable(),
  stability: z.number().nullable(),
  difficulty: z.number().nullable(),
  due: At,
  last_review: At.nullable(),
});
export type FsrsCard = z.infer<typeof FsrsCard>;

/**
 * One row of the mastery cache: a learner's level on one skill code, rebuilt whole by the fold
 * after each finished or claimed attempt (decision jadwigo-learner-knowledge 2026-10-30, mastery is
 * folded on read from the evidence view and also kept in a cache).
 */
export const LearnerSkillMastery = z.object({
  pod_id: PodId,
  learner_id: LearnerId,
  skill_code: SkillId,
  level: MasteryLevel,
  needs_attention: z.boolean(),
  tries: z.int().min(0),
  last_answered_at: At.nullable(),
  due_at: At.nullable(),
  card: FsrsCard.nullable(),
  computed_at: At,
});
export type LearnerSkillMastery = z.infer<typeof LearnerSkillMastery>;

/**
 * One row of the `learner_skill_evidence` view: an answer of a real attempt with a learner, a
 * skip or a judged try, once per skill code its question carries. `pod_id` is the attempt's pod,
 * which for a claimed featured attempt is Jadwigo's, not the learner's.
 */
export const LearnerSkillEvidence = z.object({
  pod_id: PodId,
  learner_id: LearnerId,
  attempt_id: AttemptId,
  seq: Count,
  try_no: Count,
  kind: AnswerKind,
  skill_code: SkillId,
  answered_at: At,
  correct: z.boolean().nullable(),
  help_used: z.int().min(0),
  latency_ms: z.int().min(0),
  mistake_class: z.string().nullable(),
  added: Added,
  lesson_kind: LessonKind,
  hold_verdicts: z.boolean(),
});
export type LearnerSkillEvidence = z.infer<typeof LearnerSkillEvidence>;

// The report's jsonb: code's digest, the AI's narrative, the parent's decisions. Here rather than
// in wire.ts because `learner_report` holds them, as `lesson_question` holds `Credit`.

/** The brief's lists: what to teach again, review, start, check again, and what school covers. */
export const BriefList = z.enum(["reteach", "review", "new", "recheck", "school"]);
export type BriefList = z.infer<typeof BriefList>;

/** One skill on one list of the brief, the goals it serves, and why code put it there. */
export const BriefEntry = z.object({
  skill_code: SkillId,
  list: BriefList,
  goal_ids: z.array(GoalId),
  why: z.enum([
    "needs_attention",
    "review_due",
    "prerequisites_met",
    "second_day_owed",
    "school_tag",
  ]),
});
export type BriefEntry = z.infer<typeof BriefEntry>;

/**
 * What the next lesson should hold, worked out by code from the goals, skills and mastery.
 * `school` says `nothing_recorded` until a parent tells what school covers: an empty section is
 * said, never guessed at.
 */
export const Brief = z.object({
  computed_at: At,
  entries: z.array(BriefEntry),
  school: z.literal("nothing_recorded").or(z.array(BriefEntry)),
});
export type Brief = z.infer<typeof Brief>;

/** What a sentence of the narrative rests on: an attempt, a skill code or a goal of the digest. */
export const Citation = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attempt"), attempt_id: AttemptId }),
  z.object({ kind: z.literal("skill"), skill_code: SkillId }),
  z.object({ kind: z.literal("goal"), goal_id: GoalId }),
]);
export type Citation = z.infer<typeof Citation>;

/** A proposal's id within its report: `p1` to `p9`. */
export const ProposalId = z.string().regex(/^p[1-9]$/, "a proposal id is p and one digit");
export type ProposalId = z.infer<typeof ProposalId>;

/** The 2 standing questions every report answers: where each skill stands, and what comes next. */
export const StandingQuestion = z.enum(["skills_standing", "next_focus"]);
export type StandingQuestion = z.infer<typeof StandingQuestion>;

/**
 * Where a goal stands, as the parent reads it: never a level name, never a number. Here beside
 * `Goal`, since both the digest and the wire's `GoalView` name it.
 */
export const GoalProgress = z.enum(["not_started", "needs_attention", "on_its_way", "good"]);
export type GoalProgress = z.infer<typeof GoalProgress>;

/**
 * Code's half of a report, deterministic from the evidence: counts, the skills that moved, what
 * needs attention, the mistakes, the brief, each goal's standing, a verdict on each standing
 * question, at most 3 focus proposals and at most 2 asks. Codes, counts and ids only: no name, no
 * `player_name`, no answer.
 */
export const ReportDigest = z.object({
  shape: z.literal("digest/1"),
  counts: z.object({
    attempts: z.int().min(0),
    questions: z.int().min(0),
    days_played: z.int().min(0),
  }),
  skills_moved: z.array(
    z.object({ skill_code: SkillId, from: MasteryLevel, to: MasteryLevel, attempt_id: AttemptId }),
  ),
  needs_attention: z.array(
    z.object({
      skill_code: SkillId,
      mistake_classes: z.array(z.string()),
      citations: z.array(Citation),
    }),
  ),
  mistakes: z.array(
    z.object({
      mistake_class: z.string(),
      times: z.int().min(1),
      skill_codes: z.array(SkillId),
      citations: z.array(Citation),
    }),
  ),
  brief: Brief,
  goals: z.array(z.object({ goal_id: GoalId, status: GoalProgress })),
  standing: z.array(
    z.object({
      question: StandingQuestion,
      verdict: z.enum(["on_track", "watch", "stuck", "nothing_recorded"]),
      citations: z.array(Citation),
    }),
  ),
  proposals: z
    .array(
      z.object({
        id: ProposalId,
        kind: z.literal("focus"),
        list: BriefList,
        skill_codes: z.array(SkillId).min(1),
        citations: z.array(Citation),
      }),
    )
    .max(3),
  asks: z
    .array(
      z.object({
        id: z.string(),
        about: z.enum(["goal_without_skills", "no_evidence_in_period", "school_context"]),
      }),
    )
    .max(2),
});
export type ReportDigest = z.infer<typeof ReportDigest>;

/**
 * The AI's half of a report (`/jadwigo-report-write`), written once: every sentence cites the
 * digest, gives no number the digest did not, and names no level.
 */
export const ReportNarrative = z.object({
  language: Language,
  headline: z.string().min(1).max(140),
  direction_now: z.string().min(1).max(500),
  answers: z.array(
    z.object({
      question: StandingQuestion,
      answer: z.string().min(1).max(600),
      citations: z.array(Citation).min(1),
    }),
  ),
  proposals: z
    .array(
      z.object({
        proposal_id: ProposalId,
        claim: z.string().max(200),
        rationale: z.string().max(400),
        citations: z.array(Citation).min(1),
      }),
    )
    .max(3),
  asks: z.array(z.object({ ask: z.string().max(200), why: z.string().max(300) })).max(2),
  /** The workflow and model that wrote it. */
  made_by: z.string().min(1),
});
export type ReportNarrative = z.infer<typeof ReportNarrative>;

/** A parent's decision on one proposal of a report. Proposals change nothing until one is accepted. */
export const ProposalDecision = z.object({
  proposal_id: ProposalId,
  decision: z.enum(["accepted", "dismissed"]),
  decided_at: At,
  decided_by: AccountId,
});
export type ProposalDecision = z.infer<typeof ProposalDecision>;

/**
 * A report on one learner over a period: code's `digest`, the AI's `narrative` (null until it is
 * written, then never changed) and the parent's `decisions` (appended). `reused` is a copy of the
 * last digest when the evidence has not changed (`inputs_hash`).
 */
export const LearnerReport = z.object({
  id: LearnerReportId,
  pod_id: PodId,
  learner_id: LearnerId,
  period_starts_at: At,
  period_ends_at: At,
  inputs_hash: z.string().min(1),
  reused: z.boolean(),
  digest: ReportDigest,
  narrative: ReportNarrative.nullable(),
  decisions: z.array(ProposalDecision),
  created_at: At,
});
export type LearnerReport = z.infer<typeof LearnerReport>;

/**
 * The records of pods, lessons, attempts and learner knowledge, by table name. `RECORDS`
 * (`tables.ts`) adds the engine's from `run.ts`, which imports from here.
 */
export const LESSON_RECORDS = {
  pod: Pod,
  learner: Learner,
  account: Account,
  member: Member,
  goal: Goal,
  lesson: Lesson,
  lesson_version: LessonVersion,
  lesson_version_question: LessonVersionQuestion,
  lesson_question: LessonQuestionFields.extend({
    family: Family,
    data: z.unknown(),
    key: z.unknown(),
  }),
  lesson_question_example: LessonQuestionExample,
  assignment: Assignment,
  attempt: Attempt,
  attempt_question: AttemptQuestion,
  attempt_answer: AttemptAnswer,
  attempt_result: AttemptResult,
  curriculum: Curriculum,
  topic: Topic,
  skill: Skill,
  goal_skill: GoalSkill,
  goal_topic: GoalTopic,
  lesson_goal: LessonGoal,
  learner_skill_mastery: LearnerSkillMastery,
  learner_skill_evidence: LearnerSkillEvidence,
  learner_report: LearnerReport,
} as const;
