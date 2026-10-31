import {
  FEATURED_POD_ID,
  type Featured,
  type LessonId,
  type LessonVersionId,
} from "@jadwigo/contracts";
import type { LessonVersionWithQuestions, Store } from "@jadwigo/store";

/**
 * `GET /api/v1/featured-lessons`: the lessons anyone may play now, from the landing page. Only
 * the featured pod's (owner, 2026-10-28), read under its own scope, so no other pod's assignment
 * is ever listed. A start on one still goes through `authorize()`, which checks it again.
 */
export async function featuredLessons(store: Store): Promise<Featured> {
  const open = await store.listOpenAssignments(FEATURED_POD_ID);
  return {
    lessons: await Promise.all(
      open.map(async ({ assignment, lesson }) => {
        const planned = await plannedQuestions(store, assignment.lesson_version_id, lesson.id);
        return {
          assignment_id: assignment.id,
          lesson_id: lesson.id,
          title: lesson.title,
          language: lesson.language,
          subject: lesson.subject,
          grade: lesson.grade,
          question_count: planned.length,
          first_say: planned[0]?.question.say.trim() || null,
        };
      }),
    ),
  };
}

/** The planned questions, in order, of the version a start would play: the assignment's pinned
 * one, or the lesson's latest published. None when nothing is published yet. */
async function plannedQuestions(
  store: Store,
  pinned: LessonVersionId | null,
  lesson: LessonId,
): Promise<LessonVersionWithQuestions["questions"][number][]> {
  const id = pinned ?? (await store.getLatestLessonVersion(FEATURED_POD_ID, lesson))?.id;
  if (id === undefined) return [];
  const { questions } = await store.getLessonVersion(FEATURED_POD_ID, id);
  return questions.filter((q) => q.role === "planned").sort((a, b) => a.position - b.position);
}
