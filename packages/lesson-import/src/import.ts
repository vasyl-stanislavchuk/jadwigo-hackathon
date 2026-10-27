import type { Assignment, Lesson, LessonVersion } from "@jadwigo/contracts";
import type { NewLessonVersion, NewPod, Store } from "@jadwigo/store";
import { compileLessonFile } from "./compile.ts";
import { FEATURED_POD } from "./ids.ts";

export interface ImportResult {
  readonly lesson: Lesson;
  /** The latest published version: the one this import published, or the one already there. */
  readonly version: LessonVersion;
  /** False when the latest version already lists the same questions, so nothing new was published. */
  readonly published: boolean;
  readonly assignment: Assignment;
}

function sameList(
  a: NewLessonVersion["questions"],
  b: readonly { lesson_question_id: string; role: string }[],
): boolean {
  return (
    a.length === b.length &&
    a.every((q, i) => q.lesson_question_id === b[i]?.lesson_question_id && q.role === b[i]?.role)
  );
}

/**
 * Imports one exported lesson file into a pod (Jadwigo's own by default) through the Store: the
 * pod, the lesson, every lesson question, a new published version when the list differs from the
 * latest one, and the featured assignment (audience `anyone`, identity `none`), which serves the
 * latest version. Every write is idempotent by id, so a re-import with the same content writes
 * nothing new.
 */
export async function importLessonFile(
  store: Store,
  raw: unknown,
  pod: NewPod = FEATURED_POD,
): Promise<ImportResult> {
  const compiled = compileLessonFile(raw, pod.id);
  await store.putPod(pod);
  const lesson = await store.putLesson(pod.id, compiled.lesson);
  // Planned questions come first on the list, so a twin's question is stored before the twin.
  for (const { question } of compiled.questions) await store.putLessonQuestion(pod.id, question);

  const list = compiled.questions.map((q) => ({
    lesson_question_id: q.question.id,
    role: q.role,
  }));
  const latest = await store.getLatestLessonVersion(pod.id, lesson.id);
  const current =
    latest && sameList(list, (await store.getLessonVersion(pod.id, latest.id)).questions)
      ? latest
      : undefined;
  const version =
    current ??
    (await store.publishLessonVersion(pod.id, { lesson_id: lesson.id, questions: list }));

  const assignment = await store.putAssignment(pod.id, compiled.assignment);
  return { lesson, version, published: current === undefined, assignment };
}
