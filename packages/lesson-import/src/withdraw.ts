import { AssignmentId, ID_PREFIXES, type Lesson, LessonId } from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { FEATURED_POD } from "./ids.ts";

/**
 * Withdraws a featured lesson by archiving it (decision dl-w0b4.111). `GET
 * /api/v1/featured-lessons` lists only the featured pod's open assignments of a published lesson,
 * so the lesson leaves it at once. Its assignment stays open, so an old play link keeps playing, on
 * purpose. `restore` is the undo: the lesson is published again and back on the list.
 *
 * `target` is the lesson's id (`les_…`) or its featured assignment's (`asg_…`). Only the featured
 * pod's lessons are touched: an id from any other pod is refused. Safe to rerun.
 */
export async function withdrawLesson(
  store: Store,
  target: string,
  { restore = false }: { readonly restore?: boolean } = {},
): Promise<Lesson> {
  const pod = FEATURED_POD.id;
  const status = restore ? "published" : "archived";
  const asAssignment = AssignmentId.safeParse(target);
  if (asAssignment.success) {
    const assignment = asAssignment.data;
    if ((await store.findAssignmentPod(assignment)) !== pod) {
      throw new Error(`${target} is not an assignment of the featured pod; nothing changed`);
    }
    const { lesson_id } = await store.getAssignment(pod, assignment);
    return store.setLessonStatus(pod, lesson_id, status);
  }
  const asLesson = LessonId.safeParse(target);
  if (!asLesson.success) {
    throw new Error(
      `${target} is neither a lesson id (${ID_PREFIXES.lesson}…) nor an assignment id (${ID_PREFIXES.assignment}…); nothing changed`,
    );
  }
  const lesson = asLesson.data;
  if ((await store.getLesson(pod, lesson)) === undefined) {
    throw new Error(`${target} is not a lesson of the featured pod; nothing changed`);
  }
  return store.setLessonStatus(pod, lesson, status);
}
