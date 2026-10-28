import type { Assignment, LessonQuestion, LessonQuestionId, SkipReason } from "@jadwigo/contracts";
import type { AttemptRecord, LessonVersionWithQuestions, NewAttemptQuestion } from "@jadwigo/store";

/**
 * The lesson's course: what the server asks next (RULES.md rule 21). An attempt question is
 * written when it is asked, so the next one follows from the version's positions, the questions
 * already asked and the twins still owed (decision
 * 2026-10-27-an-attempt-question-is-written-when-it-is-asked-so-seq-is-the-pl):
 *
 * 1. a twin due now: after Not sure yet when the assignment's `after_not_sure` is `twin_now`, and
 *    after rung 4 of the help ladder whatever `after_not_sure` says, since rung 4 swaps the twin
 *    in at once (`after_not_sure` governs Not sure yet only, lead 2026-10-28);
 * 2. the next planned question not yet asked, by position;
 * 3. the review round: under `review_round`, the twin of each planned question ended with Not sure
 *    yet, in the order they were skipped;
 * 4. nothing: the attempt finishes.
 *
 * A twin is a spare whose `twin_of` is the question's lesson question. Each is asked at most once
 * per attempt, and a twin has no twin. An explain question is never asked in v0 (decision
 * 2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i).
 */
export function nextQuestion(
  assignment: Pick<Assignment, "after_not_sure">,
  version: LessonVersionWithQuestions,
  record: AttemptRecord,
  endedSeq: number,
): NewAttemptQuestion | null {
  const asked = new Set<string>(record.questions.map((q) => q.lesson_question_id));
  const askable = (q: LessonQuestion): boolean => !asked.has(q.id) && q.family !== "explain";
  const twinOf = (id: LessonQuestionId): LessonQuestion | undefined =>
    version.questions.find(
      (v) => v.role === "spare" && v.question.twin_of === id && askable(v.question),
    )?.question;
  const skippedFor = (seq: number): SkipReason | null =>
    record.answers.findLast((a) => a.seq === seq)?.skip_reason ?? null;

  const ended = record.questions.find((q) => q.seq === endedSeq);
  if (ended?.added === "planned") {
    const reason = skippedFor(endedSeq);
    const now =
      reason === "help_twin" ||
      (reason === "dont_know" && assignment.after_not_sure === "twin_now");
    const twin = now ? twinOf(ended.lesson_question_id) : undefined;
    if (twin)
      return { lesson_question_id: twin.id, added: "twin", placed: "now", added_for: endedSeq };
  }

  const planned = version.questions.find((v) => v.role === "planned" && askable(v.question));
  if (planned)
    return {
      lesson_question_id: planned.lesson_question_id,
      added: "planned",
      placed: null,
      added_for: null,
    };

  if (assignment.after_not_sure === "review_round") {
    for (const q of record.questions) {
      if (q.added !== "planned" || skippedFor(q.seq) !== "dont_know") continue;
      const twin = twinOf(q.lesson_question_id);
      if (twin)
        return {
          lesson_question_id: twin.id,
          added: "twin",
          placed: "review_round",
          added_for: q.seq,
        };
    }
  }
  return null;
}

/** The lesson question an attempt question asks, from the version the attempt started on. */
export function lessonQuestion(
  version: LessonVersionWithQuestions,
  id: LessonQuestionId,
): LessonQuestion {
  const found = version.questions.find((v) => v.lesson_question_id === id)?.question;
  if (found === undefined) throw new Error(`lesson question ${id} is not on its attempt's version`);
  return found;
}
