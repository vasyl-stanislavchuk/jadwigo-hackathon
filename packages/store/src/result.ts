import type {
  AttemptAnswer,
  AttemptQuestion,
  AttemptResult,
  LessonQuestion,
  LessonQuestionId,
} from "@jadwigo/contracts";

/** What a result row shows of the lesson question it asked. */
export type ResultQuestion = Pick<LessonQuestion, "say" | "family" | "question_type">;

/**
 * The `attempt_result` view (`supabase/migrations/20261027120000_core_v0.sql`) as a pure
 * function, so InMemoryStore reads the same rows Postgres does: one per attempt question, in
 * `seq` order. `tries` counts tries and not skips; `first_try_correct` is try 1 being a correct
 * try; `mistake_classes` are distinct, in the order of the try they first appear on;
 * `skip_reason` is the latest skip's; `time_ms` adds every row's latency, skips included.
 */
export function attemptResults(
  questions: readonly AttemptQuestion[],
  answers: readonly AttemptAnswer[],
  lessonQuestion: (id: LessonQuestionId) => ResultQuestion | undefined,
): AttemptResult[] {
  return [...questions]
    .sort((a, b) => a.seq - b.seq)
    .map((q) => {
      const lq = lessonQuestion(q.lesson_question_id);
      if (!lq) throw new Error(`attempt question ${q.seq} asks an unknown lesson question`);
      const rows = answers
        .filter((a) => a.attempt_id === q.attempt_id && a.seq === q.seq)
        .sort((a, b) => a.try_no - b.try_no);
      const mistakeClasses: string[] = [];
      for (const a of rows) {
        if (a.mistake_class !== null && !mistakeClasses.includes(a.mistake_class)) {
          mistakeClasses.push(a.mistake_class);
        }
      }
      const lastSkip = rows.filter((a) => a.kind === "skip").at(-1);
      return {
        pod_id: q.pod_id,
        attempt_id: q.attempt_id,
        seq: q.seq,
        lesson_question_id: q.lesson_question_id,
        added: q.added,
        placed: q.placed,
        added_for: q.added_for,
        say: lq.say,
        family: lq.family,
        question_type: lq.question_type,
        tries: rows.filter((a) => a.kind === "try").length,
        first_try_correct: rows.some(
          (a) => a.try_no === 1 && a.kind === "try" && a.correct === true,
        ),
        correct: q.ended === "correct",
        mistake_classes: mistakeClasses,
        help_used: Math.max(0, ...rows.map((a) => a.help_used)),
        skip_reason: lastSkip?.skip_reason ?? null,
        time_ms: rows.reduce((sum, a) => sum + a.latency_ms, 0),
        ended: q.ended,
      };
    });
}
