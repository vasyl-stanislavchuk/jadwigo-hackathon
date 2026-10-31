import {
  type Assignment,
  EventId,
  type LearnerId,
  type Lesson,
  type LessonQuestionId,
  type LessonVersion,
  type PodId,
  SkillId,
} from "@jadwigo/contracts";
import type { AttemptRecord, NewAttemptAnswer, NewLessonQuestion, Store } from "@jadwigo/store";

/** One question of a finished attempt: the skill codes it carries and how the child answered it. */
export interface PlayedQuestion {
  /** Skill codes the lesson question carries in `skill_ids`, as written (aliases are not resolved). */
  readonly skills: readonly string[];
  /** Right on the first try, or a miss. */
  readonly correct: boolean;
  /** Rungs of help released before the first try, 0 to 3. The store copies it onto the answer. */
  readonly help_used?: number;
  /**
   * The first try's instant, with a zone (`2026-09-01T08:00:00.000Z`). Choose instants whose
   * Europe/Warsaw days differ to make 2 days; the try is asked 5 seconds before it.
   */
  readonly answered_at: string;
}

export interface FinishedAttemptInput {
  readonly store: Store;
  readonly pod: PodId;
  /** The learner who plays it, through a `pick` assignment; absent, it is played anonymously (`none`). */
  readonly learner?: LearnerId;
  readonly questions: readonly PlayedQuestion[];
  /** The lesson's kind; `practice` unless given. A `review` lesson makes its evidence mixed. */
  readonly kind?: Lesson["kind"];
  /** Whether the assignment holds verdicts: then a miss ends `missed` after its one try. */
  readonly hold_verdicts?: boolean;
  readonly title?: string;
}

export interface FinishedAttempt {
  readonly lesson: Lesson;
  readonly version: LessonVersion;
  readonly assignment: Assignment;
  /** The lesson questions, in the order given. */
  readonly questions: readonly LessonQuestionId[];
  /** The attempt as stored after `finishAttempt`. */
  readonly record: AttemptRecord;
}

const RIGHT = "6";
const WRONG = "7";
const ASKED_BEFORE_MS = 5_000;

/**
 * A finished, real attempt played through the Store as the API plays one: it publishes a lesson
 * whose questions carry the skill codes given, assigns it, starts the attempt (for `learner` when
 * given), and for each question asks it, releases its help, answers its first try at the
 * `answered_at` given, and ends it; then finishes the attempt. Every write is a fresh record under
 * fresh ids, so tests may call it many times on one store, in memory or on Postgres.
 *
 * A miss is a wrong first try, then, unless verdicts are held, a `dont_know` skip a second later
 * that ends the question `skipped`; the first try is the one the fold reads. Made-up content only.
 */
export async function finishedAttempt(input: FinishedAttemptInput): Promise<FinishedAttempt> {
  const { store, pod } = input;
  const hold = input.hold_verdicts ?? false;
  const lesson = await store.putLesson(pod, {
    title: input.title ?? "Rows of apples",
    language: "pl",
    category: "child",
    subject: "math",
    grade: 2,
    kind: input.kind ?? "practice",
    skill_ids: [],
  });
  const questions: LessonQuestionId[] = [];
  for (const [n, played] of input.questions.entries()) {
    questions.push((await store.putLessonQuestion(pod, question(n, played))).id);
  }
  const version = await store.publishLessonVersion(pod, {
    lesson_id: lesson.id,
    questions: questions.map((id) => ({ lesson_question_id: id, role: "planned" as const })),
  });
  const assignment = await store.putAssignment(pod, {
    audience: "anyone",
    identity: input.learner === undefined ? "none" : "pick",
    lesson_id: lesson.id,
    hold_verdicts: hold,
  });
  const started = await store.startAttempt(pod, {
    assignment_id: assignment.id,
    ...(input.learner === undefined ? {} : { learner_id: input.learner }),
  });
  const attempt = started.attempt.id;

  for (const [n, played] of input.questions.entries()) {
    const seq = n + 1;
    const id = questions[n];
    if (id === undefined) throw new Error(`no lesson question for seq ${seq}`);
    if (seq > 1) {
      await store.askQuestion(pod, attempt, {
        lesson_question_id: id,
        added: "planned",
        placed: null,
        added_for: null,
      });
    }
    const help = played.help_used ?? 0;
    if (!Number.isInteger(help) || help < 0 || help > 3) {
      throw new Error(`help_used is 0 to 3 here, got ${help}`);
    }
    for (let seen = 0; seen < help; seen++) {
      await store.releaseHelp(pod, attempt, seq, seen);
    }
    const first = tryOf(attempt, seq, played);
    if (played.correct) {
      await store.appendAttemptAnswer(pod, first, { end: "correct" });
    } else if (hold) {
      await store.appendAttemptAnswer(pod, first, { end: "missed" });
    } else {
      await store.appendAttemptAnswer(pod, first);
      await store.appendAttemptAnswer(pod, giveUp(first), { end: "skipped" });
    }
  }
  await store.finishAttempt(pod, attempt);
  return {
    lesson,
    version,
    assignment,
    questions,
    record: await store.getAttempt(pod, attempt),
  };
}

function question(n: number, played: PlayedQuestion): NewLessonQuestion {
  return {
    family: "enter",
    question_type: "production",
    say: `How many apples in row ${n + 1}?`,
    data: { input: "number", entry: "keypad" },
    key: { accept: [RIGHT] },
    help: { look: { text: "Count the apples one by one." } },
    subject: "math",
    grade: 2,
    skill_ids: played.skills.map((code) => SkillId.parse(code)),
    credit: null,
    based_on: null,
    twin_of: null,
    content_hash: `finished-attempt-${crypto.randomUUID()}`,
  };
}

function tryOf(
  attempt: AttemptRecord["attempt"]["id"],
  seq: number,
  played: PlayedQuestion,
): NewAttemptAnswer {
  const answered = Date.parse(played.answered_at);
  if (Number.isNaN(answered))
    throw new Error(`answered_at is not an instant: ${played.answered_at}`);
  return {
    event_id: EventId.parse(crypto.randomUUID()),
    attempt_id: attempt,
    seq,
    try_no: 1,
    kind: "try",
    value: { entered: played.correct ? RIGHT : WRONG },
    skip_reason: null,
    latency_ms: ASKED_BEFORE_MS,
    asked_at: new Date(answered - ASKED_BEFORE_MS).toISOString(),
    answered_at: new Date(answered).toISOString(),
    correct: played.correct,
    mistake_class: null,
    parts: null,
    judged_by: "enter@1",
    body_hash: `finished-attempt-${crypto.randomUUID()}`,
  };
}

/** The skip that ends a missed question when verdicts are not held, a second after the miss. */
function giveUp(miss: NewAttemptAnswer): NewAttemptAnswer {
  const at = Date.parse(miss.answered_at);
  return {
    ...miss,
    event_id: EventId.parse(crypto.randomUUID()),
    try_no: 2,
    kind: "skip",
    value: null,
    skip_reason: "dont_know",
    latency_ms: 1_000,
    asked_at: new Date(at).toISOString(),
    answered_at: new Date(at + 1_000).toISOString(),
    correct: null,
    judged_by: null,
    body_hash: `finished-attempt-${crypto.randomUUID()}`,
  };
}
